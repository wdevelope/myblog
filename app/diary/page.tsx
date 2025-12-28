import Link from "next/link";
import { getPosts } from "@/lib/api";
import { Badge, ButtonLink, Card, CardBody } from "@/app/_components/ui";
import { requireAdmin } from "@/lib/server/admin";

export const metadata = {
  title: "일기",
};

export const dynamic = "force-dynamic";

export default async function DiaryPage() {
  await requireAdmin("/diary");
  const posts = await getPosts({ type: "diary" });
  const years = Array.from(
    new Set(posts.map((p) => new Date(p.createdAt).getFullYear())),
  ).sort((a, b) => b - a);
  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tight md:text-5xl">
            일기
          </h1>
          <p className="text-sm leading-6 text-muted">
            개인적인 생각, 하루 기록, 그리고 소소한 회고.
            <br className="hidden md:block" />
            <span className="text-xs font-bold uppercase tracking-wider opacity-70">
              인증된 세션
            </span>
          </p>
        </div>
        <ButtonLink href="/admin">새 일기 작성</ButtonLink>
      </header>

      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
          <span className="rounded-xl border border-border bg-surface px-3 py-1 text-xs font-semibold text-muted">
            연도: 전체
          </span>
          {years.slice(0, 3).map((y) => (
            <span
              key={y}
              className="rounded-xl border border-border bg-surface px-3 py-1 text-xs font-semibold text-muted"
            >
              {y}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted">
          <span>{posts.length}개</span>
          <span className="h-1 w-1 rounded-full bg-muted/60" />
          <Link href="/logout" className="hover:text-foreground">
            로그아웃
          </Link>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {posts.length ? (
          posts.map((post) => (
            <Card
              key={post.id}
              className="group overflow-hidden transition hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
            >
              <Link href={`/diary/${post.slug}`} className="block">
                <div className="relative h-48 w-full overflow-hidden bg-surface-2">
                  <div className="absolute left-4 top-4 z-10">
                    <Badge variant={post.visibility === "public" ? "success" : "warning"}>
                      {post.visibility === "public" ? "공개" : "비공개"}
                    </Badge>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-70 transition group-hover:opacity-60" />
                </div>
                <CardBody className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                    <span>{new Date(post.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <h3 className="text-lg font-bold leading-tight text-foreground transition group-hover:text-primary">
                    {post.title}
                  </h3>
                  <p className="line-clamp-3 text-sm leading-6 text-muted">
                    {post.content}
                  </p>
                </CardBody>
              </Link>
            </Card>
          ))
        ) : (
          <Card className="md:col-span-2 xl:col-span-3">
            <CardBody>
              <p className="text-sm text-muted">아직 일기가 없습니다.</p>
            </CardBody>
          </Card>
        )}
      </section>
    </div>
  );
}
