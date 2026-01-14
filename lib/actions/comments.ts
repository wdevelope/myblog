"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminDb } from "@/lib/server/admin";
import type { Comment } from "@/lib/types";

export type GetCommentsResult =
  | { success: true; comments: Comment[] }
  | { success: false; error: string };

export async function getComments(postId: string): Promise<GetCommentsResult> {
  if (!postId) {
    return { success: false, error: "postId is required" };
  }

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return { success: false, error: "unauthorized" };
  }

  const isAdmin = await isAdminDb(auth.user);

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
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
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
    .select("id,type,visibility")
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

  const isAdmin = await isAdminDb(auth.user);
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
      author_id: auth.user.id,
      content: input.content.trim(),
      parent_id: parentId,
    })
    .select("*")
    .single();

  if (error) {
    return { success: false, error: `DB Error: ${error.message}` };
  }

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
