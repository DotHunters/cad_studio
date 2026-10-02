/**
 * Plain-text excerpt of Markdown for meta descriptions (AGENTS.md §10): strips formatting,
 * collapses whitespace and cuts at a word boundary with an ellipsis.
 */
export function excerpt(markdown: string, max = 160): string {
  const text = markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // links → their text
    .replace(/^#{1,6}\s+/gm, "") // headings
    .replace(/[*_`>~]/g, "") // emphasis, code, quotes
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,.;:—-]+$/, "")}…`;
}
