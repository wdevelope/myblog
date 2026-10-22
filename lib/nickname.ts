import { z } from "zod";

// DB의 nickname_problem(20261022070000)과 같은 규칙이다. 최종 판정은 저장할 때 DB 제약이 하고, 여기는 바로 보이는 안내와
// 서버 액션 입력 검증용이다. 한쪽을 바꾸면 다른 쪽도 같이 바꾼다.
const NICKNAME_PATTERN = /^[가-힣A-Za-z0-9_]{2,12}$/;
const RESERVED_PATTERN = /(owen|오웬|관리자|운영자|admin)/i;

export type NicknameStatus = "ok" | "invalid" | "reserved" | "taken";

export const NICKNAME_MESSAGES: Record<NicknameStatus, string> = {
  ok: "사용할 수 있는 닉네임이에요.",
  invalid: "한글·영문·숫자·_로 2~12자만 쓸 수 있어요.",
  reserved: "운영자로 보일 수 있는 이름은 쓸 수 없어요.",
  taken: "이미 쓰는 닉네임이에요.",
};

export function nicknameProblem(name: string): "invalid" | "reserved" | null {
  if (!NICKNAME_PATTERN.test(name)) return "invalid";
  if (RESERVED_PATTERN.test(name)) return "reserved";
  return null;
}

export const nicknameSchema = z
  .string()
  .trim()
  .superRefine((name, ctx) => {
    const problem = nicknameProblem(name);
    if (problem) ctx.addIssue({ code: "custom", message: NICKNAME_MESSAGES[problem] });
  });
