import { beforeEach, describe, expect, it, vi } from "vitest";
import { removeAvatar, resetUserProfile, updateAvatar, updateNickname } from "@/lib/actions/profile";
import { ADMIN_REQUIRED, LOGIN_REQUIRED } from "@/lib/constants";
import { revalidatePublicPosts } from "@/lib/server/publicPosts";
import { revalidateGuestbook } from "@/lib/server/guestbook";

type Result = { data: unknown; error: { code?: string; message: string } | null };

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  calls: [] as unknown[][],
  results: {} as Record<string, Result>,
  storageFiles: [] as { name: string }[],
  removed: [] as string[][],
  serviceCalls: [] as unknown[][],
}));

// 관리자 되돌리기는 남의 행·폴더를 고치므로 service role을 쓴다.
vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: () => {
    const query = {
      update: (...args: unknown[]) => (mocks.serviceCalls.push(["update", ...args]), query),
      eq: async (...args: unknown[]) => (mocks.serviceCalls.push(["eq", ...args]), { error: null }),
    };
    return {
      from: (table: string) => (mocks.serviceCalls.push(["from", table]), query),
      storage: {
        from: () => ({
          list: async (folder: string) => (
            mocks.serviceCalls.push(["list", folder]), { data: mocks.storageFiles, error: null }
          ),
          remove: async (paths: string[]) => (mocks.removed.push(paths), { data: [], error: null }),
        }),
      },
    };
  },
}));

vi.mock("@/lib/server/publicPosts", () => ({
  revalidatePublicPosts: vi.fn(),
}));

vi.mock("@/lib/server/guestbook", () => ({
  revalidateGuestbook: vi.fn(),
}));

// PostgREST 쿼리 체인을 흉내 내고 표·메서드 호출을 기록한다.
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: mocks.getUser },
    storage: {
      from: (bucket: string) => ({
        list: async (folder: string) => (
          mocks.calls.push([bucket, "list", folder]), { data: mocks.storageFiles, error: null }
        ),
        remove: async (paths: string[]) => (mocks.removed.push(paths), { data: [], error: null }),
      }),
    },
    from: (table: string) => {
      const result = mocks.results[table] ?? { data: null, error: null };
      const query = {
        select: (...args: unknown[]) => (mocks.calls.push([table, "select", ...args]), query),
        update: (...args: unknown[]) => (mocks.calls.push([table, "update", ...args]), query),
        eq: (...args: unknown[]) => (mocks.calls.push([table, "eq", ...args]), query),
        then: (resolve: (value: Result) => unknown) => Promise.resolve(result).then(resolve),
      };
      return query;
    },
  }),
}));

const member = { id: "user-1", app_metadata: {}, user_metadata: {} };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.calls.length = 0;
  mocks.results = {};
  mocks.storageFiles = [];
  mocks.removed.length = 0;
  mocks.serviceCalls.length = 0;
  mocks.getUser.mockResolvedValue({ data: { user: member }, error: null });
});

describe("닉네임 바꾸기", () => {
  it("로그인하지 않으면 저장하지 않는다", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });

    expect(await updateNickname("테스트회원")).toEqual({ success: false, error: LOGIN_REQUIRED });
    expect(mocks.calls).toEqual([]);
  });

  it("관리자 이름은 Owen으로 고정이라 바꾸지 않는다", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { ...member, app_metadata: { is_admin: true } } },
      error: null,
    });

    expect(await updateNickname("테스트회원")).toMatchObject({ success: false });
    expect(mocks.calls).toEqual([]);
  });

  it("규칙에 어긋나면 DB에 보내지 않고 이유를 돌려준다", async () => {
    expect(await updateNickname("Owen_1")).toEqual({
      success: false,
      error: "운영자로 보일 수 있는 이름은 쓸 수 없어요.",
    });
    expect(await updateNickname("a")).toMatchObject({ success: false });
    expect(await updateNickname(3)).toMatchObject({ success: false });
    expect(mocks.calls).toEqual([]);
  });

  it("본인 행에 앞뒤 공백을 자른 닉네임을 저장하고, 댓글 단 글과 방명록을 무효화한다", async () => {
    mocks.results.comments = { data: [{ posts: { slug: "hello", type: "blog" } }], error: null };

    expect(await updateNickname("  테스트회원 ")).toEqual({ success: true });

    expect(mocks.calls).toContainEqual(["profiles", "update", { nickname: "테스트회원" }]);
    expect(mocks.calls).toContainEqual(["profiles", "eq", "id", "user-1"]);
    expect(mocks.calls).toContainEqual(["comments", "eq", "author_id", "user-1"]);
    expect(revalidatePublicPosts).toHaveBeenCalledWith({ type: "blog", slugs: ["hello"] });
    expect(revalidateGuestbook).toHaveBeenCalled();
  });

  it("이미 쓰는 닉네임(unique 위반)은 안내 문구로 바꾸고 무효화하지 않는다", async () => {
    mocks.results.profiles = { data: null, error: { code: "23505", message: "duplicate key" } };

    expect(await updateNickname("테스트회원")).toEqual({
      success: false,
      error: "이미 쓰는 닉네임이에요.",
    });
    expect(revalidatePublicPosts).not.toHaveBeenCalled();
    expect(revalidateGuestbook).not.toHaveBeenCalled();
  });
});

