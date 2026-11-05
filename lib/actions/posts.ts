"use server";

import { draftMode } from "next/headers";
import { z } from "zod";
import type { PostType } from "@/lib/types";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { assertAdmin } from "@/lib/server/admin";
import { ensureCategory } from "@/lib/server/categories";
import { dbFailure } from "@/lib/server/dbFailure";
import { revalidatePublicPosts } from "@/lib/server/publicPosts";
import { toAutoTitle } from "@/lib/markdown";
import {
  PRIVATE_IMAGE_BUCKET,
  PUBLIC_IMAGE_BUCKET,
  imageBucketFor,
  imageKeysOf,
  imageKeysUnusedBy,
  imagePathsInBucket,
  replaceImageBucket,
} from "@/lib/image";

// 새 글 slug는 임의 값이라 거의 겹치지 않는다. 겹치면 unique 제약이 막으므로 미리 조회하지 않고 막혔을 때 다시 만든다.
const SLUG_RETRIES = 5;
const UNIQUE_VIOLATION = "23505";

function randomSlug(base: string) {
  return `${base}-${Math.random().toString(16).slice(2, 8)}`;
}

const savePostSchema = z
  .object({
    id: z.string().min(1).optional(),
    slug: z.string().optional(),
    type: z.enum(["blog", "feed", "diary"], { error: "type must be one of: blog, feed, diary" }),
    visibility: z.enum(["public", "private"]).optional(),
    title: z.string().optional(),
    content: z
      .string({ error: "내용을 입력해주세요." })
      .refine((content) => content.trim(), "내용을 입력해주세요."),
    categorySlug: z.string().nullish(),
    imageKeys: z.array(z.string()).optional(),
    thumbnailImageKey: z.string().nullish(),
    createdAtYmd: z.iso.date({ error: "createdAtYmd 형식이 올바르지 않아요. (YYYY-MM-DD)" }).optional(),
  })
  .transform((input, ctx) => {
    const reject = (message: string) => {
      ctx.addIssue({ code: "custom", message });
      return z.NEVER;
    };

    // 피드는 항상 공개다. 타입마다 쓰지 않는 값은 여기서 버려 뒤에서는 타입을 다시 보지 않는다.
    const visibility = input.type === "feed" ? "public" : input.visibility;
    if (!visibility) return reject("visibility must be public|private");

    const categorySlug = input.type === "blog" ? input.categorySlug?.trim() || null : null;
    if (input.type === "blog" && !categorySlug) return reject("아티클은 카테고리가 필요해요.");

    const title =
      input.type === "feed" ? input.title?.trim() || toAutoTitle(input.content) : input.title?.trim();
    if (!title) return reject("제목을 입력해주세요.");

    if (input.createdAtYmd) {
      if (input.type !== "diary") return reject("createdAtYmd는 다이어리에만 사용할 수 있어요.");
      if (input.id) return reject("createdAtYmd는 신규 다이어리 작성에서만 사용할 수 있어요.");
    }

    return {
      id: input.id,
      baseSlug: (input.id ? input.slug?.trim() : null) || "post",
      type: input.type,
      visibility,
      title,
      content: input.content,
      categorySlug,
      imageKeys: input.imageKeys ?? [],
      thumbnailImageKey: input.type === "blog" ? input.thumbnailImageKey?.trim() || null : null,
      createdAt: input.createdAtYmd
        ? new Date(`${input.createdAtYmd}T12:00:00+09:00`).toISOString()
        : null,
    };
  });

export type SavePostInput = z.input<typeof savePostSchema>;

export type SavePostResult =
  | { success: true; data: { slug: string; type: PostType } }
  | { success: false; error: string };

