import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteAccount } from "@/lib/actions/account";
import { revalidatePublicPosts } from "@/lib/server/publicPosts";
import { revalidateGuestbook } from "@/lib/server/guestbook";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  deleteUser: vi.fn(),
  calls: [] as unknown[][],
  comments: [] as unknown[],
  avatarFiles: [] as { name: string }[],
  removed: [] as string[][],
}));

vi.mock("@/lib/server/publicPosts", () => ({
  revalidatePublicPosts: vi.fn(),
}));

vi.mock("@/lib/server/guestbook", () => ({
  revalidateGuestbook: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => {
    const query = {
      select: (...args: unknown[]) => (mocks.calls.push(["select", ...args]), query),
      eq: async (...args: unknown[]) => (
        mocks.calls.push(["eq", ...args]), { data: mocks.comments, error: null }
      ),
    };
    return {
      auth: { getUser: mocks.getUser },
      from: (table: string) => (mocks.calls.push(["from", table]), query),
    };
  },
}));

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: () => ({
    auth: { admin: { deleteUser: mocks.deleteUser } },
    storage: {
      from: () => ({
        list: async () => ({ data: mocks.avatarFiles, error: null }),
        remove: async (paths: string[]) => (mocks.removed.push(paths), { data: [], error: null }),
      }),
    },
  }),
}));

const member = { id: "user-1", app_metadata: {}, user_metadata: {} };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.calls.length = 0;
  mocks.comments = [];
  mocks.avatarFiles = [];
  mocks.removed.length = 0;
  mocks.deleteUser.mockResolvedValue({ data: {}, error: null });
});

describe("회원 탈퇴", () => {
  it("로그인하지 않으면 아무것도 지우지 않는다", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });

    expect(await deleteAccount()).toEqual({ success: false, error: "unauthorized" });
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });

  it("관리자는 탈퇴할 수 없다", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { ...member, app_metadata: { is_admin: true } } },
      error: null,
    });

    expect(await deleteAccount()).toMatchObject({ success: false });
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });

  it("user_metadata.is_admin만 있는 사용자는 일반 사용자로 탈퇴한다", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { ...member, user_metadata: { is_admin: true } } },
      error: null,
    });

    expect(await deleteAccount()).toEqual({ success: true });
    expect(mocks.deleteUser).toHaveBeenCalledWith("user-1");
  });

  it("세션의 본인 계정을 지우고, 댓글이 달려 있던 공개 글을 타입별로, 방명록도 무효화한다", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: member }, error: null });
    mocks.comments = [
      { posts: { slug: "a", type: "blog" } },
      { posts: [{ slug: "b", type: "blog" }] },
      { posts: { slug: "f", type: "feed" } },
      { posts: null },
    ];

    expect(await deleteAccount()).toEqual({ success: true });

    expect(mocks.calls).toContainEqual(["eq", "author_id", "user-1"]);
    expect(mocks.deleteUser).toHaveBeenCalledWith("user-1");
    expect(revalidatePublicPosts).toHaveBeenCalledWith({ type: "blog", slugs: ["a", "b"] });
    expect(revalidatePublicPosts).toHaveBeenCalledWith({ type: "feed", slugs: ["f"] });
    expect(revalidatePublicPosts).toHaveBeenCalledTimes(2);
    expect(revalidateGuestbook).toHaveBeenCalled();
  });

  it("계정을 지운 뒤 그 사용자의 프로필 사진 파일도 지운다(Storage는 계정과 함께 지워지지 않는다)", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: member }, error: null });
    mocks.avatarFiles = [{ name: "a.jpg" }];

    expect(await deleteAccount()).toEqual({ success: true });

    expect(mocks.removed).toEqual([["user-1/a.jpg"]]);
  });

  it("계정 삭제가 실패하면 캐시를 무효화하지 않고 실패를 돌려준다", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: member }, error: null });
    mocks.comments = [{ posts: { slug: "a", type: "blog" } }];
    mocks.deleteUser.mockResolvedValue({ data: null, error: { message: "boom" } });

    expect(await deleteAccount()).toMatchObject({ success: false });
    expect(revalidatePublicPosts).not.toHaveBeenCalled();
    expect(revalidateGuestbook).not.toHaveBeenCalled();
    expect(mocks.removed).toEqual([]);
  });
});
