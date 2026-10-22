import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { revalidatePath, updateTag } from "next/cache";
import { getGuestbookDirectly, getPublicGuestbook, revalidateGuestbook } from "@/lib/server/guestbook";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
}));

const mocks = vi.hoisted(() => ({
  select: "",
  rows: [] as unknown[],
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => {
    const query = {
      select: (columns: string) => ((mocks.select = columns), query),
      order: async () => ({ data: mocks.rows, error: null }),
    };
    return { from: () => query };
  },
}));

const ANON_KEY = "test-anon-key";

let fetchMock: Mock<typeof fetch>;

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co/");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", ANON_KEY);
  fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal("fetch", fetchMock);
  mocks.select = "";
  mocks.rows = [];
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const publicRow = {
  id: "e1",
  parent_id: null,
  author_id: "u1",
  author_is_admin: false,
  is_secret: false,
  content: "안녕하세요",
  created_at: "2026-10-22T00:00:00Z",
  author: { nickname: "방문자", avatar_path: null },
};

const secretRow = {
  id: "e2",
  parent_id: null,
  author_id: "u2",
  author_is_admin: false,
  is_secret: true,
  content: null,
  created_at: "2026-10-22T01:00:00Z",
  author: [{ nickname: null, avatar_path: "u2/a.jpg" }],
};

describe("방명록 공개 조회", () => {
  it("anon 키로 guestbook_entries만 읽고 비밀 내용 표는 select에 넣지 않는다", async () => {
    fetchMock.mockResolvedValue(new Response("[]"));

    await getPublicGuestbook();

    const [input, init] = fetchMock.mock.calls[0];
    const url = new URL(String(input));
    expect(`${url.origin}${url.pathname}`).toBe("https://project.supabase.co/rest/v1/guestbook_entries");
    expect(url.searchParams.get("select")).toBe(
      "id,parent_id,author_id,author_is_admin,is_secret,content,created_at,author:profiles(nickname,avatar_path)",
    );
    expect(url.searchParams.get("select")).not.toContain("secret_contents");
    expect(url.searchParams.get("order")).toBe("created_at.desc");
    expect(init).toMatchObject({
      method: "GET",
      cache: "force-cache",
      headers: { apikey: ANON_KEY, authorization: `Bearer ${ANON_KEY}` },
      next: { revalidate: 86400, tags: ["guestbook"] },
    });
  });

  it("비밀글은 content가 null인 채로, 작성자 프로필은 두 모양 모두 매핑한다", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify([secretRow, publicRow])));

    expect(await getPublicGuestbook()).toEqual([
      {
        id: "e2",
        parentId: null,
        authorId: "u2",
        authorIsAdmin: false,
        authorNickname: null,
        authorAvatarPath: "u2/a.jpg",
        isSecret: true,
        content: null,
        createdAt: "2026-10-22T01:00:00Z",
      },
      {
        id: "e1",
        parentId: null,
        authorId: "u1",
        authorIsAdmin: false,
        authorNickname: "방문자",
        authorAvatarPath: null,
        isSecret: false,
        content: "안녕하세요",
        createdAt: "2026-10-22T00:00:00Z",
      },
    ]);
  });

  it("비밀글 행에 content가 실려 와도 공개 목록에 옮기지 않는다", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify([{ ...secretRow, content: "새면 안 되는 내용" }])));

    const [entry] = await getPublicGuestbook();
    expect(entry.content).toBeNull();
  });

  it("조회가 실패하면 던진다", async () => {
    fetchMock.mockResolvedValue(new Response("boom", { status: 500 }));

    await expect(getPublicGuestbook()).rejects.toThrow("Supabase REST 500");
  });
});

describe("방명록 관리자 조회", () => {
  it("RLS 클라이언트로 비밀 내용을 함께 읽어 비밀글 content에 채운다", async () => {
    mocks.rows = [
      { ...secretRow, secret: { content: "관리자만 보는 내용" } },
      { ...publicRow, secret: null },
    ];

    const entries = await getGuestbookDirectly();

    expect(mocks.select).toContain("secret:guestbook_secret_contents(content)");
    expect(entries.map((e) => e.content)).toEqual(["관리자만 보는 내용", "안녕하세요"]);
  });
});

describe("방명록 캐시 무효화", () => {
  it("방명록 태그와 /guestbook 경로를 무효화한다", () => {
    revalidateGuestbook();

    expect(updateTag).toHaveBeenCalledWith("guestbook");
    expect(revalidatePath).toHaveBeenCalledWith("/guestbook");
  });
});
