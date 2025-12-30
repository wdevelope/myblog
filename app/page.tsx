import Link from "next/link";
import { getPosts } from "@/lib/api";
import { getCurrentUser, isAdminDb } from "@/lib/server/admin";
import { Badge, ButtonLink, Card, CardBody } from "@/app/_components/ui";
import LogoutButton from "@/app/_components/LogoutButton";

export default function Home() {
  // kept as server component without data to avoid extra load in local dev
  return <HomePage />;
}

export const dynamic = "force-dynamic";

function postTypeLabel(type: string) {
  if (type === "blog") return "아티클";
  if (type === "feed") return "피드";
  if (type === "diary") return "일기";
  return type.toUpperCase();
}

function visibilityLabel(visibility: string) {
  return visibility === "public" ? "공개" : "비공개";
}

async function HomePage() {
  const user = await getCurrentUser();
  const loggedIn = Boolean(user);
  const isAdmin = await isAdminDb(user);
  const [blog, feed] = await Promise.all([
    getPosts({ type: "blog" }),
    getPosts({ type: "feed" }),
  ]);
  const latest = [...blog.slice(0, 2), ...feed.slice(0, 2)].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );

  return (
    <div className="space-y-10">
      <section className="grid items-center gap-8 md:grid-cols-2">
        <div className="space-y-5">
          <h1 className="text-4xl font-black leading-tight tracking-tight md:text-5xl">
            안녕하세요. <br />
            기록하는 사람입니다.
          </h1>
          <p className="max-w-xl text-sm leading-6 text-muted">
            인생이야기를 기록합니다.
          </p>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/article">최신 글 보기 →</ButtonLink>
            <ButtonLink href="/feed" variant="secondary">
              피드 보기
            </ButtonLink>
            {isAdmin ? (
              <>
                <ButtonLink href="/article/write" variant="secondary">
                  아티클 쓰기
                </ButtonLink>
                <ButtonLink href="/feed/write" variant="secondary">
                  피드 쓰기
                </ButtonLink>
                <ButtonLink href="/diary/write" variant="secondary">
                  일기 쓰기
                </ButtonLink>
              </>
            ) : loggedIn ? (
              <LogoutButton className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-surface px-4 text-sm font-bold text-foreground transition hover:bg-surface-2">
                로그아웃
              </LogoutButton>
            ) : (
              <ButtonLink href="/login" variant="secondary">
                로그인
              </ButtonLink>
            )}
          </div>
        </div>

        <Card className="overflow-hidden">
          <div className="relative aspect-[16/10] bg-[radial-gradient(60%_60%_at_50%_40%,rgba(19,91,236,0.45)_0%,rgba(147,51,234,0.25)_55%,rgba(16,22,34,0)_100%)]">
            <div className="absolute inset-0 bg-gradient-to-tr from-background via-transparent to-surface opacity-60" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="rounded-2xl bg-surface/20 px-6 py-4 text-center ring-1 ring-border backdrop-blur">
                <p className="text-sm font-semibold text-foreground">
                  피드 · 아티클 · 일기
                </p>
                <p className="mt-1 text-xs text-muted">
                  게시글 공개 범위 · 마크다운
                </p>
              </div>
            </div>
          </div>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4 border-b border-border pb-3">
          <div className="flex items-center gap-5">
            <Link
              href="/"
              className="border-b-2 border-primary pb-3 text-sm font-bold text-primary"
            >
              최신
            </Link>
            <Link
              href="/article"
              className="pb-3 text-sm font-medium text-muted"
            >
              아티클
            </Link>
            <Link href="/feed" className="pb-3 text-sm font-medium text-muted">
              피드
            </Link>
            <Link href="/diary" className="pb-3 text-sm font-medium text-muted">
              일기
            </Link>
          </div>
        </div>

        <div className="space-y-4">
          {latest.map((post) => {
            const href =
              post.type === "blog"
                ? `/article/${post.slug}`
                : post.type === "feed"
                ? `/feed/${post.slug}`
                : `/diary/${post.slug}`;

            return (
              <Card
                key={post.id}
                className="overflow-hidden transition hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
              >
                <CardBody className="flex flex-col gap-4 md:flex-row md:items-stretch">
                  <div className="flex flex-1 flex-col justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-muted">
                      <Badge variant="primary">
                        {postTypeLabel(post.type)}
                      </Badge>
                      <span>•</span>
                      <span>{new Date(post.createdAt).toLocaleString()}</span>
                      <span className="flex-1" />
                      <span className="text-muted">
                        {visibilityLabel(post.visibility)}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <Link
                        href={href}
                        className="text-xl font-bold leading-tight text-foreground hover:text-primary"
                      >
                        {post.title}
                      </Link>
                      <p className="line-clamp-3 text-sm leading-6 text-muted">
                        {post.content}
                      </p>
                    </div>
                    <div className="pt-1">
                      <Link
                        href={href}
                        className="text-sm font-bold text-primary hover:opacity-90"
                      >
                        읽기 →
                      </Link>
                    </div>
                  </div>
                  <div className="h-28 w-full shrink-0 rounded-2xl bg-surface-2 ring-1 ring-border md:h-auto md:w-64" />
                </CardBody>
              </Card>
            );
          })}
          {latest.length === 0 ? (
            <Card>
              <CardBody>
                <p className="text-sm text-muted">
                  아직 글이 없어요. 글을 작성해보세요.
                </p>
              </CardBody>
            </Card>
          ) : null}
        </div>
      </section>
    </div>
  );
}
