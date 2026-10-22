// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import ViewCount from "@/app/article/[slug]/ViewCount";

let fetchMock: Mock<typeof fetch>;

beforeEach(() => {
  sessionStorage.clear();
  fetchMock = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ viewCount: 1235 }));
  vi.stubGlobal("fetch", fetchMock);
});

// vitest globals가 꺼져 있어 Testing Library가 자동으로 정리하지 않는다.
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("아티클 조회수 표시", () => {
  it("생성 당시 수를 먼저 보이고, 마운트하면 한 번 세어 받은 수로 바꾼다", async () => {
    render(<ViewCount slug="post-abc123" initialCount={1234} />);

    expect(screen.getByText("조회수 1,234회")).toBeInTheDocument();
    expect(await screen.findByText("조회수 1,235회")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith("/api/views", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug: "post-abc123" }),
    });
  });

  it("같은 탭 세션에서 같은 글을 다시 열면 세지 않는다", async () => {
    const first = render(<ViewCount slug="post-abc123" initialCount={3} />);
    await screen.findByText("조회수 1,235회");
    first.unmount();

    render(<ViewCount slug="post-abc123" initialCount={3} />);
    render(<ViewCount slug="post-other" initialCount={0} />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({ slug: "post-other" });
  });

  it("세지 않은 응답(204)이면 생성 당시 수를 그대로 둔다", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    render(<ViewCount slug="post-abc123" initialCount={7} />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(screen.getByText("조회수 7회")).toBeInTheDocument();
  });

  it("요청이 실패해도 생성 당시 수를 그대로 둔다", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    render(<ViewCount slug="post-abc123" initialCount={7} />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(screen.getByText("조회수 7회")).toBeInTheDocument();
  });

  it("sessionStorage가 throw해도 깨지지 않고 수를 센다", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    expect(() => sessionStorage.getItem("x")).toThrow();

    render(<ViewCount slug="post-abc123" initialCount={1234} />);

    expect(await screen.findByText("조회수 1,235회")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
