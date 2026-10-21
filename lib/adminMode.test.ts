// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { disableAdminMode, enableAdminMode, isAdminModeChecked } from "@/lib/adminMode";

let fetchMock: Mock<typeof fetch>;

beforeEach(() => {
  window.sessionStorage.clear();
  fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("관리자 화면(draft mode) 요청", () => {
  it("켜기를 요청하고 관리자로 받아들여지면 true를 돌려준다", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(enableAdminMode()).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith("/api/admin-mode", { method: "POST" });
  });

  it("관리자가 아니라 거절되면 false지만 이번 탭에서는 다시 묻지 않는다", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));

    await expect(enableAdminMode()).resolves.toBe(false);
    expect(isAdminModeChecked()).toBe(true);
  });

  it("끄기를 요청하면 다음 로그인 때 다시 묻는다", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await enableAdminMode();

    await disableAdminMode();

    expect(fetchMock).toHaveBeenLastCalledWith("/api/admin-mode", { method: "DELETE" });
    expect(isAdminModeChecked()).toBe(false);
  });

  it("요청이 실패해도 throw하지 않는다", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));

    await expect(enableAdminMode()).resolves.toBe(false);
  });
});
