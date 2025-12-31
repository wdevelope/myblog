export function toExcerptMarkdown(content: string, maxLength = 240): string {
  let text = content.trim();
  if (!text) return "";

  text = text.replace(
    /^---\s*\n[\s\S]*?\n---\s*(\n|$)/,
    "",
  ).trim();

  const blocks = text.split(/\n\s*\n+/);
  const firstMeaningful =
    blocks.find((block) => {
      const trimmed = block.trim();
      if (!trimmed) return false;
      if (trimmed.startsWith("```")) return false;
      return true;
    }) ?? "";

  const lines = firstMeaningful
    .replaceAll("\r\n", "\n")
    .split("\n")
    .map((line) =>
      line
        .replace(/^#{1,6}\s+/, "")
        .replace(/^>\s+/, "")
        .replace(/^(\d+)\.\s+/, "")
        .replace(/^[-*+]\s+/, "")
        .replace(/^\[[ xX]\]\s+/, "")
        .trim(),
    )
    .filter(Boolean);

  let excerpt = lines.join(" ").replace(/\s+/g, " ").trim();
  if (!excerpt) return "";

  if (excerpt.length > maxLength) {
    excerpt = excerpt.slice(0, maxLength).replace(/\s+\S*$/, "").trimEnd();
    if (excerpt) excerpt = `${excerpt}…`;
  }

  return excerpt;
}
