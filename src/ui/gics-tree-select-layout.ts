/** Panel padding (p-1.5 on both sides). */
const GICS_PANEL_PAD_X = 12;
/** Keep names clear of the vertical scrollbar. */
const GICS_SCROLLBAR_GUTTER = 16;
/** Option/heading px-3. */
const GICS_ROW_PAD_X = 12;
const GICS_DEPTH_STEP = 12;
/** Checkbox (w-4) + gap-2. */
const GICS_CHECKBOX_AND_GAP = 24;
/** Generous text-sm character width so full names fit on one line. */
const GICS_OPTION_CHAR_PX = 9;
/** 11px uppercase heading character width. */
const GICS_HEADING_CHAR_PX = 7.5;
const GICS_VIEWPORT_MARGIN = 8;

export function gicsRowNaturalWidth(row: {
  kind: "heading" | "option";
  depth: number;
  label: string;
}): number {
  const charPx =
    row.kind === "heading" ? GICS_HEADING_CHAR_PX : GICS_OPTION_CHAR_PX;
  const textWidth = Math.ceil(row.label.length * charPx);
  const leftPad = GICS_ROW_PAD_X + row.depth * GICS_DEPTH_STEP;
  const extras =
    row.kind === "option"
      ? GICS_CHECKBOX_AND_GAP + GICS_ROW_PAD_X
      : GICS_ROW_PAD_X;
  return leftPad + extras + textWidth;
}

export function gicsPanelSize({
  triggerLeft,
  triggerWidth,
  minWidth,
  rowNaturalWidths,
  viewportWidth,
  margin = GICS_VIEWPORT_MARGIN,
}: {
  triggerLeft: number;
  triggerWidth: number;
  minWidth: number;
  rowNaturalWidths: number[];
  viewportWidth: number;
  margin?: number;
}): { width: number; left: number } {
  const contentWidth = Math.max(
    minWidth,
    triggerWidth,
    Math.max(0, ...rowNaturalWidths) + GICS_PANEL_PAD_X + GICS_SCROLLBAR_GUTTER,
  );
  const maxWidth = Math.max(minWidth, viewportWidth - 2 * margin);
  const width = Math.min(contentWidth, maxWidth);
  let left = triggerLeft;
  if (left + width > viewportWidth - margin) {
    left = Math.max(margin, viewportWidth - margin - width);
  }
  return { width, left };
}
