import type { Metadata } from "next";
import { ButtonLink } from "@/app/_components/ui";

export const metadata: Metadata = {
  title: "페이지를 찾을 수 없어요",
};

// 없는 글과 비공개 글이 같은 화면으로 끝나야 글이 있는지 드러나지 않는다.
export default function NotFound() {
  return (
    <section className="flex flex-col items-center gap-4 py-24 text-center">
      <h1 className="text-xl font-bold text-foreground">페이지를 찾을 수 없어요</h1>
      <p className="text-sm text-muted">주소가 바뀌었거나 볼 수 없는 글이에요.</p>
      <ButtonLink href="/">홈으로</ButtonLink>
    </section>
  );
}
