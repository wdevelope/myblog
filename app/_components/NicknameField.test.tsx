// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import NicknameField from "@/app/_components/NicknameField";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  onVerified: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({ rpc: mocks.rpc }),
}));

function Harness() {
  const [value, setValue] = useState("");
  return (
    <NicknameField id="nickname" value={value} onChange={setValue} onVerified={mocks.onVerified} />
  );
}

beforeEach(() => {
  mocks.rpc.mockReset();
  mocks.onVerified.mockReset();
});

// vitest globals가 꺼져 있어 Testing Library가 자동으로 정리하지 않는다.
afterEach(cleanup);

function type(value: string) {
  fireEvent.change(screen.getByLabelText("닉네임"), { target: { value } });
}

describe("닉네임 중복확인", () => {
  it("규칙에 어긋나면 서버에 묻지 않고 이유를 보인다", async () => {
    render(<Harness />);

    type("Owen_1");
    fireEvent.click(screen.getByRole("button", { name: "중복확인" }));

    expect(await screen.findByText("운영자로 보일 수 있는 이름은 쓸 수 없어요.")).toBeInTheDocument();
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.onVerified).toHaveBeenLastCalledWith(null);
  });

  it("쓸 수 있으면 확인한 닉네임(앞뒤 공백 제외)을 알리고, 글자를 바꾸면 결과를 지운다", async () => {
    mocks.rpc.mockResolvedValue({ data: "ok", error: null });
    render(<Harness />);

    type(" 테스트회원 ");
    fireEvent.click(screen.getByRole("button", { name: "중복확인" }));

    expect(await screen.findByText("사용할 수 있는 닉네임이에요.")).toBeInTheDocument();
    expect(mocks.rpc).toHaveBeenCalledWith("check_nickname", { name: "테스트회원" });
    expect(mocks.onVerified).toHaveBeenLastCalledWith("테스트회원");

    type("테스트회원2");
    expect(screen.queryByText("사용할 수 있는 닉네임이에요.")).not.toBeInTheDocument();
  });

  it("이미 쓰는 닉네임이면 알리지 않고 안내한다", async () => {
    mocks.rpc.mockResolvedValue({ data: "taken", error: null });
    render(<Harness />);

    type("테스트회원");
    fireEvent.click(screen.getByRole("button", { name: "중복확인" }));

    expect(await screen.findByText("이미 쓰는 닉네임이에요.")).toBeInTheDocument();
    expect(mocks.onVerified).toHaveBeenLastCalledWith(null);
  });
});
