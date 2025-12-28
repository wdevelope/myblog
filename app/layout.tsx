import type { Metadata } from "next";
import "./globals.css";
import SiteHeader from "@/app/_components/SiteHeader";
import SiteFooter from "@/app/_components/SiteFooter";

export const metadata: Metadata = {
  title: {
    default: "인생일지",
    template: "%s | 인생일지",
  },
  description: "삶과 기록을 담는 개인 블로그",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark">
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <div className="min-h-dvh">
          <SiteHeader />
          <main className="mx-auto w-full max-w-6xl px-4 py-10">
            {children}
          </main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
