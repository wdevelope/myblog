import "server-only";

export const DB_FAILURE_MESSAGE = "요청을 처리하지 못했어요. 잠시 뒤 다시 시도해 주세요.";

// DB·Storage 오류 원문에는 표·열·제약 이름이 들어 있어 브라우저로 보내지 않는다. 원인은 서버 로그에서 본다.
export function dbFailure(context: string, error: { message: string }, notice = "") {
  console.error(`${context}:`, error.message);
  return { success: false as const, error: `${DB_FAILURE_MESSAGE}${notice}` };
}
