"use server";

import { after } from "next/server";
import { z } from "zod";
import { COMMENT_CONTENT_MAX, LOGIN_REQUIRED } from "@/lib/constants";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/server/admin";
import { COMMENT_COLUMNS, mapComment } from "@/lib/server/commentRow";
import { dbFailure } from "@/lib/server/dbFailure";
import { notifyNewComment } from "@/lib/server/notify";
import { revalidatePublicPosts } from "@/lib/server/publicPosts";
import type { Comment } from "@/lib/types";

const POST_NOT_FOUND = "글을 찾지 못했어요.";
const COMMENT_NOT_FOUND = "댓글을 찾지 못했어요.";
const PARENT_NOT_FOUND = "답글을 달 댓글을 찾지 못했어요.";

const createCommentSchema = z.object({
  postSlug: z.string({ error: POST_NOT_FOUND }).trim().min(1, POST_NOT_FOUND),
  content: z
    .string({ error: "내용을 입력해주세요." })
    .trim()
    .min(1, "내용을 입력해주세요.")
    .max(COMMENT_CONTENT_MAX, `댓글은 ${COMMENT_CONTENT_MAX}자까지 쓸 수 있어요.`),
  parentId: z.string().trim().optional(),
});

export type CreateCommentInput = z.input<typeof createCommentSchema>;

export type CreateCommentResult =
  | { success: true; comment: Comment }
  | { success: false; error: string };

export async function createComment(
  rawInput: CreateCommentInput
): Promise<CreateCommentResult> {
  const supabase = await createSupabaseServerClient();
  const { user, isAdmin } = await getViewer();
  if (!user) {
    return { success: false, error: LOGIN_REQUIRED };
  }

  const parsed = createCommentSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "입력을 확인해주세요." };
  }
  const input = parsed.data;

  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id,type,visibility,slug,title")
    .eq("slug", input.postSlug)
    .maybeSingle();

  if (postError) return dbFailure("댓글 대상 글 조회", postError);
  if (!post) {
    return { success: false, error: POST_NOT_FOUND };
  }
  if (post.type === "diary") {
    return { success: false, error: "다이어리에는 댓글을 쓸 수 없어요." };
  }

  // 없는 글과 같은 문구라야 비공개 글이 있는지 드러나지 않는다.
  if (post.visibility === "private" && !isAdmin) {
    return { success: false, error: POST_NOT_FOUND };
  }

  const parentId = input.parentId || null;
  if (parentId) {
    const { data: parent, error: parentError } = await supabase
      .from("comments")
      .select("id,post_id,parent_id")
      .eq("id", parentId)
      .maybeSingle();

    if (parentError) return dbFailure("답글 대상 댓글 조회", parentError);
    if (!parent) {
      return { success: false, error: PARENT_NOT_FOUND };
    }
    if (parent.post_id !== post.id) {
      return { success: false, error: PARENT_NOT_FOUND };
    }
    if (parent.parent_id) {
      return { success: false, error: "답글에는 답글을 달 수 없어요." };
    }
  }

  const { data: created, error } = await supabase
    .from("comments")
    .insert({
      post_id: post.id,
      author_id: user.id,
      content: input.content,
      parent_id: parentId,
    })
    .select(COMMENT_COLUMNS)
    .single();

  if (error) return dbFailure("댓글 저장", error);

  // 댓글은 정적 HTML에 들어 있으므로 그 글의 상세와 목록(댓글 수)을 다시 만든다.
  revalidatePublicPosts({ type: post.type, slugs: [post.slug] });

  // 메일을 받는 사람이 관리자라 관리자 댓글은 알리지 않는다. 응답을 늦추지 않게 응답을 보낸 뒤 보낸다.
  if (!isAdmin) {
    after(() =>
      notifyNewComment({
        post: { type: post.type, slug: post.slug, title: post.title },
        authorId: user.id,
        content: created.content,
        createdAt: created.created_at,
        isReply: parentId !== null,
      })
    );
  }

  return { success: true, comment: mapComment(created) };
}

export type DeleteCommentResult =
  | { success: true }
  | { success: false; error: string };

export async function deleteComment(
  rawCommentId: unknown
): Promise<DeleteCommentResult> {
  const parsed = z.string().min(1).safeParse(rawCommentId);
  if (!parsed.success) {
    return { success: false, error: COMMENT_NOT_FOUND };
  }
  const commentId = parsed.data;

  const supabase = await createSupabaseServerClient();
  const { user, isAdmin } = await getViewer();
  if (!user) {
    return { success: false, error: LOGIN_REQUIRED };
  }

  // 1. 댓글 정보 조회 (권한 확인용)
  const { data: comment, error: fetchError } = await supabase
    .from("comments")
    .select("author_id, post_id, posts(slug,type)")
    .eq("id", commentId)
    .maybeSingle();

  if (fetchError) return dbFailure("삭제할 댓글 조회", fetchError);
  if (!comment) {
    return { success: false, error: COMMENT_NOT_FOUND };
  }

  // 2. 권한 검사: 작성자 본인이거나 관리자여야 함
  if (comment.author_id !== user.id && !isAdmin) {
    return { success: false, error: "본인 댓글만 지울 수 있어요." };
  }

  // 3. 삭제 수행 (대댓글은 DB 레벨에서 cascade delete됨)
  const { error: deleteError } = await supabase
    .from("comments")
    .delete()
    .eq("id", commentId);

  if (deleteError) return dbFailure("댓글 삭제", deleteError);

  // 생성 타입은 외래 키만 보고 null이 없다고 하지만, RLS가 글을 가리면 임베드는 null로 온다.
  const post = comment.posts as typeof comment.posts | null;
  if (post) {
    revalidatePublicPosts({ type: post.type, slugs: [post.slug] });
  }

  return { success: true };
}
