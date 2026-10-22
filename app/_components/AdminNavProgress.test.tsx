// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import AdminNavProgress from "@/app/_components/AdminNavProgress";

const mocks = vi.hoisted(() => ({ pathname: "/article" }));

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
  useSearchParams: () => new URLSearchParams(),
}));

// next/link는 앱 라우터 없이 그릴 수 없어 일반 링크로 클릭만 흉내 낸다.
const TARGET = "/article/post-1";

function Page() {
  return (
    <>
      <AdminNavProgress />
      <a href={TARGET}>글</a>
    </>
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  mocks.pathname = "/article";
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("관리자 화면 이동 표시", () => {
  it("다른 화면 링크를 누르고 150ms가 지나면 막대가 보이고, 주소가 바뀌면 사라진다", () => {
    const { rerender } = render(<Page />);

    fireEvent.click(screen.getByText("글"));
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(150));
    expect(screen.getByRole("progressbar")).toBeInTheDocument();

    mocks.pathname = TARGET;
    rerender(<Page />);
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("150ms 안에 이동이 끝나면 막대를 띄우지 않는다", () => {
    const { rerender } = render(<Page />);

    fireEvent.click(screen.getByText("글"));
    act(() => vi.advanceTimersByTime(100));
    mocks.pathname = TARGET;
    rerender(<Page />);
    act(() => vi.advanceTimersByTime(500));

    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });
});
