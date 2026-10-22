import { draftMode } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getPublicPost } from "@/lib/server/publicPosts";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { isBotUserAgent } from "@/lib/userAgent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 글 slug는 createPost가 `post-<16진수>`로 만든다. 다른 문자는 조회·RPC에 넘기기 전에 거른다.
const bodySchema = z.object({
  slug: z.string().max(100).regex(/^[A-Za-z0-9_-]+$/),
});

// 조회수는 요청마다 달라 CDN·브라우저가 응답을 다시 쓰면 안 된다.
const NO_STORE = { "Cache-Control": "no-store" };

// 아티클 상세(정적·ISR)가 마운트된 뒤 한 번 부른다. 센 뒤의 조회수를 돌려준다.
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_slug" }, { status: 400, headers: NO_STORE });
  }

  // 관리자 화면에서 본 것과 봇은 방문자 조회가 아니다. 글이 있는지 보기 전에 답해 slug 존재를 흘리지 않는다.
  if ((await draftMode()).isEnabled || isBotUserAgent(request.headers.get("user-agent"))) {
    return new NextResponse(null, { status: 204, headers: NO_STORE });
  }

  // increment_post_view는 공개 여부를 보지 않으므로 anon 키 조회(RLS)로 공개 아티클인지 먼저 확인한다.
  // 비공개 글과 없는 글은 같은 404라 존재를 흘리지 않는다. 상세 페이지와 같은 공개 캐시를 써서 DB를 다시 읽지 않는다.
  const post = await getPublicPost("blog", parsed.data.slug);
  if (!post) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
  }

  // 방문자 요청에 service role을 쓰는 예외다. RLS로 공개 아티클임을 확인한 slug로 조회수 함수만 부른다.
  const { data, error } = await createSupabaseServiceClient().rpc("increment_post_view", {
    p_slug: post.slug,
  });
  if (error) {
    return NextResponse.json({ error: "increment_failed" }, { status: 502, headers: NO_STORE });
  }
  return NextResponse.json({ viewCount: Number(data) }, { headers: NO_STORE });
}
