"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// 상세는 정적이라 어느 목록에서 왔는지 서버가 모른다. 목록이 자기 주소(카테고리·쪽 번호)를 탭 세션에 남기고
// 상세의 "목록으로"가 그 주소로 돌아간다.
const LAST_LIST_KEY = "article:last-list";

// 사생활 보호 모드·저장소 차단에서는 sessionStorage 접근이 throw한다. 그때는 전체 목록으로 돌아간다.
export function RememberArticleList({ href }: { href: string }) {
  useEffect(() => {
    try {
      sessionStorage.setItem(LAST_LIST_KEY, href);
    } catch {}
  }, [href]);

  return null;
}

function lastArticleList() {
  try {
    return sessionStorage.getItem(LAST_LIST_KEY);
  } catch {
    return null;
  }
}

export function ArticleListBackButton({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        router.push(lastArticleList() ?? "/article");
      }}
      className={className}
    >
      {children}
    </button>
  );
}