const OWN = "user-1";
const NEW_FILE = "11111111-2222-3333-4444-555555555555.jpg";
const OLD_FILE = "99999999-8888-7777-6666-555555555555.jpg";

describe("프로필 사진 바꾸기", () => {
  it("본인 폴더의 uuid JPEG가 아니면 저장하지 않는다", async () => {
    expect(await updateAvatar(`someone/${NEW_FILE}`)).toMatchObject({ success: false });
    expect(await updateAvatar(`${OWN}/evil.svg`)).toMatchObject({ success: false });
    expect(mocks.calls.filter((c) => c[1] === "update")).toEqual([]);
  });

  it("올린 파일이 폴더에 없으면 저장하지 않는다", async () => {
    mocks.storageFiles = [{ name: OLD_FILE }];

    expect(await updateAvatar(`${OWN}/${NEW_FILE}`)).toMatchObject({ success: false });
    expect(mocks.calls.filter((c) => c[1] === "update")).toEqual([]);
  });

  it("경로를 저장하고 폴더의 이전 파일을 지운 뒤 댓글 단 글을 무효화한다", async () => {
    mocks.storageFiles = [{ name: OLD_FILE }, { name: NEW_FILE }];
    mocks.results.comments = { data: [{ posts: { slug: "hello", type: "blog" } }], error: null };

    expect(await updateAvatar(`${OWN}/${NEW_FILE}`)).toEqual({ success: true });

    expect(mocks.calls).toContainEqual(["avatars", "list", OWN]);
    expect(mocks.calls).toContainEqual(["profiles", "update", { avatar_path: `${OWN}/${NEW_FILE}` }]);
    expect(mocks.removed).toEqual([[`${OWN}/${OLD_FILE}`]]);
    expect(revalidatePublicPosts).toHaveBeenCalledWith({ type: "blog", slugs: ["hello"] });
  });

  it("관리자는 로고로 고정이라 바꾸지 않는다", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { ...member, app_metadata: { is_admin: true } } },
      error: null,
    });

    expect(await updateAvatar(`${OWN}/${NEW_FILE}`)).toMatchObject({ success: false });
    expect(await removeAvatar()).toMatchObject({ success: false });
    expect(mocks.calls).toEqual([]);
  });
});

describe("프로필 사진 지우기", () => {
  it("경로를 비우고 폴더의 파일을 모두 지운다", async () => {
    mocks.storageFiles = [{ name: OLD_FILE }];

    expect(await removeAvatar()).toEqual({ success: true });

    expect(mocks.calls).toContainEqual(["profiles", "update", { avatar_path: null }]);
    expect(mocks.removed).toEqual([[`${OWN}/${OLD_FILE}`]]);
  });
});

const TARGET = "8353737f-5798-4b26-83b8-64cb7ab94240";

describe("관리자 되돌리기", () => {
  it("관리자가 아니면 아무것도 바꾸지 않는다", async () => {
    expect(await resetUserProfile(TARGET)).toEqual({ success: false, error: ADMIN_REQUIRED });
    expect(mocks.serviceCalls).toEqual([]);
  });

  it("관리자는 그 사용자의 닉네임·사진을 비우고 사진 파일을 지운 뒤 댓글 단 글과 방명록을 무효화한다", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { ...member, app_metadata: { is_admin: true } } },
      error: null,
    });
    mocks.storageFiles = [{ name: OLD_FILE }];
    mocks.results.comments = { data: [{ posts: { slug: "hello", type: "blog" } }], error: null };

    expect(await resetUserProfile(TARGET)).toEqual({ success: true });

    expect(mocks.serviceCalls).toContainEqual(["from", "profiles"]);
    expect(mocks.serviceCalls).toContainEqual(["update", { nickname: null, avatar_path: null }]);
    expect(mocks.serviceCalls).toContainEqual(["eq", "id", TARGET]);
    expect(mocks.removed).toEqual([[`${TARGET}/${OLD_FILE}`]]);
    expect(mocks.calls).toContainEqual(["comments", "eq", "author_id", TARGET]);
    expect(revalidatePublicPosts).toHaveBeenCalledWith({ type: "blog", slugs: ["hello"] });
    expect(revalidateGuestbook).toHaveBeenCalled();
  });

  it("사용자 id가 uuid가 아니면 바꾸지 않는다", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { ...member, app_metadata: { is_admin: true } } },
      error: null,
    });

    expect(await resetUserProfile("../etc")).toMatchObject({ success: false });
    expect(mocks.serviceCalls).toEqual([]);
  });
});
