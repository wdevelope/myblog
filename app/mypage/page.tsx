import type { Metadata } from "next";
import { Badge, Card, CardBody } from "@/app/_components/ui";
import UserAvatar from "@/app/_components/UserAvatar";
import LogoutButton from "@/app/_components/LogoutButton";
import MyCommentList from "@/app/mypage/MyCommentList";
import NicknameForm from "@/app/mypage/NicknameForm";
import PasswordChangeForm from "@/app/mypage/PasswordChangeForm";
import DeleteAccountButton from "@/app/mypage/DeleteAccountButton";
import { getViewer, requireLogin } from "@/lib/server/admin";
import { getMyComments, getMyProfile } from "@/lib/server/account";
import { formatPostDate, userDisplayName } from "@/lib/utils";

export const metadata: Metadata = {
  title: "마이페이지",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function MyPage() {
  const user = await requireLogin("/mypage");
  const { isAdmin } = await getViewer();
  const [comments, profile] = await Promise.all([getMyComments(user.id), getMyProfile(user.id)]);
  const name = userDisplayName(user.id, isAdmin, profile.nickname);

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-2 sm:py-6">
      <h1 className="text-2xl font-black tracking-tight text-foreground">마이페이지</h1>

      <Card>
        <CardBody className="flex flex-wrap items-center gap-4">
          <UserAvatar isAdmin={isAdmin} label={name} className="size-16" />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-foreground">{name}</span>
              {isAdmin ? <Badge variant="primary">관리자</Badge> : null}
            </div>
            <p className="truncate text-sm text-muted">{user.email}</p>
            <p className="text-xs text-muted">가입일 {formatPostDate(user.created_at, "ko")}</p>
          </div>
          <LogoutButton className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-foreground transition hover:border-primary/40 hover:bg-surface-2" />
        </CardBody>
      </Card>

      {/* 관리자는 로고·Owen으로 고정이다(18절 결정 2). */}
      {isAdmin ? null : (
        <Card>
          <CardBody className="space-y-4">
            <h2 className="text-sm font-black tracking-tight text-foreground">프로필</h2>
            <NicknameForm current={profile.nickname} />
          </CardBody>
        </Card>
      )}

      <Card>
        <CardBody className="space-y-4">
          <h2 className="text-sm font-black tracking-tight text-foreground">
            내 댓글 {comments.length}개
          </h2>
          <MyCommentList comments={comments} />
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-4">
          <h2 className="text-sm font-black tracking-tight text-foreground">비밀번호 변경</h2>
          <PasswordChangeForm />
        </CardBody>
      </Card>

      {isAdmin ? null : (
        <Card>
          <CardBody className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-sm font-black tracking-tight text-foreground">회원 탈퇴</h2>
              <p className="text-xs text-muted">계정과 작성한 댓글이 모두 삭제되며 되돌릴 수 없어요.</p>
            </div>
            <DeleteAccountButton />
          </CardBody>
        </Card>
      )}
    </div>
  );
}
