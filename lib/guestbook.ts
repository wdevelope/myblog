// DB 제약(20261022093000_guestbook.sql)과 같다.
export const GUESTBOOK_CONTENT_MAX = 1000;

export type GuestbookEntry = {
  id: string;
  parentId: string | null;
  authorId: string;
  authorIsAdmin: boolean;
  authorNickname: string | null;
  authorAvatarPath: string | null;
  isSecret: boolean;
  // 비밀글은 볼 수 있는 사람의 화면에서만 채운다. 정적 목록에서는 늘 null이다.
  content: string | null;
  createdAt: string;
};
