"use server";

import type { PostType, Visibility } from "@/lib/types";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { assertAdmin } from "@/lib/server/admin";
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

export type CreatePostInput = {
  id?: string;
  slug?: string;
  type: PostType;
  visibility?: Visibility;
  title?: string;
  content: string;
  categorySlug?: string | null;
  imageKeys?: string[];
  thumbnailImageKey?: string | null;
  createdAtYmd?: string;
};

export type CreatePostResult =
  | {
      success: true;
      data: {
        id: string;
        slug: string;
        type: PostType;
        visibility: Visibility;
        title: string;
        content: string;
        categorySlug: string | null;
        createdAt: string;
        updatedAt: string;
        imageKeys: string[];
        thumbnailImageKey: string | null;
      };
    }
  | { success: false; error: string };

export async function createPost(
  input: CreatePostInput
): Promise<CreatePostResult> {
  const user = await assertAdmin();
  if (!user) return { success: false, error: "unauthorized" };

  if (!input.type || !["blog", "feed", "diary"].includes(input.type)) {
    return { success: false, error: "type must be one of: blog, feed, diary" };
  }
  if (input.type !== "feed") {
    if (
      !input.visibility ||
      !["public", "private"].includes(input.visibility)
    ) {
      return { success: false, error: "visibility must be public|private" };
    }
  }
  if (!input.content?.trim()) {
    return { success: false, error: "내용을 입력해주세요." };
  }
  if (input.type === "blog" && !input.categorySlug?.trim()) {
    return { success: false, error: "아티클은 카테고리가 필요해요." };
  }

  const finalVisibility: Visibility =
    input.type === "feed" ? "public" : input.visibility!;

  const finalTitle =
    input.type === "feed"
      ? input.title?.trim() || toAutoTitle(input.content)
      : input.title?.trim() ?? "";
  if (!finalTitle) {
    return { success: false, error: "제목을 입력해주세요." };
  }

  const createdAtYmd = input.createdAtYmd?.trim();
  let createdAtIso: string | null = null;
  if (createdAtYmd) {
    if (input.type !== "diary") {
      return {
        success: false,
        error: "createdAtYmd는 다이어리에만 사용할 수 있어요.",
      };
    }
    if (input.id) {
      return {
        success: false,
        error: "createdAtYmd는 신규 다이어리 작성에서만 사용할 수 있어요.",
      };
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(createdAtYmd)) {
      return {
        success: false,
        error: "createdAtYmd 형식이 올바르지 않아요. (YYYY-MM-DD)",
      };
    }
    const createdAt = new Date(`${createdAtYmd}T12:00:00+09:00`);
    if (Number.isNaN(createdAt.getTime())) {
      return { success: false, error: "createdAtYmd 날짜가 올바르지 않아요." };
    }
    createdAtIso = createdAt.toISOString();
  }

  const isNew = !input.id;
  const baseSlug = (input.id ? input.slug?.trim() : null) || "post";
  const service = createSupabaseServiceClient();

  // 수정으로 slug·카테고리가 바뀌면 이전 값의 공개 캐시도 무효화해야 하고, 새 버전에서 뺀 이미지는 저장 뒤에 지운다.
  const { data: previous } = input.id
    ? await service
        .from("posts")
        .select("slug,category_slug,content,image_keys,thumbnail_image_key")
        .eq("id", input.id)
        .maybeSingle()
    : { data: null };
  const categorySlug =
    input.type === "blog" ? input.categorySlug?.trim() ?? null : null;

  // 카테고리 자동 생성
  if (input.type === "blog" && categorySlug) {
    const { data: existingCategory, error: categoryLookupError } = await service
      .from("categories")
      .select("slug")
      .eq("slug", categorySlug)
      .maybeSingle();

    if (categoryLookupError) {
      return {
        success: false,
        error: `DB Error: ${categoryLookupError.message}`,
      };
    }

    if (!existingCategory) {
      const { data: maxRow, error: maxError } = await service
        .from("categories")
        .select("sort_order")
        .order("sort_order", { ascending: false })
        .order("slug", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (maxError) {
        return { success: false, error: `DB Error: ${maxError.message}` };
      }

      const nextSortOrder = Math.max(0, Number(maxRow?.sort_order ?? 0)) + 1;
      const { error: insertError } = await service.from("categories").insert({
        slug: categorySlug,
        visibility: "public",
        sort_order: nextSortOrder,
      });

      if (insertError) {
        const isConflict =
          typeof insertError.code === "string" && insertError.code === "23505";
        if (!isConflict) {
          return { success: false, error: `DB Error: ${insertError.message}` };
        }
      }
    }
  }

  // 슬러그 유니크 보장
  let slug = baseSlug;
  if (isNew) {
    slug = `${baseSlug}-${Math.random().toString(16).slice(2, 8)}`;
  }

  for (let i = 0; i < 5; i++) {
    const { data: existing } = await service
      .from("posts")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!existing || (input.id && existing.id === input.id)) break;
    slug = `${baseSlug}-${Math.random().toString(16).slice(2, 8)}`;
  }

  // 이미지 버킷은 올리는 순간 에디터의 공개 범위로 정해진다. 저장하기 전에 글 공개 범위와 다른 버킷의 파일을 옮겨,
  // 비공개 글 이미지가 공개 주소로 열리거나 공개 글 이미지가 방문자에게 깨지지 않게 한다(로드맵 19절).
  // 옮긴 뒤 저장해야 공개 → 비공개에서 뒤의 단계가 실패해도 공개 주소가 이미 닫혀 있다.
  const targetBucket = imageBucketFor(finalVisibility);
  const otherBucket = targetBucket === PUBLIC_IMAGE_BUCKET ? PRIVATE_IMAGE_BUCKET : PUBLIC_IMAGE_BUCKET;
  const images = {
    content: input.content,
    imageKeys: input.imageKeys ?? [],
    thumbnailImageKey:
      input.type === "blog" && input.thumbnailImageKey?.trim()
        ? input.thumbnailImageKey.trim()
        : null,
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

  const payload = {
    id: input.id,
    slug,
    type: input.type,
    visibility: finalVisibility,
    title: finalTitle,
    content: placed.content,
    category_slug: categorySlug,
    image_keys: placed.imageKeys,
    thumbnail_image_key: placed.thumbnailImageKey,
    author_id: user.id,
    ...(createdAtIso ? { created_at: createdAtIso } : null),
  };

  const { data: saved, error } = await service
    .from("posts")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    // 저장하지 못했으므로 파일을 원래 버킷으로 돌려 이전 글의 키와 맞춘다.
    const stuck = await moveImages(service, targetBucket, otherBucket, misplaced);
    return { success: false, error: `DB Error: ${error.message}${stuckNotice(targetBucket, stuck)}` };
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

  return {
    success: true,
    data: {
      id: saved.id,
      slug: saved.slug,
      type: saved.type,
      visibility: saved.visibility,
      title: saved.title,
      content: saved.content,
      categorySlug: saved.category_slug,
      createdAt: saved.created_at,
      updatedAt: saved.updated_at ?? saved.created_at,
      imageKeys: saved.image_keys ?? [],
      thumbnailImageKey: saved.thumbnail_image_key,
    },
  };
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

export async function deletePost(slug: string): Promise<DeletePostResult> {
  if (!(await assertAdmin())) return { success: false, error: "unauthorized" };

  const service = createSupabaseServiceClient();
  const { data: deleted, error } = await service
    .from("posts")
    .delete()
    .eq("slug", slug)
    .select("type,category_slug,content,image_keys,thumbnail_image_key")
    .maybeSingle();

  if (error) {
    return { success: false, error: `DB Error: ${error.message}` };
  }
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
