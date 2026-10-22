import { AVATAR_SIZE, squareCropRect } from "@/lib/avatar";

// 브라우저에서 가운데를 정사각형으로 잘라 256px JPEG로 줄인다. 큰 원본이 저장 공간을 차지하지 않게 하고,
// WebP 대신 JPEG를 쓰는 것은 Safari가 canvas WebP 인코딩을 지원하지 않을 수 있어서다.
export async function toAvatarJpeg(file: File): Promise<Blob> {
  // createImageBitmap은 EXIF 방향을 반영해 디코드한다. 디코드하지 못하는 형식(일부 HEIC 등)은 여기서 실패한다.
  const bitmap = await createImageBitmap(file);
  try {
    const { sx, sy, size } = squareCropRect(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = AVATAR_SIZE;
    canvas.height = AVATAR_SIZE;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("canvas_unavailable");
    // JPEG에는 투명이 없어 투명한 PNG가 검게 나오지 않게 흰 바탕을 먼저 칠한다.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);
    context.drawImage(bitmap, sx, sy, size, size, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("encode_failed"))),
        "image/jpeg",
        0.85,
      ),
    );
  } finally {
    bitmap.close();
  }
}
