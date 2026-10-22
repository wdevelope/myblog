import { describe, expect, it } from "vitest";
import { nicknameProblem } from "@/lib/nickname";

describe("닉네임 규칙", () => {
  it("한글·영문·숫자·_로 2~12자만 받는다", () => {
    expect(nicknameProblem("테스트_1")).toBeNull();
    expect(nicknameProblem("ab")).toBeNull();
    expect(nicknameProblem("가나다라마바사아자차카타")).toBeNull();
    expect(nicknameProblem("a")).toBe("invalid");
    expect(nicknameProblem("가나다라마바사아자차카타파")).toBe("invalid");
    expect(nicknameProblem("홍 길동")).toBe("invalid");
    expect(nicknameProblem("hi!")).toBe("invalid");
    expect(nicknameProblem("😀😀")).toBe("invalid");
  });

  it("운영자로 보일 수 있는 말이 들어가면 대소문자와 상관없이 막는다", () => {
    expect(nicknameProblem("Owen_1")).toBe("reserved");
    expect(nicknameProblem("bOWEN")).toBe("reserved");
    expect(nicknameProblem("오웬팬")).toBe("reserved");
    expect(nicknameProblem("관리자님")).toBe("reserved");
    expect(nicknameProblem("운영자")).toBe("reserved");
    expect(nicknameProblem("ADMIN2")).toBe("reserved");
  });
});
