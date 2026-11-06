// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { FeedCard } from "@/app/feed/FeedCard";
import type { Post } from "@/lib/types";

// 관리자 메뉴는 서버 액션을 끌고 온다. 여기서는 방문자 화면만 본다.
vi.mock("@/app/_components/PostActionMenu", () => ({ default: () => null }));

// vitest globals가 꺼져 있어 Testing Library가 자동으로 정리하지 않는다.
afterEach(cleanup);

const EXCERPT = "가".repeat(100);
const KEYS = ["a", "b", "c"].map((name) => `post-images-public:2026/11/${name}.jpg`);

const POST: Post = {
  id: "p1",
  slug: "feed-1",
  type: "feed",
  visibility: "public",
  title: "피드",
  content: EXCERPT,
  categorySlug: null,
  createdAt: "2026-11-06T00:00:00Z",
  updatedAt: "2026-11-06T00:00:00Z",
  imageKeys: [],
  thumbnailImageKey: null,
  viewCount: 0,
  commentCount: 0,
};

function renderCard({ imageKeys = [] as string[], hasMore = false } = {}) {
  return render(
    <FeedCard
      post={{ ...POST, imageKeys }}
      isAdmin={false}
      imageKeys={imageKeys}
      excerpt={EXCERPT}
      hasMore={hasMore}
      body={<p>펼친 본문</p>}
    />
  );
}

function photoCount(container: HTMLElement) {
  return container.querySelectorAll('img[data-nimg="fill"]').length;
}

describe("피드 카드 글", () => {
  it("더 보기가 없는 글은 두 줄로 자르지 않아 끝까지 읽힌다", () => {
    renderCard();

    expect(screen.getByText(EXCERPT)).not.toHaveClass("line-clamp-2");
    expect(screen.queryByRole("button", { name: "더 보기" })).not.toBeInTheDocument();
  });

  it("더 보기가 있으면 두 줄로 자르고 누르면 본문이 보인다", () => {
    renderCard({ hasMore: true });

    expect(screen.getByText(EXCERPT)).toHaveClass("line-clamp-2");
    fireEvent.click(screen.getByRole("button", { name: "더 보기" }));

    expect(screen.getByText("펼친 본문")).toBeInTheDocument();
  });
});

describe("피드 카드 사진", () => {
  it("넘겨받은 사진을 모두 그린다", () => {
    const { container } = renderCard({ imageKeys: KEYS });

    expect(photoCount(container)).toBe(3);
  });

  it("사진이 없으면 사진을 그리지 않는다", () => {
    const { container } = renderCard();

    expect(photoCount(container)).toBe(0);
  });
});
