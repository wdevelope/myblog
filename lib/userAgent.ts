// 검색·링크 미리보기 봇과 헤드리스 브라우저가 조회수에 섞이는 큰 몫만 덜어 낸다. 꾸민 User-Agent는 막지 못한다.
// 네이버(Yeti)·다음(Daum/) 수집기는 이름에 bot이 없어 따로 적는다.
const BOT_USER_AGENT = /bot|crawl|spider|slurp|yeti|daum\/|preview|headless|lighthouse|facebookexternalhit/i;

export function isBotUserAgent(userAgent: string | null | undefined) {
  // 브라우저는 늘 User-Agent를 보내므로 비어 있으면 스크립트로 본다.
  if (!userAgent?.trim()) return true;
  return BOT_USER_AGENT.test(userAgent);
}
