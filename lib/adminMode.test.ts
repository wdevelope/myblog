import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { disableAdminMode, enableAdminMode } from "@/lib/adminMode";

let fetchMock: Mock<typeof fetch>;

beforeEach(() => {
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

  it("관리자가 아니라 거절되면 켜기는 false다", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));

    await expect(enableAdminMode()).resolves.toBe(false);
  });

  it("끄기를 요청하고 성공하면 true를 돌려준다", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(disableAdminMode()).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith("/api/admin-mode", { method: "DELETE" });
  });

  it("요청이 실패해도 throw하지 않고 false를 돌려준다", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));

    await expect(enableAdminMode()).resolves.toBe(false);
    await expect(disableAdminMode()).resolves.toBe(false);
  });
});
