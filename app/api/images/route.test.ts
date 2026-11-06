import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/images/route";
import { ADMIN_REQUIRED } from "@/lib/constants";

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

  it("이미지를 받지 못해도 Storage 오류 원문을 돌려주지 않는다", async () => {
    mocks.download.mockResolvedValue({ data: null, error: { message: "bucket secret-name not found" } });

    const res = await GET(new Request(imageUrl("post-images-public")));

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "image_fetch_failed" });
  });

  it("공개 버킷 이미지는 비로그인도 받는다", async () => {
    signedIn(null);

    const res = await GET(new Request(imageUrl("post-images-public")));

    expect(res.status).toBe(200);
  });
});

describe("GET /api/images 경로 검사", () => {
  // storage-js는 경로를 그대로 `object/<버킷>/<경로>` 주소에 붙이고, URL 파서가 `..`를 풀어 버린다.
  // 그래서 Storage로 보내는 경로가 요청한 버킷 밖을 가리키지 않는지를 주소 해석 결과로 확인한다.
  function staysInBucket(bucket: string, sentPath: string) {
    const base = `https://project.supabase.co/storage/v1/object/${bucket}/`;
    return new URL(base + sentPath).pathname.startsWith(new URL(base).pathname);
  }

  it.each([
    "../post-images-private/2026-01-01/a.png",
    "2026-01-01/../../post-images-private/2026-01-01/a.png",
    "%2e%2e/post-images-private/2026-01-01/a.png",
    "%2E%2E%2Fpost-images-private%2F2026-01-01%2Fa.png",
    "..\\post-images-private\\2026-01-01\\a.png",
    "./../avatars/user-1/a.jpg",
  ])("공개 버킷을 거쳐 다른 버킷 파일을 받을 수 없다: %s", async (path) => {
    signedIn(null);
    const url = `${ORIGIN}/api/images?bucket=post-images-public&path=${encodeURIComponent(path)}`;

    const res = await GET(new Request(url));

    if (res.status === 400) {
      expect(mocks.download).not.toHaveBeenCalled();
    } else {
      const [sentPath] = mocks.download.mock.calls[0] ?? [];
      expect(staysInBucket("post-images-public", sentPath)).toBe(true);
    }
  });

  it("글 이미지 버킷이 아닌 버킷은 관리자여도 400이다", async () => {
    signedIn({ id: "admin-1", app_metadata: { is_admin: true } });

    const res = await GET(new Request(imageUrl("avatars")));

    expect(res.status).toBe(400);
    expect(mocks.download).not.toHaveBeenCalled();
  });

  it("한글·공백이 든 옛 파일 이름도 같은 객체를 가리키게 인코딩해 받는다", async () => {
    signedIn(null);
    const path = "2025-12-28/1a2b-사진 1.png";
    const url = `${ORIGIN}/api/images?bucket=post-images-public&path=${encodeURIComponent(path)}`;

    const res = await GET(new Request(url));

    expect(res.status).toBe(200);
    expect(mocks.download).toHaveBeenCalledWith("2025-12-28/1a2b-%EC%82%AC%EC%A7%84%201.png");
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
    expect(await res.json()).toEqual({ error: ADMIN_REQUIRED });
    expect(mocks.upload).not.toHaveBeenCalled();
  });
});

const admin = { id: "admin-1", app_metadata: { is_admin: true }, user_metadata: {} };

function uploadRequest(files: File[]) {
  const form = new FormData();
  form.set("visibility", "public");
  for (const file of files) form.append("files", file);
  return new Request(`${ORIGIN}/api/images`, { method: "POST", body: form });
}

describe("GET /api/images 캐시", () => {
  it("비공개 버킷 이미지는 공유 캐시에 남지 않게 private, no-store로 준다", async () => {
    signedIn(admin);

    const res = await GET(new Request(imageUrl("post-images-private")));

    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("공개 버킷 이미지는 오래 캐시한다", async () => {
    signedIn(null);

    const res = await GET(new Request(imageUrl("post-images-public")));

    expect(res.headers.get("Cache-Control")).toBe("public, max-age=31536000, immutable");
  });
});

describe("POST /api/images 파일 검사", () => {
  it("SVG는 이미지여도 올리지 않고 400을 돌려준다", async () => {
    signedIn(admin);

    const res = await POST(uploadRequest([new File(["<svg/>"], "a.svg", { type: "image/svg+xml" })]));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "SVG 이미지는 올릴 수 없어요." });
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("허용하지 않는 파일이 섞여 있으면 앞의 파일도 올리지 않는다", async () => {
    signedIn(admin);

    const res = await POST(
      uploadRequest([
        new File(["image"], "a.png", { type: "image/png" }),
        new File(["<svg/>"], "b.svg", { type: "image/svg+xml" }),
      ]),
    );

    expect(res.status).toBe(400);
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("올리지 못하면 Storage 오류 원문 대신 안내 문구를 돌려주고 원문은 서버 로그에 남긴다", async () => {
    signedIn(admin);
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.upload.mockResolvedValue({ error: { message: "bucket secret-name not found" } });

    const res = await POST(uploadRequest([new File(["image"], "a.png", { type: "image/png" })]));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "이미지를 올리지 못했어요." });
    expect(logged.mock.calls.flat().join(" ")).toContain("bucket secret-name not found");
  });

  it("관리자가 올린 이미지는 날짜 폴더 키로 돌려준다", async () => {
    signedIn(admin);

    const res = await POST(uploadRequest([new File(["image"], "a.png", { type: "image/png" })]));

    expect(res.status).toBe(200);
    const { keys } = (await res.json()) as { keys: string[] };
    expect(keys).toHaveLength(1);
    expect(keys[0]).toMatch(/^post-images-public:\d{4}-\d{2}-\d{2}\/[0-9a-f-]{36}\.png$/);
  });
});
