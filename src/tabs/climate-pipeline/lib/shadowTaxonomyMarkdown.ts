import type { ShadowElement } from "../hooks/useShadowElements";

const oneLine = (s: string) => s.replace(/\s+/g, " ").trim();

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function elementMarkdown(
  el: ShadowElement,
  formatDate: (iso: string) => string,
): string[] {
  const out = [
    `### ${el.shortLabel} (${el.status}, ${el.qualityGrade}, ${plural(el.attachments.length, "commitment")})`,
    `Created ${formatDate(el.createdAt)} · ${el.activityShiftCategory}${el.sectorPath ? ` · ${el.sectorPath}` : ""}`,
    "",
    el.description,
  ];
  if (el.comment) out.push("", `Reviewer comment: ${oneLine(el.comment)}`);
  if (el.origin) {
    out.push(
      "",
      `Origin: ${el.origin.municipalityName ?? "Unknown municipality"} -- [${el.origin.documentTitle ?? el.origin.url}](${el.origin.url})`,
    );
  }
  if (el.mergedElements.length) {
    out.push(
      "",
      `Merged into this: ${el.mergedElements
        .map((m) => `${m.shortLabel} (${m.attachmentCount})`)
        .join(", ")}`,
    );
  }
  if (el.attachments.length) out.push("");
  for (const a of el.attachments) {
    out.push(
      `- **${a.municipalityName ?? "Unknown municipality"}**${a.isOrigin ? " (origin)" : ""}: "${oneLine(a.measureText)}"`,
      `  - Shift: ${a.shiftFrom} → ${a.shiftTo}`,
    );
    if (a.aiReviewExplanation) {
      out.push(`  - Why matched: ${oneLine(a.aiReviewExplanation)}`);
    }
  }
  return out;
}

/** The shadow-element list as currently filtered and sorted, as Markdown.
 * With a date sort, elements are grouped under "Added <day>" headings --
 * the same days as the list's dividers. */
export function shadowTaxonomyMarkdown(args: {
  elements: ShadowElement[];
  filters: string[];
  groupByDay: boolean;
  dayKey: (el: ShadowElement) => string;
  formatDay: (iso: string) => string;
  formatDate: (iso: string) => string;
}): string {
  const { elements } = args;
  const commitments = elements.reduce((n, el) => n + el.attachments.length, 0);
  const out = [
    "# Shadow taxonomy",
    "",
    `Exported ${args.formatDate(new Date().toISOString())}. ${plural(elements.length, "element")}, ${plural(commitments, "attached commitment")}.`,
    `Filters: ${args.filters.length ? args.filters.join(", ") : "none"}.`,
  ];
  let lastDay: string | null = null;
  for (const el of elements) {
    if (args.groupByDay) {
      const day = args.dayKey(el);
      if (day !== lastDay) {
        const count = elements.filter((e) => args.dayKey(e) === day).length;
        out.push(
          "",
          `## Added ${args.formatDay(el.createdAt)} (${plural(count, "element")})`,
        );
        lastDay = day;
      }
    }
    out.push("", ...elementMarkdown(el, args.formatDate));
  }
  return out.join("\n") + "\n";
}
