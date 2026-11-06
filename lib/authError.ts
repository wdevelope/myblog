const MESSAGES: Record<string, string> = {
  invalid_credentials: "이메일이나 비밀번호가 맞지 않아요.",
  email_not_confirmed: "메일의 인증 링크를 먼저 눌러 주세요.",
  user_already_exists: "이미 가입한 이메일이에요.",
  email_exists: "이미 가입한 이메일이에요.",
  email_address_invalid: "이메일 주소를 확인해 주세요.",
  same_password: "지금 쓰는 비밀번호와 다른 비밀번호를 입력해 주세요.",
  weak_password: "비밀번호가 너무 쉬워요. 더 길고 복잡하게 입력해 주세요.",
  over_email_send_rate_limit: "메일을 너무 자주 보냈어요. 잠시 뒤 다시 시도해 주세요.",
  over_request_rate_limit: "요청이 너무 많아요. 잠시 뒤 다시 시도해 주세요.",
};

// Supabase Auth 오류는 영어 문구로 온다. 코드로 바꿔 보이고, 모르는 코드는 원문 대신 일반 문구를 보인다.
export function authErrorMessage(code: string | undefined) {
  return (code && MESSAGES[code]) || "요청을 처리하지 못했어요. 잠시 뒤 다시 시도해 주세요.";
}
