import { afterEach, describe, expect, it, vi } from "vitest";
import {
  coverKeyOf,
  coverSrcFromImageKey,
  imageBucketFor,
  imagePathsInBucket,
  replaceImageBucket,
} from "@/lib/image";

const SUPABASE_URL = "https://project.supabase.co";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("이미지 키 → 화면 주소", () => {
  it("공개 버킷 키는 경로의 /를 살린 Supabase 공개 URL이 된다", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL);
    expect(coverSrcFromImageKey("post-images-public:2026-01-01/a b.png")).toBe(
      `${SUPABASE_URL}/storage/v1/object/public/post-images-public/2026-01-01/a%20b.png`,
    );
  });

  it("비공개 버킷 키는 서버 프록시 경로가 된다", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL);
    expect(coverSrcFromImageKey("post-images-private:2026-01-01/a.png")).toBe(
      "/api/images?bucket=post-images-private&path=2026-01-01%2Fa.png",
    );
  });

  it("Supabase URL이 없으면 공개 버킷 키도 프록시 경로가 된다", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    expect(coverSrcFromImageKey("post-images-public:2026-01-01/a.png")).toBe(
      "/api/images?bucket=post-images-public&path=2026-01-01%2Fa.png",
    );
  });

  it("버킷:경로 형식이 아닌 값은 그대로 쓴다", () => {
    expect(coverSrcFromImageKey("/logo.png")).toBe("/logo.png");
  });
});

describe("coverKeyOf", () => {
  it("썸네일이 있으면 썸네일을 표지로 쓴다", () => {
    expect(coverKeyOf({ thumbnailImageKey: "post-images-public:t.png", imageKeys: ["post-images-public:a.png"] })).toBe(
      "post-images-public:t.png"
    );
  });

  it("썸네일이 없거나 비어 있으면 첫 첨부 이미지를 쓴다", () => {
    expect(coverKeyOf({ thumbnailImageKey: "  ", imageKeys: ["post-images-public:a.png"] })).toBe(
      "post-images-public:a.png"
    );
  });

  it("이미지가 하나도 없으면 null이다", () => {
    expect(coverKeyOf({ thumbnailImageKey: null, imageKeys: [] })).toBeNull();
  });
});

describe("글 공개 범위와 이미지 버킷", () => {
  const post = {
    content: [
      "![](post-images-public:2026-01-03/a.png#w=60&align=center)",
      "![설명](post-images-public:2026-01-03/b.png)",
      "![](post-images-private:2026-01-03/c.png)",
      "본문에 적은 글자 post-images-public:2026-01-03/x.png 는 이미지가 아니다.",
      "![](post-images-public:2026-01-03/a.png)",
    ].join("\n"),
    imageKeys: ["post-images-public:2026-01-03/d.png", "post-images-private:2026-01-03/c.png"],
    thumbnailImageKey: "post-images-public:2026-01-03/a.png",
  };

  it("비공개 글은 비공개 버킷, 공개 글은 공개 버킷이다", () => {
    expect(imageBucketFor("private")).toBe("post-images-private");
    expect(imageBucketFor("public")).toBe("post-images-public");
  });

  it("본문 이미지 문법·첨부·썸네일에서 그 버킷의 경로를 한 번씩 모은다", () => {
    expect(imagePathsInBucket(post, "post-images-public")).toEqual([
      "2026-01-03/a.png",
      "2026-01-03/b.png",
      "2026-01-03/d.png",
    ]);
    expect(imagePathsInBucket(post, "post-images-private")).toEqual(["2026-01-03/c.png"]);
  });

  it("옮긴 경로의 키만 버킷 이름을 바꾸고 크기·정렬 조각은 남긴다", () => {
    const placed = replaceImageBucket(post, "post-images-public", "post-images-private", [
      "2026-01-03/a.png",
      "2026-01-03/d.png",
    ]);

    expect(placed.content.split("\n")).toEqual([
      "![](post-images-private:2026-01-03/a.png#w=60&align=center)",
      "![설명](post-images-public:2026-01-03/b.png)",
      "![](post-images-private:2026-01-03/c.png)",
      "본문에 적은 글자 post-images-public:2026-01-03/x.png 는 이미지가 아니다.",
      "![](post-images-private:2026-01-03/a.png)",
    ]);
    expect(placed.imageKeys).toEqual([
      "post-images-private:2026-01-03/d.png",
      "post-images-private:2026-01-03/c.png",
    ]);
    expect(placed.thumbnailImageKey).toBe("post-images-private:2026-01-03/a.png");
  });

  it("썸네일이 없으면 그대로 null이다", () => {
    const placed = replaceImageBucket({ ...post, thumbnailImageKey: null }, "post-images-public", "post-images-private", []);
    expect(placed.thumbnailImageKey).toBeNull();
    expect(placed.content).toBe(post.content);
  });
});
