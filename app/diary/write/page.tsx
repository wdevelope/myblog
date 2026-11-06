import type { Metadata } from "next";
import PostEditor from "@/app/_components/PostEditor";
import { requireAdmin } from "@/lib/server/admin";
import { formatPostDate, toDiaryTitle } from "@/lib/utils";

export const metadata: Metadata = {
  title: "다이어리 쓰기",
};

export const dynamic = "force-dynamic";

function isYmd(input: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(input);
}

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DiaryWritePage({ searchParams }: Props) {
  await requireAdmin("/diary/write");

  const sp = (await searchParams) ?? {};
  const dateParam = typeof sp.date === "string" ? sp.date : null;
  const createdAtYmd = dateParam && isYmd(dateParam) ? dateParam : undefined;
  const diaryDate = createdAtYmd ?? formatPostDate(new Date().toISOString());

  return (
    <PostEditor
      type="diary"
      defaultVisibility="private"
      defaultTitle={toDiaryTitle(diaryDate)}
      createdAtYmd={createdAtYmd}
      draftDate={diaryDate}
    />
  );
}
