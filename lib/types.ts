export type PostType = "blog" | "feed" | "diary";
export type Visibility = "public" | "private";

export type Post = {
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
  viewCount: number;
  commentCount: number;
};

// 다이어리 목록 화면이 쓰는 값. 클라이언트 컴포넌트로 넘어가 페이지에 그대로 실린다.
export type DiaryIndexEntry = Pick<Post, "id" | "slug" | "title" | "createdAt" | "visibility">;

export type Category = {
  slug: string;
  visibility: Visibility;
  sortOrder: number;
  inUse?: number;
};

export type Comment = {
  id: string;
  postId: string;
  parentId?: string | null;
  authorId?: string | null;
  authorIsAdmin: boolean;
  authorNickname?: string | null;
  authorAvatarPath?: string | null;
  content: string;
  createdAt: string;
};

export type MyComment = {
  id: string;
  content: string;
  createdAt: string;
  isReply: boolean;
  post: { slug: string; type: PostType; title: string } | null;
};

export type MyProfile = {
  nickname: string | null;
  avatarPath: string | null;
};
