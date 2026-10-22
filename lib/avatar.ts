export const AVATAR_BUCKET = "avatars";
// 화면에서는 최대 64px(마이페이지)로 보이므로 레티나 여유를 두고 256px로 줄여 올린다.
export const AVATAR_SIZE = 256;

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

// DB 제약 profiles_avatar_path_own·Storage 정책 avatars_insert_own(20261022070000)과 같은 모양이다.
export function isOwnAvatarPath(userId: string, path: string) {
  return new RegExp(`^${userId}/${UUID}\\.jpg$`).test(path);
}

export function avatarSrc(path: string | null | undefined) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!path || !base) return null;
  return `${base}/storage/v1/object/public/${AVATAR_BUCKET}/${path}`;
}

// 사진 가운데의 가장 큰 정사각형. 자를 영역을 고르는 화면은 두지 않는다(18절).
export function squareCropRect(width: number, height: number) {
  const size = Math.min(width, height);
  return {
    sx: Math.floor((width - size) / 2),
    sy: Math.floor((height - size) / 2),
    size,
  };
}
