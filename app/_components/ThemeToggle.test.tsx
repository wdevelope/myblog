// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "@/app/_components/ThemeToggle";

const mocks = vi.hoisted(() => ({
  setTheme: vi.fn(),
  theme: "system",
  resolvedTheme: "dark",
}));

vi.mock("next-themes", () => ({
  useTheme: () => mocks,
}));

afterEach(() => {
  cleanup();
  mocks.setTheme.mockClear();
});

describe("테마 버튼", () => {
  it("시스템 테마가 어두우면 첫 클릭에 밝은 테마로 바꾼다", () => {
    mocks.theme = "system";
    mocks.resolvedTheme = "dark";
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole("button", { name: "테마 변경" }));

    expect(mocks.setTheme).toHaveBeenCalledWith("light");
  });

  it("시스템 테마가 밝으면 첫 클릭에 어두운 테마로 바꾼다", () => {
    mocks.theme = "system";
    mocks.resolvedTheme = "light";
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole("button", { name: "테마 변경" }));

    expect(mocks.setTheme).toHaveBeenCalledWith("dark");
  });
});
