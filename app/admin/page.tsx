import Link from "next/link";
import { getPosts } from "@/lib/api";
import AdminEditor from "@/app/admin/AdminEditor";
import { Badge, Card, CardBody, ButtonLink } from "@/app/_components/ui";
import { requireAdmin } from "@/lib/server/admin";

export const metadata = {
  title: "관리",
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdmin("/admin");

  const [blog, feed, diary] = await Promise.all([
    getPosts({ type: "blog" }),
    getPosts({ type: "feed" }),
    getPosts({ type: "diary" }),
  ]);

  function typeLabel(type: string) {
    if (type === "blog") return "블로그";
    if (type === "feed") return "피드";
    if (type === "diary") return "일기";
    return type;
  }

  function visibilityLabel(visibility: string) {
    return visibility === "public" ? "공개" : "비공개";
  }

  const recent = [...blog.slice(0, 3), ...feed.slice(0, 2), ...diary.slice(0, 1)]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 6);

  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tight">대시보드</h1>
          <p className="text-sm text-muted">
            오늘의 사이트 현황과 주요 지표입니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-foreground hover:bg-surface-2">
            ↻ 새로고침
          </button>
          <ButtonLink href="#editor">새 글 작성</ButtonLink>
          <Link
            href="/logout"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-foreground hover:bg-surface-2"
          >
            로그아웃
          </Link>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardBody className="space-y-2">
            <p className="text-sm font-medium text-muted">전체 글</p>
            <p className="text-3xl font-black tracking-tight text-foreground">
              {blog.length + feed.length + diary.length}
            </p>
            <p className="text-sm text-muted">전체 글 수</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="space-y-2">
            <p className="text-sm font-medium text-muted">블로그</p>
            <p className="text-3xl font-black tracking-tight text-foreground">
              {blog.length}
            </p>
            <p className="text-sm text-muted">블로그 글</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="space-y-2">
            <p className="text-sm font-medium text-muted">피드</p>
            <p className="text-3xl font-black tracking-tight text-foreground">
              {feed.length}
            </p>
            <p className="text-sm text-muted">피드</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="space-y-2">
            <p className="text-sm font-medium text-muted">일기</p>
            <p className="text-3xl font-black tracking-tight text-foreground">
              {diary.length}
            </p>
            <p className="text-sm text-muted">다이어리</p>
          </CardBody>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Card>
            <CardBody className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground">
                  최근 활동
                </h2>
                <Link href="/blog" className="text-sm font-semibold text-primary">
                  전체 보기
                </Link>
              </div>
              <div className="overflow-hidden rounded-xl border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-2 text-xs uppercase tracking-wider text-muted">
                    <tr>
                      <th className="px-4 py-3">제목</th>
                      <th className="px-4 py-3">종류</th>
                      <th className="px-4 py-3">날짜</th>
                      <th className="px-4 py-3">공개</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((p) => (
                      <tr key={p.id} className="border-t border-border">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-foreground">
                            {p.title}
                          </p>
                          <p className="text-xs text-muted">ID: {p.id}</p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="default">{typeLabel(p.type)}</Badge>
                        </td>
                        <td className="px-4 py-3 text-muted">
                          {new Date(p.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={p.visibility === "public" ? "success" : "warning"}
                          >
                            {visibilityLabel(p.visibility)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    {!recent.length ? (
                      <tr>
                        <td className="px-4 py-6 text-muted" colSpan={4}>
                          아직 활동이 없어요.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="lg:col-span-5">
          <Card>
            <CardBody className="space-y-4">
              <h2 className="text-lg font-bold text-foreground">바로가기</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <Link
                  href="/blog"
                  className="rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-foreground hover:bg-surface-2"
                >
                  블로그
                </Link>
                <Link
                  href="/feed"
                  className="rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-foreground hover:bg-surface-2"
                >
                  피드
                </Link>
                <Link
                  href="/diary"
                  className="rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-foreground hover:bg-surface-2"
                >
                  일기
                </Link>
                <Link
                  href="#editor"
                  className="rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-foreground hover:bg-surface-2"
                >
                  글쓰기
                </Link>
              </div>
            </CardBody>
          </Card>
        </div>
      </section>

      <section id="editor" className="scroll-mt-24">
        <AdminEditor />
      </section>
    </div>
  );
}
