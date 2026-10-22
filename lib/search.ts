// 헤더·모바일 메뉴 입력 칸(클라이언트)과 검색 조회(서버)가 함께 쓰므로 server-only로 두지 않는다.
export const SEARCH_QUERY_MAX_LENGTH = 50;

const SEARCH_COLUMNS = ["title", "content"] as const;

// ?q=a&q=b처럼 여러 번 오면 첫 값만 본다. 붙여 넣은 줄바꿈·제어 문자는 공백 하나로 접는다.
export function normalizeSearchQuery(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string") return "";

  const collapsed = value.replace(/[\s\p{Cc}]+/gu, " ").trim();
  // 서로게이트 쌍을 가르지 않게 코드 포인트로 자른다(가른 반쪽은 URL·DB에서 깨진다).
  return Array.from(collapsed).slice(0, SEARCH_QUERY_MAX_LENGTH).join("").trimEnd();
}

// ilike는 PostgREST가 값의 *를 모두 %로 바꿔 *를 글자로 찾을 수 없다(`**`가 거의 모든 글에 맞는다).
// 그래서 정규식(imatch, Postgres `~*`)을 쓰고 메타 문자를 막는다. 영숫자 앞의 \는 \d 같은 이스케이프가
// 되므로 ASCII 문장 부호만 막는다(그 밖의 글자 앞 \는 글자 그대로다).
function toRegexLiteral(query: string) {
  return query.replace(/[!-/:-@[-`{-~]/g, "\\$&");
}

// or=(...) 안에서는 쉼표·괄호·마침표·콜론이 문법이라 값을 큰따옴표로 감싸고, 그 안의 " \는 \로 막는다.
function quoteLogicValue(value: string) {
  return `"${value.replace(/["\\]/g, "\\$&")}"`;
}

// PostgREST `or` 매개변수 값. 제목 또는 본문 부분 일치(대소문자 무시).
export function buildSearchFilter(query: string): string {
  const value = quoteLogicValue(toRegexLiteral(query));
  return `(${SEARCH_COLUMNS.map((column) => `${column}.imatch.${value}`).join(",")})`;
}
