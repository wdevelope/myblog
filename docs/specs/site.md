# 명세: 사이트 레이아웃·홈·SEO·내비게이션·테마

- **상태:** 현행
- **ID 접두:** SITE
- **근거:** 현행 코드 역작성(2026-10-21)
- **코드 경로:** `app/layout.tsx`, `app/page.tsx`, `app/loading.tsx`, `app/sitemap.ts`, `app/robots.ts`, `app/_components/SiteHeader.tsx`, `app/_components/SiteFooter.tsx`, `app/_components/MobileNav.tsx`, `app/_components/NavLink.tsx`, `app/_components/ThemeProvider.tsx`, `app/_components/ThemeToggle.tsx`, `app/_components/BackButton.tsx`, `app/_components/ui.tsx`, `lib/utils.ts`
- **승인:** 2026-10-21

## 1. 목적

모든 방문자에게 공통 레이아웃(헤더·푸터·내비·테마)과 홈 화면(최신 공개 아티클)을 제공하고, 검색엔진에 메타데이터·sitemap·robots를 알린다. 공통 UI 조각(`Card`·`Badge`·`ButtonLink`·`Skeleton`·`BackButton`·`cn`)을 다른 화면에 빌려준다.

## 2. 범위

- 포함: 루트 레이아웃과 메타데이터, 홈(`/`)과 전역 로딩 스켈레톤, `/sitemap.xml`, `/robots.txt`, 헤더·푸터·모바일 메뉴·내비 링크, 테마 공급자·전환 버튼, 공통 UI 조각.
- 제외: 로그인·로그아웃 버튼과 세션 판정(auth), 공개 글 조회 함수(posts), 이미지 URL 변환(images), 섹션별 목록·상세(article·feed·diary).

## 3. 시나리오

### SITE-1. 홈은 공개 아티클 최신 6개만 정적으로 보여 준다

- 전제: 누구든. 로그인 여부와 무관하다.
- 행동: `/`를 연다.
- 결과: 서버에서 사용자·관리자 판정을 하지 않고 `getPublicPosts({ type: "blog", limit: 6, revalidateSeconds: 86400 })`만 부른다. 각 항목은 "아티클" 배지, 카테고리(없으면 "전체"), UTC 기준 `YYYY-MM-DD`, `/article/<slug>` 링크 제목, `toExcerpt` 요약, `thumbnailImageKey`가 있을 때만 썸네일을 보인다. 결과가 비면 "아직 아티클이 없어요."를 보인다. 비공개 글·피드·다이어리는 없다. `export const revalidate = 86400; // REVALIDATE_PERIOD`.
- 테스트 층: 단위

### SITE-2. sitemap은 고정 경로와 공개 아티클만 담는다

- 전제: 공개·비공개 아티클, 비공개 카테고리의 글, 피드·다이어리가 있다.
- 행동: `/sitemap.xml`을 연다.
- 결과: `<base>`, `<base>/article`, `<base>/feed`(`changeFrequency: "daily"`, `priority: 1`, `lastModified`는 생성 시각)와 `getPublicPosts({ type: "blog", limit: 1000 })`가 돌려준 글마다 `<base>/article/<slug>`(`"weekly"`, `0.8`, `lastModified = updatedAt`)를 담는다. 비공개 글, 비공개 카테고리 글(anon RLS로 제외), 피드·다이어리 글은 없다. `<base>`는 `NEXT_PUBLIC_SITE_URL`, 없으면 `https://www.w-life.store`. `export const revalidate = 86400; // REVALIDATE_PERIOD`.
- 테스트 층: 단위

### SITE-3. robots는 전체 크롤링을 허용하고 sitemap 주소를 알린다

- 전제: 없음.
- 행동: `/robots.txt`를 연다.
- 결과: `rules: { userAgent: "*", allow: "/" }`, `sitemap: "<base>/sitemap.xml"`. `disallow`는 없다.
- 테스트 층: 단위

### SITE-4. 루트 메타데이터는 제목 템플릿·기준 URL·검색엔진 인증값을 준다

