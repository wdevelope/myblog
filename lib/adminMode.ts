// 관리자 화면(draft mode) 쿠키는 브라우저 세션 쿠키라, 브라우저를 다시 열면 Supabase 로그인은 남아도 사라진다.
// 그래서 탭 세션마다 한 번 서버에 켜 달라고 요청한다. 관리자가 아니면 서버가 401로 거절한다.
const CHECKED_KEY = "myblog:admin-mode-checked";

export async function enableAdminMode(): Promise<boolean> {
  markChecked(true);
  const response = await fetch("/api/admin-mode", { method: "POST" }).catch(() => null);
  return response?.status === 204;
}

export async function disableAdminMode() {
  markChecked(false);
  await fetch("/api/admin-mode", { method: "DELETE" }).catch(() => null);
}

export function isAdminModeChecked() {
  try {
    return window.sessionStorage.getItem(CHECKED_KEY) === "1";
  } catch {
    return false;
  }
}

function markChecked(checked: boolean) {
  // 저장소를 쓸 수 없는 브라우저(사생활 보호 모드 등)에서는 페이지마다 다시 확인한다.
  try {
    if (checked) window.sessionStorage.setItem(CHECKED_KEY, "1");
    else window.sessionStorage.removeItem(CHECKED_KEY);
  } catch {}
}
