import type { Metadata } from "next";
import "./globals.css";
import SiteHeader from "@/app/_components/SiteHeader";
import SiteFooter from "@/app/_components/SiteFooter";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: {
    default: "인생일지",
    template: "%s | 인생일지",
  },
  description: "나의 삶과 기록을 담는 개인 블로그",
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
    <html lang="ko">
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <div className="min-h-dvh">
          <SiteHeader />
          <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
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
      </body>
    </html>
  );
}