- 전제: 없음.
- 행동: 아무 페이지나 연다.
- 결과: `metadataBase`는 `NEXT_PUBLIC_SITE_URL` 또는 `https://www.w-life.store`. 제목 기본값 "개발자 원스", 템플릿 `"%s | 개발자 원스"`, 설명 "개발자 원스의 인생이야기", Open Graph `type: "website"`·`locale: "ko_KR"`, Google 인증과 `naver-site-verification` 메타 태그가 들어간다. `<html lang="ko">`.
- 테스트 층: 단위

### SITE-5. 헤더와 레이아웃은 서버에서 인증을 확인하지 않는다

- 전제: 없음.
- 행동: 아무 페이지나 렌더링한다.
- 결과: `RootLayout`·`SiteHeader`·`SiteFooter`는 `headers()`·쿠키·Supabase를 부르지 않는다(레이아웃 때문에 홈이 동적으로 바뀌지 않는다). 로그인 여부 표시는 클라이언트 컴포넌트(`AuthButton`·`MobileNav`)가 `supabase.auth.getSession()`으로 정한다. 헤더 내비는 "피드"(`/feed`)·"아티클"(`/article`)·"다이어리"(`/diary`)이고, 현재 경로가 링크로 시작하면 굵게 표시한다.
- 테스트 층: 단위

### SITE-6. 모바일 메뉴는 경로가 바뀌면 닫히고 세션에 따라 로그인·로그아웃을 보인다

- 전제: md 미만 화면.
- 행동: "메뉴 열기"를 누르고, 링크를 눌러 이동한다.
- 결과: `<dialog>`를 `showModal()`로 열고, 바깥(배경)을 누르거나 "메뉴 닫기"를 누르거나 `pathname`이 바뀌면 닫는다. 세 섹션 링크를 보이고 현재 섹션을 강조한다. 브라우저 세션이 있으면 `LogoutButton` "로그아웃", 없거나 확인 중이면 `/login` "로그인"을 보인다.
- 테스트 층: 컴포넌트(jsdom)

### SITE-7. 테마는 시스템 설정을 따르고 버튼으로 밝게·어둡게를 바꾼다

- 전제: 없음.
- 행동: 처음 방문한 뒤 "테마 변경" 버튼을 누른다.
- 결과: `ThemeProvider`가 `attribute="class"`, `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange`로 `next-themes`를 감싼다. `ThemeToggle`은 마운트 전에는 투명 자리만 그리고, 마운트 뒤 누르면 `theme === "dark"`일 때 `"light"`, 아니면 `"dark"`로 바꾼다.
- 테스트 층: 컴포넌트(jsdom)

### SITE-8. `BackButton`은 기록과 무관하게 `fallbackHref`로 이동한다

- 전제: 상세 화면의 "← 목록으로" 버튼.
- 행동: 버튼을 누른다.
- 결과: `router.push(fallbackHref)`만 한다(브라우저 뒤로 가기가 아니다). 기본값은 `fallbackHref="/"`, 글자 "뒤로".
- 테스트 층: 컴포넌트(jsdom)

### SITE-9. 홈 로딩 중에는 스켈레톤을 보인다

- 전제: 홈 서버 렌더링 또는 최신 아티클 조회가 끝나지 않았다.
- 행동: `/`로 이동한다.
- 결과: 라우트 로딩 동안 `app/loading.tsx`가 히어로·카드 3장 스켈레톤을 그린다. 히어로가 그려진 뒤에도 최신 아티클은 `Suspense` 대체 화면 `LatestArticlesSkeleton`(카드 3장)을 보인다.
- 테스트 층: 컴포넌트(jsdom)

## 4. 계약

| 경로 | 입력 | 접근 | 렌더링 설정 |
| --- | --- | --- | --- |
| `/` | 없음 | 모두 | `revalidate = 86400`(정적·ISR) |
| `/sitemap.xml` | 없음 | 모두 | `revalidate = 86400` |
| `/robots.txt` | 없음 | 모두 | 정적 |

공통 컴포넌트:

