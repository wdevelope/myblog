// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import CategorySettingsModal from "./CategorySettingsModal";
import { getCategories, updateCategory } from "@/lib/actions/categories";

const { refresh, shownToasts } = vi.hoisted(() => ({
  refresh: vi.fn(),
  shownToasts: [] as string[],
}));

vi.mock("@/lib/actions/categories", () => ({
  getCategories: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
  reorderCategory: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

// 사용자에게 실제로 보일 최종 문구만 모은다. 로딩 문구는 결과에 따라 바뀌지 않아 뺀다.
vi.mock("sonner", () => ({
  toast: {
    error: (message: string) => {
      shownToasts.push(message);
    },
    promise: (
      promise: Promise<unknown>,
      data: {
        success?: string | ((value: unknown) => string);
        error?: (err: Error) => string;
      }
    ) => {
      promise.then(
        (value) => {
          if (data.success === undefined) return;
          shownToasts.push(
            typeof data.success === "function" ? data.success(value) : data.success
          );
        },
        (err: Error) => {
          if (data.error) shownToasts.push(data.error(err));
        }
      );
    },
  },
}));

beforeAll(() => {
  // jsdom은 <dialog>의 showModal·close를 구현하지 않는다. 브라우저처럼 open 속성을 바꾸고 close 이벤트를 보낸다.
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    if (!this.hasAttribute("open")) return;
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

beforeEach(() => {
  shownToasts.length = 0;
  refresh.mockReset();
  vi.mocked(getCategories).mockReset().mockResolvedValue({
    success: true,
    categories: [{ slug: "개발", visibility: "public", sortOrder: 0, inUse: 2 }],
  });
  vi.mocked(updateCategory).mockReset().mockResolvedValue({ success: true, slug: "개발" });
});

afterEach(() => {
  cleanup();
});

async function openModal() {
  fireEvent.click(screen.getByRole("button", { name: "카테고리 설정" }));
  await screen.findByText("개발");
}

describe("CategorySettingsModal 쓰기 흐름", () => {
  it("이름을 바꾸면 액션을 부른 뒤 목록과 서버 화면을 새로고침하고 완료를 알린다", async () => {
    render(<CategorySettingsModal />);
    await openModal();

    fireEvent.click(screen.getByRole("button", { name: "이름 변경" }));
    fireEvent.change(screen.getByDisplayValue("개발"), {
      target: { value: "프론트엔드" },
    });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(updateCategory).toHaveBeenCalledWith("개발", { slug: "프론트엔드" });
    expect(getCategories).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(shownToasts).toEqual(["카테고리 이름 변경 완료"]));
    expect(screen.queryByRole("button", { name: "저장" })).not.toBeInTheDocument();
  });

  it("공개 범위를 바꾸면 액션을 부른 뒤 목록과 서버 화면을 새로고침한다", async () => {
    render(<CategorySettingsModal />);
    await openModal();

    fireEvent.change(screen.getByRole("combobox", { name: "공개 범위" }), {
      target: { value: "private" },
    });

    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(updateCategory).toHaveBeenCalledWith("개발", { visibility: "private" });
    expect(getCategories).toHaveBeenCalledTimes(2);
    expect(shownToasts).toEqual([]);
  });

  it("공개 범위 변경이 실패하면 실패만 알리고 새로고침하지 않는다", async () => {
    vi.mocked(updateCategory).mockResolvedValue({ success: false, error: "not_found" });
    render(<CategorySettingsModal />);
    await openModal();

    fireEvent.change(screen.getByRole("combobox", { name: "공개 범위" }), {
      target: { value: "private" },
    });

    await waitFor(() =>
      expect(shownToasts).toEqual(["카테고리 공개 범위 변경에 실패했어요."])
    );
    expect(refresh).not.toHaveBeenCalled();
    expect(getCategories).toHaveBeenCalledTimes(1);
  });
});

// 브라우저는 ESC에 cancel 이벤트를 보내고, 막히지 않으면 컴포넌트의 close 함수를 거치지 않고 대화상자를 닫는다.
function pressEscape() {
  const dialog = screen.getByRole<HTMLDialogElement>("dialog");
  if (fireEvent(dialog, new Event("cancel", { cancelable: true }))) {
    act(() => dialog.close());
  }
}

describe("CategorySettingsModal 닫기", () => {
  it.each<[string, () => void]>([
    ["ESC로", pressEscape],
    ["닫기 버튼으로", () => fireEvent.click(screen.getByRole("button", { name: "닫기" }))],
  ])("%s 닫았다가 다시 열면 편집 중이던 이름 변경이 남아 있지 않다", async (_how, closeModal) => {
    render(<CategorySettingsModal />);
    await openModal();
    fireEvent.click(screen.getByRole("button", { name: "이름 변경" }));
    fireEvent.change(screen.getByDisplayValue("개발"), {
      target: { value: "임시 이름" },
    });

    closeModal();
    await openModal();

    expect(screen.queryByDisplayValue("임시 이름")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "저장" })).not.toBeInTheDocument();
  });
});
