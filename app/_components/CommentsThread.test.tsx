// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import CommentsThread from "@/app/_components/CommentsThread";
import type { Comment } from "@/lib/types";

const mocks = vi.hoisted(() => ({
  session: null as { user: { id: string } } | null,
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      getSession: async () => ({ data: { session: mocks.session } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  }),
}));

vi.mock("@/lib/actions/comments", () => ({
  createComment: vi.fn(),
  deleteComment: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const comments: Comment[] = [
  { id: "c1", postId: "p1", parentId: null, authorId: "u1", authorIsAdmin: false, content: "내 댓글", createdAt: "2026-01-01T00:00:00Z" },
  { id: "c2", postId: "p1", parentId: null, authorId: "u2", authorIsAdmin: false, content: "남의 댓글", createdAt: "2026-01-02T00:00:00Z" },
];

beforeEach(() => {
  mocks.session = null;
});

// vitest globals가 꺼져 있어 Testing Library가 자동으로 정리하지 않는다.
afterEach(cleanup);

describe("댓글 영역(정적 페이지 안의 클라이언트 말단)", () => {
  it("로그인하지 않은 방문자에게는 댓글을 보이고 입력창 대신 로그인 안내를 보인다", async () => {
    render(<CommentsThread postSlug="hello" comments={comments} isAdmin={false} />);

    expect(screen.getByText("내 댓글")).toBeInTheDocument();
    const login = await screen.findByRole("link", { name: "로그인하기" });
    expect(login).toHaveAttribute("href", `/login?from=${encodeURIComponent("/article/hello")}`);
    expect(screen.queryByPlaceholderText("댓글을 작성해주세요")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "삭제" })).not.toBeInTheDocument();
  });

  it("로그인하면 입력창과 자기 댓글의 삭제 버튼만 보인다", async () => {
    mocks.session = { user: { id: "u1" } };

    render(<CommentsThread postSlug="hello" comments={comments} isAdmin={false} />);

    expect(await screen.findByPlaceholderText("댓글을 작성해주세요")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "삭제" })).toHaveLength(1);
  });

  it("날짜는 한국 시간 기준 절대 날짜라 정적 HTML과 브라우저 렌더 결과가 같다", () => {
    render(<CommentsThread postSlug="hello" comments={comments} isAdmin={false} />);

    expect(screen.getByText("2026. 1. 1.")).toBeInTheDocument();
  });

  it("관리자 댓글은 Owen 이름과 로고, 다른 사용자 댓글은 사람 아이콘으로 보인다", () => {
    const withAdmin: Comment[] = [
      ...comments,
      { id: "c3", postId: "p1", parentId: "c1", authorId: "admin-1", authorIsAdmin: true, content: "답글", createdAt: "2026-01-03T00:00:00Z" },
    ];

    render(<CommentsThread postSlug="hello" comments={withAdmin} isAdmin={false} />);

    expect(screen.getByText("Owen")).toBeInTheDocument();
    const adminAvatar = screen.getByRole("img", { name: "Owen" });
    expect(adminAvatar.querySelector("img")).not.toBeNull();
    const memberAvatar = screen.getByRole("img", { name: "사용자 u2" });
    expect(memberAvatar.querySelector("img")).toBeNull();
    expect(memberAvatar.querySelector("svg")).not.toBeNull();
  });
});
