import type { Metadata } from "next";
import "./globals.css";
import SiteHeader from "@/app/_components/SiteHeader";
import SiteFooter from "@/app/_components/SiteFooter";
import { Toaster } from "sonner";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ThemeProvider } from "@/app/_components/ThemeProvider";
import { SITE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "개발자 원스",
    template: "%s | 개발자 원스",
  },
  description: "개발자 원스의 인생이야기",
  openGraph: {
    title: "개발자 원스",
    description: "개발자 원스의 인생이야기",
    type: "website",
    locale: "ko_KR",
  },
  verification: {
    google: "ayNa-MzflCN8eeUwrEeXN9-8QD1ZWwxaHPpUFFCgWrw",
    other: {
      "naver-site-verification": "ea84e759a9cda554cc0ac35815db52860299f16b",
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
