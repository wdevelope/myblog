// @vitest-environment jsdom
import { act } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DiaryIndexClient from "@/app/diary/DiaryIndexClient";

const nav = vi.hoisted(() => ({ search: "" }));

vi.mock("next/navigation", () => ({
  usePathname: () => "/diary",
  useSearchParams: () => new URLSearchParams(nav.search),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/lib/actions/posts", () => ({ deletePost: vi.fn() }));

const POSTS = [
  { id: "1", slug: "a", title: "삼월의 글", createdAt: "2026-03-05T03:00:00Z", visibility: "public" as const },
  { id: "2", slug: "b", title: "사월의 글", createdAt: "2026-04-10T03:00:00Z", visibility: "public" as const },
];

function renderDiary() {
  return render(<DiaryIndexClient posts={POSTS} isAdmin={false} />);
}

beforeEach(() => {
  vi.useFakeTimers({ now: new Date("2026-04-15T03:00:00Z"), toFake: ["Date"] });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  sessionStorage.clear();
  nav.search = "";
  document.body.innerHTML = "";
});

describe("다이어리 목록의 보는 달", () => {
  it("주소에 달이 없으면 이번 달을 보이고 주소를 바꾸지 않는다", () => {
    const replaceState = vi.spyOn(window.history, "replaceState");

    renderDiary();

    expect(screen.getByText("2026년 4월")).toBeTruthy();
    expect(screen.getByText("사월의 글")).toBeTruthy();
    expect(screen.queryByText("삼월의 글")).toBeNull();
    expect(replaceState).not.toHaveBeenCalled();
  });

  it("주소의 달과 날짜를 그대로 보인다", () => {
    nav.search = "year=2026&month=3&date=2026-03-05";

    renderDiary();

    expect(screen.getByText("2026년 3월")).toBeTruthy();
    expect(screen.getByText("삼월의 글")).toBeTruthy();
    expect(screen.getByRole("button", { name: "전체 보기" })).toBeTruthy();
  });

  it("주소에 달이 없으면 이 탭에서 마지막으로 본 달로 돌아간다", () => {
    sessionStorage.setItem("diary_view", "year=2026&month=3");

    renderDiary();

    expect(screen.getByText("2026년 3월")).toBeTruthy();
    expect(screen.getByText("삼월의 글")).toBeTruthy();
  });

  it("서버 HTML은 저장된 달을 모르므로 hydration 뒤에 바꾼다", async () => {
    sessionStorage.setItem("diary_view", "year=2026&month=3");
    const tree = <DiaryIndexClient posts={POSTS} isAdmin={false} />;
    const container = document.createElement("div");
    document.body.appendChild(container);
    container.innerHTML = renderToString(tree);
    expect(container.textContent).toContain("2026년 4월");

    const onRecoverableError = vi.fn();
    let root: ReturnType<typeof hydrateRoot>;
    await act(async () => {
      root = hydrateRoot(container, tree, { onRecoverableError });
    });

    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(container.textContent).toContain("2026년 3월");
    await act(async () => root.unmount());
  });

  it("다음 달로 넘기면 주소와 탭 저장소에 쓰고 서버에 다시 요청하지 않는다", () => {
    const replaceState = vi.spyOn(window.history, "replaceState");
    renderDiary();

    fireEvent.click(screen.getByRole("button", { name: "다음 달" }));

    expect(replaceState).toHaveBeenCalledWith(null, "", "/diary?year=2026&month=5");
    expect(sessionStorage.getItem("diary_view")).toBe("year=2026&month=5");
  });

  it("같은 날짜를 다시 누르면 선택을 푼다", () => {
    nav.search = "year=2026&month=3&date=2026-03-05";
    const replaceState = vi.spyOn(window.history, "replaceState");
    renderDiary();

    const day = screen.getByRole("button", { name: "2026년 3월 5일, 다이어리 있음" });
    expect(day).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(day);

    expect(replaceState).toHaveBeenCalledWith(null, "", "/diary?year=2026&month=3");
  });
});
