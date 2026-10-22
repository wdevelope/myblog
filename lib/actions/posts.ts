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

  // 수정으로 slug·카테고리가 바뀌면 이전 값의 공개 캐시도 무효화해야 한다.
  const { data: previous } = input.id
    ? await service.from("posts").select("slug,category_slug").eq("id", input.id).maybeSingle()
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
    .select("type,category_slug")
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

  return { success: true };
}