// 새 글과 수정을 한 upsert로 저장한다. id가 있으면 그 글을 고친다.
export async function savePost(rawInput: SavePostInput): Promise<SavePostResult> {
  const user = await assertAdmin();
  if (!user) return { success: false, error: "unauthorized" };

  const parsed = savePostSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "입력을 확인해주세요." };
  }
  const input = parsed.data;
  const service = createSupabaseServiceClient();

  // 저장 앞의 조회는 서로의 결과가 필요 없다. 차례로 기다리면 저장마다 DB 왕복이 하나 더 붙는다.
  // 수정으로 slug·카테고리가 바뀌면 이전 값의 공개 캐시도 무효화해야 하고, 새 버전에서 뺀 이미지는 저장 뒤에 지운다.
  const [previousLookup, categoryLookup] = await Promise.all([
    input.id
      ? service
          .from("posts")
          .select("slug,category_slug,content,image_keys,thumbnail_image_key")
          .eq("id", input.id)
          .maybeSingle()
      : { data: null, error: null },
    input.categorySlug
      ? service.from("categories").select("slug").eq("slug", input.categorySlug).maybeSingle()
      : { data: null, error: null },
  ]);

  // 이전 글을 모른 채 저장하면 작성자를 덮어쓰고 옛 캐시·이미지를 남긴다.
  if (previousLookup.error) return dbFailure("글 저장 전 이전 글 조회", previousLookup.error);
  if (categoryLookup.error) return dbFailure("글 저장 전 카테고리 조회", categoryLookup.error);
  const previous = previousLookup.data;

  if (input.categorySlug && !categoryLookup.data) {
    const ensured = await ensureCategory(service, input.categorySlug);
    if (!ensured.success) return ensured;
  }

  // 이미지 버킷은 올리는 순간 에디터의 공개 범위로 정해진다. 저장하기 전에 글 공개 범위와 다른 버킷의 파일을 옮겨,
  // 비공개 글 이미지가 공개 주소로 열리거나 공개 글 이미지가 방문자에게 깨지지 않게 한다(로드맵 19절).
  // 옮긴 뒤 저장해야 공개 → 비공개에서 뒤의 단계가 실패해도 공개 주소가 이미 닫혀 있다.
  const targetBucket = imageBucketFor(input.visibility);
  const otherBucket = targetBucket === PUBLIC_IMAGE_BUCKET ? PRIVATE_IMAGE_BUCKET : PUBLIC_IMAGE_BUCKET;
  const images = {
    content: input.content,
    imageKeys: input.imageKeys,
    thumbnailImageKey: input.thumbnailImageKey,
  };
  const misplaced = imagePathsInBucket(images, otherBucket);
  const failedMoves = await moveImages(service, otherBucket, targetBucket, misplaced);
  if (failedMoves.length) {
    const stuck = await moveImages(
      service,
      targetBucket,
      otherBucket,
      misplaced.filter((path) => !failedMoves.includes(path))
    );
    return {
      success: false,
      error: `이미지를 옮기지 못해 저장하지 않았어요: ${imageKeyList(otherBucket, failedMoves)}${stuckNotice(targetBucket, stuck)}`,
    };
  }
  const placed = replaceImageBucket(images, otherBucket, targetBucket, misplaced);

  const upsertPost = (slug: string) =>
    service
      .from("posts")
      .upsert(
        {
          id: input.id,
          slug,
          type: input.type,
          visibility: input.visibility,
          title: input.title,
          content: placed.content,
          category_slug: input.categorySlug,
          image_keys: placed.imageKeys,
          thumbnail_image_key: placed.thumbnailImageKey,
          // 고칠 때는 처음 쓴 사람을 그대로 둔다.
          ...(previous ? null : { author_id: user.id }),
          ...(input.createdAt ? { created_at: input.createdAt } : null),
        },
        { onConflict: "id" }
      )
      .select("slug,type,category_slug")
      .single();

  let result = await upsertPost(input.id ? input.baseSlug : randomSlug(input.baseSlug));
  for (let i = 0; i < SLUG_RETRIES && result.error?.code === UNIQUE_VIOLATION; i++) {
    result = await upsertPost(randomSlug(input.baseSlug));
  }
  const { data: saved, error } = result;

  if (error) {
    // 저장하지 못했으므로 파일을 원래 버킷으로 돌려 이전 글의 키와 맞춘다.
    const stuck = await moveImages(service, targetBucket, otherBucket, misplaced);
    return dbFailure("글 저장", error, stuckNotice(targetBucket, stuck));
  }

  revalidatePublicPosts({
    type: saved.type,
    slugs: [previous?.slug, saved.slug],
    categories: [previous?.category_slug, saved.category_slug],
  });

  if (previous) {
    // 위에서 옮긴 파일은 이전 버전의 키가 옛 버킷을 가리킨다. 지금 위치로 바꿔 비교해야 버킷만 옮긴 파일을 지우지 않는다.
    const previousPlaced = replaceImageBucket(postImages(previous), otherBucket, targetBucket, misplaced);
    await removeUnusedImages(service, imageKeysUnusedBy(imageKeysOf(previousPlaced), [placed]));
  }

  // 관리자 화면이 꺼진 채 비공개 글을 저장하면 상세가 404(다이어리는 안내 화면)라 켜서 돌려준다.
  // 저장 응답의 쿠키로 켜면 브라우저가 상세를 받기 전에 왕복을 한 번 더 기다리지 않는다.
  (await draftMode()).enable();

  return { success: true, data: { slug: saved.slug, type: saved.type } };
}

