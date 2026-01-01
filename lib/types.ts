export type PostType = "blog" | "feed" | "diary";
export type Visibility = "public" | "private";

export type Post = {
  id: string;
  slug: string;
  type: PostType;
  visibility: Visibility;
  title: string;
  content: string;
  categorySlug?: string | null;
  createdAt: string;
  updatedAt: string;
  imageKeys?: string[];
  thumbnailImageKey?: string | null;
  viewCount?: number;
};

export type Comment = {
  id: string;
  postId: string;
  parentId?: string | null;
  authorId?: string | null;
  content: string;
  createdAt: string;
};
