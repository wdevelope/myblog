"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/server/admin";
import { revalidatePublicPosts } from "@/lib/server/publicPosts";
import type { Comment } from "@/lib/types";

export type GetCommentsResult =
  | { success: true; comments: Comment[] }
  | { success: false; error: string };

export async function getComments(postId: string): Promise<GetCommentsResult> {
  if (!postId) {
    return { success: false, error: "postId is required" };
  }

  const supabase = await createSupabaseServerClient();
  const { user, isAdmin } = await getViewer();
  if (!user) {
    return { success: false, error: "unauthorized" };
  }

  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id,type,visibility")
    .eq("id", postId)
    .maybeSingle();

  if (postError) {
    return { success: false, error: `DB Error: ${postError.message}` };
  }
  if (!post) {
    return { success: false, error: "not_found" };
  }
  if (post.type === "diary") {
    return { success: false, error: "diary does not support comments" };
  }
  if (post.visibility === "private" && !isAdmin) {
    return { success: false, error: "forbidden" };
  }

  const { data: comments, error } = await supabase
    .from("comments")
    .select("id,post_id,parent_id,author_id,content,created_at")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) {
    return { success: false, error: `DB Error: ${error.message}` };
  }

  return {
    success: true,
    comments: (comments ?? []).map((c) => ({
      id: c.id,
      postId: c.post_id,
      parentId: c.parent_id,
      authorId: c.author_id,
      content: c.content,
      createdAt: c.created_at,
    })),
  };
}

export type CreateCommentInput = {
  postSlug: string;
  content: string;
  parentId?: string;
};

export type CreateCommentResult =
  | { success: true; comment: Comment }
  | { success: false; error: string };

export async function createComment(
  input: CreateCommentInput
): Promise<CreateCommentResult> {
  const supabase = await createSupabaseServerClient();
  const { user, isAdmin } = await getViewer();
  if (!user) {
    return { success: false, error: "unauthorized" };
  }

  if (!input.postSlug?.trim()) {
    return { success: false, error: "postSlug is required" };
  }
  if (!input.content?.trim()) {
    return { success: false, error: "내용을 입력해주세요." };
  }

  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id,type,visibility,slug")
    .eq("slug", input.postSlug)
    .maybeSingle();

  if (postError) {
    return { success: false, error: `DB Error: ${postError.message}` };
  }
  if (!post) {
    return { success: false, error: "not_found" };
  }
  if (post.type === "diary") {
    return { success: false, error: "diary does not support comments" };
  }

  if (post.visibility === "private" && !isAdmin) {
    return { success: false, error: "forbidden" };
  }

  const parentId = input.parentId?.trim() ? input.parentId.trim() : null;
  if (parentId) {
    const { data: parent, error: parentError } = await supabase
      .from("comments")
      .select("id,post_id,parent_id")
      .eq("id", parentId)
      .maybeSingle();

    if (parentError) {
      return { success: false, error: `DB Error: ${parentError.message}` };
    }
    if (!parent) {
      return { success: false, error: "parent comment not found" };
    }
    if (parent.post_id !== post.id) {
      return { success: false, error: "invalid parent comment" };
    }
    if (parent.parent_id) {
      return { success: false, error: "nested replies are not supported" };
    }
  }

  const { data: created, error } = await supabase
    .from("comments")
    .insert({
      post_id: post.id,
      author_id: user.id,
      content: input.content.trim(),
      parent_id: parentId,
    })
    .select("*")
    .single();

  if (error) {
    return { success: false, error: `DB Error: ${error.message}` };
  }

  // 댓글은 정적 HTML에 들어 있으므로 그 글의 상세와 목록(댓글 수)을 다시 만든다.
  revalidatePublicPosts({ type: post.type, slugs: [post.slug] });

  return {
    success: true,
    comment: {
      id: created.id,
      postId: created.post_id,
      parentId: created.parent_id,
      authorId: created.author_id,
      content: created.content,
      createdAt: created.created_at,
    },
  };
}
export type DeleteCommentResult =
  | { success: true }
  | { success: false; error: string };

export async function deleteComment(
  commentId: string
): Promise<DeleteCommentResult> {
  if (!commentId) {
    return { success: false, error: "commentId is required" };
  }

  const supabase = await createSupabaseServerClient();
  const { user, isAdmin } = await getViewer();
  if (!user) {
    return { success: false, error: "unauthorized" };
  }

  // 1. 댓글 정보 조회 (권한 확인용)
  const { data: comment, error: fetchError } = await supabase
    .from("comments")
    .select("author_id, post_id, posts(slug,type)")
    .eq("id", commentId)
    .maybeSingle();

  if (fetchError) {
    return { success: false, error: `DB Error: ${fetchError.message}` };
  }
  if (!comment) {
    return { success: false, error: "not_found" };
  }

  // 2. 권한 검사: 작성자 본인이거나 관리자여야 함
  if (comment.author_id !== user.id && !isAdmin) {
    return { success: false, error: "forbidden" };
  }

  // 3. 삭제 수행 (대댓글은 DB 레벨에서 cascade delete됨)
  const { error: deleteError } = await supabase
    .from("comments")
    .delete()
    .eq("id", commentId);

  if (deleteError) {
    return { success: false, error: `DB Error: ${deleteError.message}` };
  }

  // Database 타입이 없어(6단계) 다대일 관계도 배열로 추론되므로 두 모양을 모두 받는다.
  const post = Array.isArray(comment.posts) ? comment.posts[0] : comment.posts;
  if (post) {
    revalidatePublicPosts({ type: post.type, slugs: [post.slug] });
  }

  return { success: true };
}
