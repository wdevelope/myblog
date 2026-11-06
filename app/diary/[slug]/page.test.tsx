// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as diaryEntry from "@/app/diary/[slug]/page";
import { getPreviewViewer } from "@/lib/server/admin";
import { getPostForRoute } from "@/lib/server/posts";
import { getPublicDiaryIndex } from "@/lib/server/publicPosts";
import type { Post } from "@/lib/types";

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));
vi.mock("@/lib/server/admin", () => ({ getPreviewViewer: vi.fn() }));
vi.mock("@/lib/server/posts", () => ({ getPostForRoute: vi.fn() }));
vi.mock("@/lib/server/publicPosts", () => ({ getPublicDiaryIndex: vi.fn() }));
vi.mock("@/app/_components/MarkdownContent", () => ({
  default: ({ content }: { content: string }) => <p>{content}</p>,
}));
vi.mock("@/app/_components/PostImages", () => ({ default: () => null }));
vi.mock("@/app/_components/PostActionMenu", () => ({ default: () => null }));

const entry = {
  id: "d1",
  slug: "open",
  title: "공개 일기",
  createdAt: "2026-01-02T00:00:00Z",
  visibility: "public" as const,
};

const post: Post = {
  ...entry,
  type: "diary",
  content: "일기 본문",
  categorySlug: null,
  updatedAt: "2026-01-02T00:00:00Z",
  imageKeys: [],
  thumbnailImageKey: null,
  viewCount: 0,
  commentCount: 0,
};

function open(slug: string) {
  return diaryEntry.default({ params: Promise.resolve({ slug }) });
}

beforeEach(() => {
  vi.mocked(getPreviewViewer).mockResolvedValue({ user: null, isAdmin: false });
  vi.mocked(getPublicDiaryIndex).mockResolvedValue([entry]);
  vi.mocked(getPostForRoute).mockResolvedValue(post);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("다이어리 상세", () => {
  it("빌드 때 만들지 않고 첫 요청 때 만들어 하루 캐시한다", () => {
    expect(diaryEntry.generateStaticParams()).toEqual([]);
    // false면 빌드 때 만든 경로만 열려 모든 다이어리 주소가 404가 된다.
    expect("dynamicParams" in diaryEntry).toBe(false);
    expect(diaryEntry.revalidate).toBe(86400);
  });

  it("방문자는 공개 다이어리도 본문을 읽지 않고 안내 화면만 본다", async () => {
    render(await open("open"));

    expect(screen.getByRole("heading", { name: "비공개 다이어리" })).toBeInTheDocument();
    expect(screen.queryByText("일기 본문")).not.toBeInTheDocument();
    expect(getPostForRoute).not.toHaveBeenCalled();
  });

  it("방문자가 목록에 없는 주소를 열면 404다", async () => {
    await expect(open("missing")).rejects.toThrow("NOT_FOUND");
  });

  it("관리자는 제목과 본문을 본다", async () => {
    vi.mocked(getPreviewViewer).mockResolvedValue({ user: null, isAdmin: true });

    render(await open("open"));

    expect(screen.getByRole("heading", { name: "공개 일기" })).toBeInTheDocument();
    expect(screen.getByText("일기 본문")).toBeInTheDocument();
  });

  it("목록으로 버튼은 다이어리 목록으로 가는 링크다", async () => {
    render(await open("open"));

    expect(screen.getByRole("link", { name: "← 목록으로" })).toHaveAttribute("href", "/diary");
  });
});
