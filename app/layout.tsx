import type { Metadata } from "next";
// 한글 글리프가 커서 통파일 대신 유니코드 범위별 조각을 쓴다(쓰인 글자 조각만 받는다).
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";
import SiteHeader from "@/app/_components/SiteHeader";
import SiteFooter from "@/app/_components/SiteFooter";
import { Toaster } from "sonner";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ThemeProvider } from "@/app/_components/ThemeProvider";
import { RSS_ALTERNATE_TYPES, SITE_OPEN_GRAPH, SITE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "개발자 오웬",
    template: "%s | 개발자 오웬",
  },
  description: "개발자 오웬의 인생이야기",
  // 브라우저·RSS 리더·검색 엔진이 피드 주소를 찾게 모든 페이지 head에 알린다.
  alternates: {
    // "./"는 Next가 페이지마다 그 경로로 풀어 준다. `?utm=…`처럼 쿼리가 붙어 들어와도 대표 주소는 경로 하나다.
    canonical: "./",
    types: RSS_ALTERNATE_TYPES,
  },
  openGraph: { ...SITE_OPEN_GRAPH, url: "./" },
  verification: {
    google: ["ayNa-MzflCN8eeUwrEeXN9-8QD1ZWwxaHPpUFFCgWrw", "83o3PcZbmvtl-qxraMwwJc9VEo1qf8o_VRwmNH3XExk"],
    other: {
      "naver-site-verification": "77241de112ead33da453b09ccd5eb30bc4be66a2",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased transition-colors duration-300">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="min-h-dvh flex flex-col">
            <SiteHeader />
            <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-5 lg:px-8 lg:py-5">
              {children}
            </main>
            <SiteFooter />
            <Toaster
              position="top-center"
              richColors
              closeButton
              toastOptions={{
                className:
                  "bg-surface text-foreground border border-border shadow-lg shadow-black/20",
              }}
            />
          </div>
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}
