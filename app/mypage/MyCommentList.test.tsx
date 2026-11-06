// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import MyCommentList from "@/app/mypage/MyCommentList";
import { deleteComment } from "@/lib/actions/comments";
import { ACTION_FAILED } from "@/lib/constants";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

vi.mock("@/lib/actions/comments", () => ({ deleteComment: vi.fn() }));

// vitest globals가 꺼져 있어 Testing Library가 자동으로 정리하지 않는다.
afterEach(cleanup);

describe("내 댓글 삭제", () => {
  it("요청이 끊기면 토스트로 알린다", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(deleteComment).mockRejectedValue(new TypeError("Failed to fetch"));
    render(
      <MyCommentList
        comments={[{ id: "c1", content: "내 댓글", createdAt: "2026-11-01T00:00:00Z", isReply: false, post: null }]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "삭제" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(ACTION_FAILED.error));
  });
});
