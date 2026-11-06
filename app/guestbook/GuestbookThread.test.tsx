// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import GuestbookThread from "@/app/guestbook/GuestbookThread";
import { createGuestbookEntry, deleteGuestbookEntry } from "@/lib/actions/guestbook";
import { resetUserProfile } from "@/lib/actions/profile";
import { ACTION_FAILED } from "@/lib/constants";
import type { GuestbookEntry } from "@/lib/guestbook";

const mocks = vi.hoisted(() => ({
  session: null as { user: { id: string } } | null,
  secretQueries: [] as string[][],
  secretRows: [] as { entry_id: string; content: string }[],
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      getSession: async () => ({ data: { session: mocks.session } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: () => ({
      select: () => ({
        in: async (_column: string, ids: string[]) => (
          mocks.secretQueries.push(ids), { data: mocks.secretRows, error: null }
        ),
      }),
    }),
  }),
}));

vi.mock("@/lib/actions/guestbook", () => ({
  createGuestbookEntry: vi.fn(),
  deleteGuestbookEntry: vi.fn(),
}));

vi.mock("@/lib/actions/profile", () => ({
  resetUserProfile: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

function entry(overrides: Partial<GuestbookEntry> & Pick<GuestbookEntry, "id">): GuestbookEntry {
  return {
    parentId: null,
    authorId: "u1",
    authorIsAdmin: false,
    authorNickname: null,
    authorAvatarPath: null,
    isSecret: false,
    content: "공개 글",
    createdAt: "2026-10-22T00:00:00Z",
    ...overrides,
  };
}

// 서버(정적 목록)는 최신순으로 넘긴다.
const entries: GuestbookEntry[] = [
  entry({ id: "r2", parentId: "e2", authorId: "admin-1", authorIsAdmin: true, isSecret: true, content: null, createdAt: "2026-10-22T03:00:00Z" }),
  entry({ id: "e2", authorId: "u2", authorNickname: "비밀손님", isSecret: true, content: null, createdAt: "2026-10-22T02:00:00Z" }),
  entry({ id: "e1", authorId: "u1", content: "공개 글", createdAt: "2026-10-22T01:00:00Z" }),
];

beforeEach(() => {
  mocks.session = null;
  mocks.secretQueries.length = 0;
  mocks.secretRows = [];
});

// vitest globals가 꺼져 있어 Testing Library가 자동으로 정리하지 않는다.
afterEach(cleanup);

describe("방명록 목록(정적 페이지 안의 클라이언트 말단)", () => {
  it("방문자에게는 비밀글과 그 답글 자리에 작성자·날짜와 '비밀글입니다'만 보이고, 쓰기 칸 대신 로그인 안내가 보인다", async () => {
    render(<GuestbookThread entries={entries} />);

    expect(screen.getByText("공개 글")).toBeInTheDocument();
    expect(screen.getByText("비밀손님")).toBeInTheDocument();
    expect(screen.getByText("Owen")).toBeInTheDocument();
    expect(screen.getAllByText("비밀글입니다")).toHaveLength(2);

    const login = await screen.findByRole("link", { name: "로그인하기" });
    expect(login).toHaveAttribute("href", `/login?from=${encodeURIComponent("/guestbook")}`);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "삭제" })).not.toBeInTheDocument();
    expect(mocks.secretQueries).toEqual([]);
  });

  it("원글은 최신순, 답글은 원글 아래에 놓인다", () => {
    render(<GuestbookThread entries={entries} />);

    const names = screen.getAllByRole("img").map((el) => el.getAttribute("aria-label"));
    expect(names).toEqual(["비밀손님", "Owen", "사용자 u1"]);
  });

  it("로그인한 작성자는 자기 비밀글과 거기 달린 답글 내용만 브라우저 세션으로 읽어 채운다", async () => {
    mocks.session = { user: { id: "u2" } };
    mocks.secretRows = [
      { entry_id: "e2", content: "내 비밀 이야기" },
      { entry_id: "r2", content: "관리자의 비밀 답글" },
    ];

    render(<GuestbookThread entries={entries} />);

    expect(await screen.findByText("내 비밀 이야기")).toBeInTheDocument();
    expect(screen.getByText("관리자의 비밀 답글")).toBeInTheDocument();
    expect(screen.queryByText("비밀글입니다")).not.toBeInTheDocument();
    expect(mocks.secretQueries).toEqual([["r2", "e2"]]);
    expect(screen.getByRole("checkbox", { name: /비밀글/ })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "삭제" })).toHaveLength(1);
  });

  it("다른 사람의 비밀글만 있으면 비밀 내용을 요청하지 않는다", async () => {
    mocks.session = { user: { id: "u1" } };

    render(<GuestbookThread entries={entries} />);

    expect(await screen.findByRole("textbox", { name: "방명록 내용" })).toBeInTheDocument();
    expect(mocks.secretQueries).toEqual([]);
    expect(screen.getAllByText("비밀글입니다")).toHaveLength(2);
  });

  it("관리자 화면에서는 원글마다 답글·삭제 버튼이 보이고 비밀 내용을 따로 요청하지 않는다", async () => {
    mocks.session = { user: { id: "admin-1" } };
    const withSecrets = entries.map((e) => (e.isSecret ? { ...e, content: `${e.id} 내용` } : e));

    render(<GuestbookThread entries={withSecrets} isAdmin />);

    expect(await screen.findByRole("textbox", { name: "방명록 내용" })).toBeInTheDocument();
    expect(screen.getByText("e2 내용")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "답글" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "삭제" })).toHaveLength(3);
    expect(screen.getAllByRole("button", { name: "프로필 초기화" })).toHaveLength(1);
    expect(mocks.secretQueries).toEqual([]);
  });

  it("글이 없으면 빈 목록 안내를 보인다", () => {
    render(<GuestbookThread entries={[]} />);

    expect(screen.getByText("아직 남겨진 글이 없어요. 첫 글을 남겨 주세요.")).toBeInTheDocument();
  });
});

describe("방명록 요청이 끊겼을 때", () => {
  beforeEach(() => {
    vi.mocked(toast.error).mockClear();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("등록이 끊겨도 화면이 유지되고 이유를 보이며 쓰던 글을 남긴다", async () => {
    mocks.session = { user: { id: "u1" } };
    vi.mocked(createGuestbookEntry).mockRejectedValue(new TypeError("Failed to fetch"));
    render(<GuestbookThread entries={entries} />);

    fireEvent.change(await screen.findByLabelText("방명록 내용"), { target: { value: "쓰던 글" } });
    fireEvent.click(screen.getByRole("button", { name: "등록" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(ACTION_FAILED.error);
    expect(screen.getByLabelText("방명록 내용")).toHaveValue("쓰던 글");
  });

  it("삭제가 끊기면 토스트로 알린다", async () => {
    vi.mocked(deleteGuestbookEntry).mockRejectedValue(new TypeError("Failed to fetch"));
    render(<GuestbookThread entries={entries} isAdmin />);

    fireEvent.click(screen.getAllByRole("button", { name: "삭제" })[0]);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(ACTION_FAILED.error));
  });

  it("프로필 초기화가 끊기면 토스트로 알린다", async () => {
    vi.mocked(resetUserProfile).mockRejectedValue(new TypeError("Failed to fetch"));
    render(<GuestbookThread entries={entries} isAdmin />);

    fireEvent.click(screen.getAllByRole("button", { name: "프로필 초기화" })[0]);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(ACTION_FAILED.error));
  });
});
