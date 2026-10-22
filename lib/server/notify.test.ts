import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SITE_URL } from "@/lib/constants";
import {
  buildCommentEmail,
  buildGuestbookEmail,
  notifyNewComment,
  notifyNewGuestbookEntry,
  type NewCommentNotice,
} from "@/lib/server/notify";

const mocks = vi.hoisted(() => ({
  profile: null as { nickname: string | null } | null,
  fetch: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    from: () => ({
      select() { return this; },
      eq() { return this; },
      maybeSingle: async () => ({ data: mocks.profile, error: null }),
    }),
  }),
}));

const input: Omit<NewCommentNotice, "nickname"> = {
  post: { type: "blog", slug: "hello", title: "첫 글" },
  authorId: "8353737f-5798-4a1b-9c2d-000000000000",
  content: "좋은 글이에요",
  createdAt: "2026-01-01T15:30:00Z",
  isReply: false,
};
const notice: NewCommentNotice = { ...input, nickname: "테스트회원" };

describe("buildCommentEmail", () => {
  it("제목과 본문에 글 제목·주소·작성자·한국 시각·댓글을 넣는다", () => {
    const { subject, text } = buildCommentEmail(notice);

    expect(subject).toBe("[w-life] 새 댓글: 첫 글");
    expect(text).toContain("글: 첫 글");
    expect(text).toContain(`주소: ${SITE_URL}/article/hello`);
    expect(text).toContain("작성자: 테스트회원");
    expect(text).toContain("시각: 2026-01-02 00:30 (KST)");
    expect(text).toContain("좋은 글이에요");
  });

  it("답글이면 제목과 본문에 답글이라고 쓴다", () => {
    const { subject, text } = buildCommentEmail({ ...notice, isReply: true });

    expect(subject).toBe("[w-life] 새 답글: 첫 글");
    expect(text).toContain("새 답글이 달렸어요.");
  });

  it("닉네임이 없으면 사용자 id 앞 6자로 부른다", () => {
    expect(buildCommentEmail({ ...notice, nickname: null }).text).toContain("작성자: 사용자 835373");
  });

  it("피드 글은 상세 화면이 없어 피드 목록 주소를 쓴다", () => {
    const { text } = buildCommentEmail({ ...notice, post: { type: "feed", slug: "photo", title: "사진" } });
    expect(text).toContain(`주소: ${SITE_URL}/feed\n`);
  });

  it("500자를 넘는 댓글은 500자에서 자르고 말줄임표를 붙인다", () => {
    const exact = "가".repeat(500);
    expect(buildCommentEmail({ ...notice, content: exact }).text.endsWith(`\n${exact}`)).toBe(true);

    const long = `${"가".repeat(499)}😀😀`;
    expect(buildCommentEmail({ ...notice, content: long }).text.endsWith(`\n${"가".repeat(499)}😀…`)).toBe(true);
  });
});

describe("notifyNewComment", () => {
  beforeEach(() => {
    mocks.profile = { nickname: "테스트회원" };
    mocks.fetch.mockReset();
    mocks.fetch.mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", mocks.fetch);
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("COMMENT_NOTIFY_EMAIL", "owner@example.com");
    vi.stubEnv("COMMENT_NOTIFY_FROM", "");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("API 키가 없으면 보내지 않는다", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    await notifyNewComment(input);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("받는 주소가 없으면 보내지 않는다", async () => {
    vi.stubEnv("COMMENT_NOTIFY_EMAIL", "");
    await notifyNewComment(input);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("Resend에 text 본문만 담아 보낸다", async () => {
    await notifyNewComment(input);

    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = mocks.fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer re_test_key",
      "Content-Type": "application/json",
    });
    const body = JSON.parse(init.body as string);
    expect(body).toEqual({
      from: "w-life <onboarding@resend.dev>",
      to: "owner@example.com",
      subject: "[w-life] 새 댓글: 첫 글",
      text: buildCommentEmail(notice).text,
    });
    expect(body).not.toHaveProperty("html");
  });

  it("보내는 주소를 정하면 그 주소로 보낸다", async () => {
    vi.stubEnv("COMMENT_NOTIFY_FROM", "w-life <noti@example.com>");
    await notifyNewComment(input);

    const [, init] = mocks.fetch.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string).from).toBe("w-life <noti@example.com>");
  });

  it("프로필에 닉네임이 없으면 id 앞 6자로 부른다", async () => {
    mocks.profile = { nickname: null };
    await notifyNewComment(input);

    const [, init] = mocks.fetch.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string).text).toContain("작성자: 사용자 835373");
  });

  it("Resend가 오류로 답하면 기록만 하고 throw하지 않는다", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.fetch.mockResolvedValue(new Response('{"message":"invalid"}', { status: 422 }));

    await expect(notifyNewComment(input)).resolves.toBeUndefined();
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining("422"));
  });

  it("네트워크 오류가 나도 기록만 하고 throw하지 않는다", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.fetch.mockRejectedValue(new TypeError("fetch failed"));

    await expect(notifyNewComment(input)).resolves.toBeUndefined();
    expect(consoleError).toHaveBeenCalled();
  });
});

describe("방명록 알림 메일", () => {
  const guestbook = {
    authorId: "8353737f-5798-4a1b-9c2d-000000000000",
    nickname: "테스트회원",
    content: "다녀갑니다",
    createdAt: "2026-01-01T15:30:00Z",
    isSecret: false,
  };

  it("공개 방명록은 주소·작성자·한국 시각·내용을 넣는다", () => {
    const { subject, text } = buildGuestbookEmail(guestbook);

    expect(subject).toBe("[w-life] 새 방명록");
    expect(text).toContain(`주소: ${SITE_URL}/guestbook`);
    expect(text).toContain("작성자: 테스트회원");
    expect(text).toContain("시각: 2026-01-02 00:30 (KST)");
    expect(text).toContain("다녀갑니다");
  });

  it("비밀 방명록은 내용을 메일에 싣지 않는다", () => {
    const { subject, text } = buildGuestbookEmail({ ...guestbook, isSecret: true, content: "비밀 이야기" });

    expect(subject).toBe("[w-life] 새 방명록(비밀글)");
    expect(text).not.toContain("비밀 이야기");
    expect(text).toContain("관리자 화면에서 확인해 주세요.");
  });

  describe("notifyNewGuestbookEntry", () => {
    beforeEach(() => {
      mocks.profile = { nickname: "테스트회원" };
      mocks.fetch.mockReset();
      mocks.fetch.mockResolvedValue(new Response("{}", { status: 200 }));
      vi.stubGlobal("fetch", mocks.fetch);
      vi.stubEnv("RESEND_API_KEY", "re_test_key");
      vi.stubEnv("COMMENT_NOTIFY_EMAIL", "owner@example.com");
      vi.stubEnv("COMMENT_NOTIFY_FROM", "");
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.unstubAllEnvs();
    });

    it("키가 없으면 보내지 않는다", async () => {
      vi.stubEnv("RESEND_API_KEY", "");
      await notifyNewGuestbookEntry({ ...guestbook });
      expect(mocks.fetch).not.toHaveBeenCalled();
    });

    it("비밀 방명록도 내용 없이 text로만 보낸다", async () => {
      await notifyNewGuestbookEntry({ ...guestbook, isSecret: true, content: "비밀 이야기" });

      const [, init] = mocks.fetch.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(init.body as string);
      expect(body.subject).toBe("[w-life] 새 방명록(비밀글)");
      expect(body.text).not.toContain("비밀 이야기");
      expect(body).not.toHaveProperty("html");
    });
  });
});
