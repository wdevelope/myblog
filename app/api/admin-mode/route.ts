import { draftMode } from "next/headers";
import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/server/admin";

export const runtime = "nodejs";

// 관리자만 draft mode를 켠다. 켜진 요청은 정적 캐시를 건너뛰고 비공개 글·관리 버튼이 섞인 화면을 렌더링한다.
export async function POST() {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  (await draftMode()).enable();
  return new NextResponse(null, { status: 204 });
}

// 로그아웃할 때 부른다. 꺼도 잃는 권한이 없으므로 로그인 확인을 하지 않는다.
export async function DELETE() {
  (await draftMode()).disable();
  return new NextResponse(null, { status: 204 });
}
