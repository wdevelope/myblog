import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/images/route";

const mocks = vi.hoisted(() => ({
  requestHeaders: new Headers(),
  getUser: vi.fn(),
  download: vi.fn(),
  upload: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: async () => mocks.requestHeaders,
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: mocks.getUser },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: { is_admin: false }, error: null }),
        }),
      }),
    }),
  }),
}));

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: () => ({
    storage: {
      from: () => ({ download: mocks.download, upload: mocks.upload }),
    },
  }),
}));

const ORIGIN = "http://localhost:2025";

function imageUrl(bucket: string) {
  return `${ORIGIN}/api/images?bucket=${bucket}&path=2026-01-01%2Fa.png`;
}

function signedIn(user: object | null) {
  mocks.getUser.mockResolvedValue({ data: { user }, error: null });
}

const nonAdmin = { id: "user-1", app_metadata: {}, user_metadata: { is_admin: true } };

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of [...mocks.requestHeaders.keys()]) {
    mocks.requestHeaders.delete(key);
  }
  mocks.download.mockResolvedValue({
    data: new Blob(["image"], { type: "image/png" }),
    error: null,
  });
  mocks.upload.mockResolvedValue({ error: null });
});

describe("GET /api/images 권한", () => {
  it("세션 없이 위조한 관리자 헤더만 있으면 비공개 버킷 이미지는 401이다", async () => {
    mocks.requestHeaders.set("x-user-id", "attacker");
    mocks.requestHeaders.set("x-user-is-admin", "true");
    signedIn(null);

    const res = await GET(new Request(imageUrl("post-images-private")));

    expect(res.status).toBe(401);
    expect(mocks.download).not.toHaveBeenCalled();
  });

  it("관리자가 아닌 로그인 사용자도 비공개 버킷 이미지는 로그인 화면 대신 401을 받는다", async () => {
    signedIn(nonAdmin);

    const res = await GET(new Request(imageUrl("post-images-private")));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
    expect(mocks.download).not.toHaveBeenCalled();
  });

  it("공개 버킷 이미지는 비로그인도 받는다", async () => {
    signedIn(null);

    const res = await GET(new Request(imageUrl("post-images-public")));

    expect(res.status).toBe(200);
  });
});

describe("POST /api/images 권한", () => {
  it("관리자가 아니면 업로드하지 않고 401을 돌려준다", async () => {
    signedIn(nonAdmin);
    const form = new FormData();
    form.set("visibility", "public");
    form.append("files", new File(["image"], "a.png", { type: "image/png" }));

    const res = await POST(new Request(`${ORIGIN}/api/images`, { method: "POST", body: form }));

    expect(res.status).toBe(401);
    expect(mocks.upload).not.toHaveBeenCalled();
  });
});
