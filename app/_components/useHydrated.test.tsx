// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { act } from "react";
import { cleanup, renderHook, screen } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { useHydrated } from "@/app/_components/useHydrated";

function Probe() {
  return <span data-testid="probe">{useHydrated() ? "hydrated" : "server"}</span>;
}

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

describe("useHydrated", () => {
  it("서버 렌더에서는 false다", () => {
    expect(renderToString(<Probe />)).toContain("server");
  });

  it("브라우저에서 바로 그리면 처음부터 true다", () => {
    expect(renderHook(() => useHydrated()).result.current).toBe(true);
  });

  it("서버 HTML을 불일치 없이 hydration한 뒤에 true로 바뀐다", async () => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(<Probe />);
    document.body.append(container);
    const recoverableErrors: unknown[] = [];

    await act(async () => {
      hydrateRoot(container, <Probe />, {
        onRecoverableError: (error) => recoverableErrors.push(error),
      });
    });

    expect(recoverableErrors).toEqual([]);
    expect(screen.getByTestId("probe").textContent).toBe("hydrated");
  });
});
