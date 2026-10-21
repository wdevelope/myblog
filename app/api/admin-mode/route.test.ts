import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, POST } from "@/app/api/admin-mode/route";

const mocks = vi.hoisted(() => ({
  assertAdmin: vi.fn(),
  enable: vi.fn(),
  disable: vi.fn(),
}));

vi.mock("next/headers", () => ({
  draftMode: async () => ({ enable: mocks.enable, disable: mocks.disable }),
}));

vi.mock("@/lib/server/admin", () => ({ assertAdmin: mocks.assertAdmin }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("관리자 화면(draft mode) 켜기·끄기", () => {
  it("관리자가 아니면 401을 돌려주고 draft mode를 켜지 않는다", async () => {
    mocks.assertAdmin.mockResolvedValue(null);

    const response = await POST();

    expect(response.status).toBe(401);
    expect(mocks.enable).not.toHaveBeenCalled();
  });

  it("관리자면 draft mode를 켠다", async () => {
    mocks.assertAdmin.mockResolvedValue({ id: "admin-1" });

    const response = await POST();

    expect(response.status).toBe(204);
    expect(mocks.enable).toHaveBeenCalledOnce();
  });

  it("끄기는 로그인 여부와 상관없이 draft mode를 끈다", async () => {
    const response = await DELETE();

    expect(response.status).toBe(204);
    expect(mocks.disable).toHaveBeenCalledOnce();
  });
});