// 같은 경로로 버킷만 옮기고, 옮기지 못한 경로를 돌려준다.
async function moveImages(
  service: ReturnType<typeof createSupabaseServiceClient>,
  from: string,
  to: string,
  paths: string[]
) {
  const failed: string[] = [];
  for (const path of paths) {
    const { error } = await service.storage.from(from).move(path, path, { destinationBucket: to });
    if (error) failed.push(path);
  }
  return failed;
}

function imageKeyList(bucket: string, paths: string[]) {
  return paths.map((path) => `${bucket}:${path}`).join(", ");
}

// 되돌리지 못한 파일은 글의 키와 실제 위치가 어긋나 있으니 관리자가 찾을 수 있게 지금 위치를 남긴다.
function stuckNotice(currentBucket: string, stuckPaths: string[]) {
  return stuckPaths.length
    ? ` 원래 버킷으로 되돌리지 못한 이미지: ${imageKeyList(currentBucket, stuckPaths)}`
    : "";
}

function postImages(row: { content: string | null; image_keys: string[] | null; thumbnail_image_key: string | null }) {
  return { content: row.content ?? "", imageKeys: row.image_keys ?? [], thumbnailImageKey: row.thumbnail_image_key };
}

// 아래 배열 조건(`{a,b}`)은 supabase-js가 따옴표로 감싸지 않는다. 업로드가 만드는 글자가 아닌 키는 조건을 깨
// 다른 글이 쓰는지 확인할 수 없으므로 지우지 않는다. `_`는 LIKE에서 아무 글자이지만 넓게 걸러질 뿐이다.
const REMOVABLE_IMAGE_KEY = /^[\w./:-]+$/;

// 글이 더 이상 쓰지 않게 된 이미지 파일을 지운다. 다른 글이 같은 파일을 쓰면 남긴다.
// 글 저장·삭제는 이미 끝났으므로 실패해도 결과를 바꾸지 않고 서버 로그에만 남긴다(파일이 남을 뿐이다).
async function removeUnusedImages(service: ReturnType<typeof createSupabaseServiceClient>, keys: string[]) {
  const candidates = keys.filter((key) => REMOVABLE_IMAGE_KEY.test(key));
  if (!candidates.length) return;
  try {
    // 본문은 글자 포함으로 넓게 거르고, 정확한 비교는 돌아온 글로 imageKeysUnusedBy가 한다.
    const columns = "content,image_keys,thumbnail_image_key";
    const lookups = await Promise.all([
      service.from("posts").select(columns).likeAnyOf("content", candidates.map((key) => `%${key}%`)),
      service.from("posts").select(columns).overlaps("image_keys", candidates),
      service.from("posts").select(columns).in("thumbnail_image_key", candidates),
    ]);
    const lookupError = lookups.find((lookup) => lookup.error)?.error;
    if (lookupError) {
      console.error("이미지 정리: 다른 글이 쓰는지 확인하지 못해 지우지 않았어요.", lookupError.message, candidates);
      return;
    }
    const unused = imageKeysUnusedBy(candidates, lookups.flatMap((lookup) => (lookup.data ?? []).map(postImages)));
    for (const bucket of [PUBLIC_IMAGE_BUCKET, PRIVATE_IMAGE_BUCKET]) {
      const prefix = `${bucket}:`;
      const paths = unused.filter((key) => key.startsWith(prefix)).map((key) => key.slice(prefix.length));
      if (!paths.length) continue;
      const { error } = await service.storage.from(bucket).remove(paths);
      if (error) console.error("이미지 정리: 파일을 지우지 못했어요.", error.message, paths.map((path) => prefix + path));
    }
  } catch (error) {
    console.error("이미지 정리: 예상하지 못한 오류로 멈췄어요.", error, candidates);
  }
}

export type DeletePostResult =
  | { success: true }
  | { success: false; error: string };

export async function deletePost(rawSlug: unknown): Promise<DeletePostResult> {
  if (!(await assertAdmin())) return { success: false, error: "unauthorized" };

  const parsed = z.string().min(1).safeParse(rawSlug);
  if (!parsed.success) return { success: false, error: "not_found" };
  const slug = parsed.data;

  const service = createSupabaseServiceClient();
  const { data: deleted, error } = await service
    .from("posts")
    .delete()
    .eq("slug", slug)
    .select("type,category_slug,content,image_keys,thumbnail_image_key")
    .maybeSingle();

  if (error) return dbFailure("글 삭제", error);
  if (!deleted) {
    return { success: false, error: "not_found" };
  }

  revalidatePublicPosts({
    type: deleted.type,
    slugs: [slug],
    categories: [deleted.category_slug],
  });

  // 비공개 글을 지워도 그 이미지가 공개 버킷에 남아 주소로 열리는 일이 없게, 행을 지운 뒤 파일도 지운다.
  await removeUnusedImages(service, imageKeysOf(postImages(deleted)));

  return { success: true };
}
