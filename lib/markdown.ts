export function toExcerpt(content: string, maxLength = 240): string {
  if (!content) return "";

  // Basic HTML tag stripping
  let text = content
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) return "";

  if (text.length > maxLength) {
    text = text
      .slice(0, maxLength)
      .replace(/\s+\S*$/, "")
      .trimEnd();
    if (text) text = `${text}…`;
  }

  return text;
}

export function toAutoTitle(content: string, maxLength = 48): string {
  const excerpt = toExcerpt(content, maxLength);
  const title = excerpt.replace(/…$/, "").trim();
  return title || "피드";
}
