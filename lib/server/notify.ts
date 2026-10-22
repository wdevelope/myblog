import "server-only";
import { postHref, SITE_URL } from "@/lib/constants";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PostType } from "@/lib/types";
import { userDisplayName } from "@/lib/utils";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
// 도메인 인증 전에는 Resend 공용 주소로만 보낼 수 있다(받는 사람은 Resend 가입 주소로 한정).
const DEFAULT_FROM = "w-life <onboarding@resend.dev>";
const EXCERPT_LENGTH = 500;

export type NewCommentNotice = {
  post: { type: PostType; slug: string; title: string };
  authorId: string;
  nickname: string | null;
  content: string;
  createdAt: string;
  isReply: boolean;
};

// 댓글은 사용자 입력이라 HTML 본문에 넣지 않고 text로만 보낸다.
export function buildCommentEmail(notice: NewCommentNotice) {
  const kind = notice.isReply ? "새 답글" : "새 댓글";
  // 코드 포인트로 잘라 이모지 같은 서로게이트 쌍이 반으로 갈리지 않게 한다.
  const chars = Array.from(notice.content);
  const excerpt =
    chars.length > EXCERPT_LENGTH ? `${chars.slice(0, EXCERPT_LENGTH).join("")}…` : notice.content;
  // 서버(Vercel)는 UTC라 시간대를 정해 준다.
  const createdAt = new Date(notice.createdAt).toLocaleString("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return {
    subject: `[w-life] ${kind}: ${notice.post.title}`,
    text: [
      `${kind}이 달렸어요.`,
      "",
      `글: ${notice.post.title}`,
      `주소: ${SITE_URL}${postHref(notice.post.type, notice.post.slug)}`,
      `작성자: ${userDisplayName(notice.authorId, false, notice.nickname)}`,
      `시각: ${createdAt} (KST)`,
      "",
      excerpt,
    ].join("\n"),
  };
}

// 키나 받는 주소가 없으면(개발 서버·테스트) 보내지 않는다.
function readMailConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.COMMENT_NOTIFY_EMAIL;
  if (!apiKey || !to) return null;
  return { apiKey, to, from: process.env.COMMENT_NOTIFY_FROM || DEFAULT_FROM };
}

// 댓글 저장이 끝난 뒤 after()에서 부른다. 알림은 부가 기능이라 실패해도 throw하지 않고 기록만 남긴다.
export async function notifyNewComment(notice: Omit<NewCommentNotice, "nickname">) {
  const config = readMailConfig();
  if (!config) return;

  try {
    // profiles는 누구나 읽을 수 있어 RLS 클라이언트로 충분하다.
    const supabase = await createSupabaseServerClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("nickname")
      .eq("id", notice.authorId)
      .maybeSingle();
    const { subject, text } = buildCommentEmail({ ...notice, nickname: profile?.nickname ?? null });

    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: config.from, to: config.to, subject, text }),
      // Resend가 응답하지 않으면 서버 함수가 최대 실행 시간까지 붙잡혀 있게 된다.
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      console.error(`[notify] 댓글 알림 메일 실패: ${response.status} ${await response.text()}`);
    }
  } catch (e) {
    console.error("[notify] 댓글 알림 메일 실패", e);
  }
}