- `RootLayout`: `ThemeProvider` 안에 `SiteHeader`·`<main>`(최대 폭 7xl)·`SiteFooter`("© <올해> 개발자 원스")·`Toaster`(sonner, 상단 가운데)·`SpeedInsights`.
- `SiteHeader`: 로고 링크 `/`("Wonce"), md 이상 내비 링크 3개, 검색 입력(동작 없음, §7), `ThemeToggle`, sm 이상 `AuthButton`, `MobileNav`.
- `NavLink({ href, children })`: `href === "/"`면 정확히 일치할 때, 아니면 `pathname.startsWith(href)`일 때 활성.
- `ui.tsx`: `Card`, `CardBody`(기본 `p-6`), `Badge`(`default`·`primary`·`success`·`warning`), `ButtonLink`(`primary`·`secondary`), `Skeleton`.
- `cn(...inputs)`: `clsx` 결과를 `tailwind-merge`로 합친다.

화면 상태(홈): 히어로("안녕하세요. 개발자 원스입니다.", "최신 피드 보기 →" `/feed`, `AuthButton`), 최신 아티클 로딩·목록·빈 상태, "더 보기 →" `/article`.

## 5. 데이터

없음 — posts 명세 참고.

## 6. 불변식

- 1 비공개 격리: 홈과 sitemap은 anon 키 공개 조회(`getPublicPosts`)만 쓰므로 비공개 글·비공개 카테고리 글·다이어리가 들어가지 않는다.
- 5 공개 캐시 정합성: 홈은 사용자 판정 없이 공개 데이터만으로 정적 렌더링한다. `revalidate`는 리터럴 86400에 `// REVALIDATE_PERIOD` 주석을 단다. 글 저장·삭제 시 `revalidatePath("/")`와 `posts:public:blog` 태그 무효화는 posts 명세가 한다.
- 6 비밀값은 서버에만: `"use client"` 모듈(`MobileNav`·`ThemeToggle`·`NavLink`·`BackButton`)은 브라우저용 anon 클라이언트(`lib/supabase/client.ts`)만 쓰고 service role을 import하지 않는다.

## 7. 미결·확인 필요

1. sitemap은 `getPublicPosts`를 `limit: 1000`으로 부른다. 공개 아티클이 1,000개를 넘으면 오래된 글이 빠진다.
2. sitemap의 `getPublicPosts` 호출은 `revalidateSeconds`를 넘기지 않아 fetch 재검증이 기본 60초다. 라우트의 `revalidate = 86400`보다 짧아 실제 재생성 주기가 60초가 될 수 있다(확인 필요).
3. sitemap에 `/diary` 목록 경로와 피드 글이 없다. 피드는 단건 경로가 없어 현재는 일관되지만 의도 확인이 필요하다.
4. 헤더와 모바일 메뉴의 "게시글 검색…" 입력은 핸들러도 검색 경로도 없어 아무 동작도 하지 않는다.
5. `NEXT_PUBLIC_SITE_URL`이 `.env.example`에 없다. 설정하지 않으면 프리뷰 배포에서도 `metadataBase`·sitemap·robots가 운영 도메인 `https://www.w-life.store`를 가리킨다.
6. robots에 `disallow`가 없다(`/login`, `/*/write`, `/*/edit/*`, `/api/` 포함). 접근 제어로 막혀 노출 사고는 아니지만 의도 확인이 필요하다.
7. `BackButton`은 이름과 달리 브라우저 기록을 쓰지 않아, 목록의 카테고리·페이지·날짜 선택 상태를 잃고 `fallbackHref`로 간다.
8. 홈 썸네일은 `thumbnailImageKey`만 쓰고 아티클 목록처럼 `imageKeys[0]`로 대체하지 않는다.

## 8. 관련 코드

- auth: `AuthButton`(헤더·홈의 로그인/로그아웃), `LogoutButton`(모바일 메뉴), `createSupabaseBrowserClient`(`lib/supabase/client.ts`, 모바일 메뉴 세션 표시).
- posts: `getPublicPosts`(`lib/server/publicPosts.ts`, 홈·sitemap), `toExcerpt`(`lib/markdown.ts`).
- images: `coverSrcFromImageKey`(`lib/image.ts`, 홈 썸네일).
