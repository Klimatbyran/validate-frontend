import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import type { PDFPageProxy } from "pdfjs-dist";
// Vite asset-URL import — bundles the worker file and gives us its final
// served path, rather than pointing at a CDN (which the artifact/app CSP
// story here avoids in general) or requiring a manual public/ copy step.
import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { Modal } from "@/ui/modal";
import { Loader2, Minus, Plus, X } from "lucide-react";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

// Pages render at whatever scale makes them exactly as wide as the
// container (see computeFitScale) — clamped so a very narrow panel
// doesn't shrink text to unreadable, and a very wide modal doesn't
// upscale a page into blur.
const MIN_RENDER_SCALE = 0.6;
const MAX_RENDER_SCALE = 2.5;
// Leaves a little breathing room so the page doesn't touch the
// container's edges (and so rounding never pushes it a pixel past 100%,
// which would reintroduce the horizontal scrollbar this is meant to avoid).
const FIT_PADDING_PX = 16;

// The +/- zoom buttons' range and step, as a multiplier on top of the
// fit-to-width scale above (1 = fit exactly).
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2;
const ZOOM_STEP = 0.2;
// Visual font size Find-in-PDF aims for. Small-body PDFs zoom in toward
// this; already-large display type stays near fit-width (zoom 1).
const TARGET_FOCUS_FONT_PX = 18;

// Minimal version of pdf.js's own .textLayer stylesheet (normally shipped
// separately as web/pdf_viewer.css, which we don't pull in) — just enough
// to position spans exactly over the canvas-rendered text beneath them.
// Text stays invisible; only a matched span's background shows.
//
// The font-size + scaleX transform rules are not optional: TextLayer sets
// --font-height / --scale-x on each span and expects these CSS calc/
// transform rules to shrink each invisible run to the PDF glyph width.
// Without them, spans keep the browser's default font metrics, so a
// manual selection (and Range.getClientRects for auto-highlights) is
// often roughly twice as wide as the painted line and bleeds into the
// next column — exactly the symptom reported for multi-column pages.
const TEXT_LAYER_CSS = `
.pdf-highlight-page { position: relative; margin-bottom: 16px; }
.pdf-highlight-overlay {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}
.pdf-text-layer {
  position: absolute;
  inset: 0;
  overflow: clip;
  line-height: 1;
  letter-spacing: normal;
  word-spacing: normal;
  text-align: initial;
  text-size-adjust: none;
  transform-origin: 0 0;
  --min-font-size: 1;
  --text-scale-factor: calc(var(--total-scale-factor) * var(--min-font-size));
  --min-font-size-inv: calc(1 / var(--min-font-size));
}
.pdf-text-layer :is(span, br) {
  color: transparent;
  position: absolute;
  white-space: pre;
  cursor: text;
  transform-origin: 0% 0%;
  user-select: text;
}
.pdf-text-layer > :not(.markedContent),
.pdf-text-layer .markedContent span:not(.markedContent) {
  --font-height: 0;
  font-size: calc(var(--text-scale-factor) * var(--font-height));
  --scale-x: 1;
  --rotate: 0deg;
  transform: rotate(var(--rotate)) scaleX(var(--scale-x)) scale(var(--min-font-size-inv));
}
.pdf-text-layer .markedContent {
  display: contents;
}
.pdf-text-layer ::selection {
  background: rgba(0, 0, 255, 0.25);
  color: transparent;
}
`;

// Backend verify() checks a commitment against docling's markdown of the
// PDF (climate-plans-pipeline commitmentText.verify). This viewer searches
// pdf.js's text layer of the same PDF — a different extraction that keeps
// line-wrap hyphens ("upp-fyll"), mid-phrase quote/dash variants, ligatures,
// and kerning splits the markdown path already cleaned up. Folding both
// sides down to letters+digits (below) is what lets a previously-verified
// commitment still light up here; a literal/space-only normalize was
// measured at ~50% recall on real plans, vs ~99% with this fold.
const LIGATURES: Record<string, string> = {
  ﬁ: "fi",
  ﬂ: "fl",
  ﬀ: "ff",
  ﬃ: "ffi",
  ﬄ: "ffl",
};

/** Letters+digits only, lowercased, ligatures expanded — the form both the
 * commitment needle and the pdf.js haystack are compared in. Dropping
 * hyphens/punctuation/whitespace is deliberate: PDF line-wrap hyphens and
 * quote-style drift are the dominant reasons verified phrases used to miss. */
function foldForSearch(text: string): string {
  let folded = "";
  for (const character of text.normalize("NFC")) {
    const expanded = LIGATURES[character] ?? character;
    for (const piece of expanded) {
      const lower = piece.toLowerCase();
      if (/[\p{L}\p{N}]/u.test(lower)) folded += lower;
    }
  }
  return folded;
}

/** Same fold as foldForSearch, but keeps an indexMap from each folded
 * character back to its source offset in `text` — ligature expansions
 * map every output character to the same source index so highlighting
 * still lands on the originating text item. */
function buildFoldedSearchIndex(text: string): {
  searchable: string;
  indexMap: number[];
} {
  let searchable = "";
  const indexMap: number[] = [];
  // Iterate by code-unit index so indexMap entries are valid offsets into
  // `text` for the item-range overlap check in findMatchedItemIndices.
  for (let index = 0; index < text.length; ) {
    // Skip the rest of a surrogate pair as one Unicode character when
    // present, so we don't fold half a code point.
    const code = text.charCodeAt(index);
    const stride =
      code >= 0xd800 && code <= 0xdbff && index + 1 < text.length ? 2 : 1;
    const whole = text.slice(index, index + stride);
    const expanded = LIGATURES[whole] ?? whole.normalize("NFC");
    for (const piece of expanded) {
      const lower = piece.toLowerCase();
      if (/[\p{L}\p{N}]/u.test(lower)) {
        searchable += lower;
        indexMap.push(index);
      }
    }
    index += stride;
  }
  return { searchable, indexMap };
}

// When the full folded phrase isn't in the page (rare — usually a
// markdown-vs-PDF wording drift on a long commitment), try the leading
// N words so we still highlight the passage rather than nothing. Same
// ladder extractContext uses in the pipeline.
const PREFIX_WORD_COUNTS = [20, 12, 8] as const;
const MIN_FOLDED_NEEDLE_LENGTH = 12;

/** Folded needles to try for a phrase, longest first: the full text, then
 * leading-word prefixes. Deduped; too-short prefixes are skipped so a
 * tiny fragment can't false-match elsewhere on the page. */
function foldedNeedleCandidates(phrase: string): string[] {
  const words = phrase.trim().split(/\s+/).filter(Boolean);
  const candidates: string[] = [];
  const seen = new Set<string>();

  function addCandidate(candidatePhrase: string) {
    const folded = foldForSearch(candidatePhrase);
    if (folded.length < MIN_FOLDED_NEEDLE_LENGTH) return;
    if (seen.has(folded)) return;
    seen.add(folded);
    candidates.push(folded);
  }

  addCandidate(phrase);
  for (const wordCount of PREFIX_WORD_COUNTS) {
    if (words.length > wordCount) {
      addCandidate(words.slice(0, wordCount).join(" "));
    }
  }
  return candidates;
}

interface PageTextItem {
  str: string;
  hasEOL: boolean;
}

interface ItemGeometry {
  x: number;
  y: number;
  width: number;
}

// Column-gutter detection needs a real gap, not just "not touching" —
// this floor keeps a normal inter-word gap on a short line from ever
// registering as a gutter.
const MIN_COVERAGE_GUTTER_PT = 15;
const GUTTER_BUCKET_PT = 2;

/** Finds left-to-right column-boundary X positions by looking for
 * vertical strips with no text in them at all, across the *whole* page —
 * a real column gutter is empty all the way down (that's what makes it
 * visually read as a gutter), unlike an incidental gap on any one line.
 * Catches wide, page-spanning prose columns reliably, since it doesn't
 * require the two columns' own lines to align in Y at all (they usually
 * don't, for independently-flowing text) — but can't see a gutter that's
 * only local to a handful of rows (a small table), since other content
 * elsewhere on the page can cover that same X range at a different Y
 * (see findRecurringRowBoundaries for that case, which this is unioned
 * with in detectColumnBoundaries). */
function findCoverageBoundaries(geom: ItemGeometry[]): number[] {
  if (geom.length === 0) return [];
  const minX = Math.min(...geom.map((g) => g.x));
  const maxX = Math.max(...geom.map((g) => g.x + g.width));
  const bucketCount = Math.max(1, Math.ceil((maxX - minX) / GUTTER_BUCKET_PT));
  const covered = new Array<boolean>(bucketCount).fill(false);
  for (const g of geom) {
    const startBucket = Math.floor((g.x - minX) / GUTTER_BUCKET_PT);
    const endBucket = Math.ceil((g.x + g.width - minX) / GUTTER_BUCKET_PT);
    for (
      let b = Math.max(0, startBucket);
      b < Math.min(bucketCount, endBucket);
      b++
    ) {
      covered[b] = true;
    }
  }

  const minGutterBuckets = Math.ceil(MIN_COVERAGE_GUTTER_PT / GUTTER_BUCKET_PT);
  const boundaries: number[] = [];
  let runStart: number | null = null;
  for (let b = 0; b < bucketCount; b++) {
    if (!covered[b]) {
      runStart ??= b;
    } else {
      if (runStart !== null && b - runStart >= minGutterBuckets) {
        boundaries.push(minX + ((runStart + b) / 2) * GUTTER_BUCKET_PT);
      }
      runStart = null;
    }
  }
  if (runStart !== null && bucketCount - runStart >= minGutterBuckets) {
    boundaries.push(minX + ((runStart + bucketCount) / 2) * GUTTER_BUCKET_PT);
  }
  return boundaries;
}

const ROW_Y_TOLERANCE = 1;
const MIN_ROW_GAP_PT = 8;
const BOUNDARY_CLUSTER_TOLERANCE_PT = 12;
// A real column boundary shows up row after row in sequence — a table's
// own handful of rows, or a whole page's worth of paragraph lines. Two
// is enough to distinguish that from one-off coincidences (a title with
// extra letter-spacing, a single unusually wide justified word-gap)
// without needing many rows, since small real tables can be this short.
const MIN_CONSECUTIVE_ROW_SUPPORT = 2;

/** Groups items into visual rows by baseline Y (items sharing a Y, to
 * floating-point noise, are the same row), ordered top-to-bottom. */
function groupIntoRows(geom: ItemGeometry[]): number[][] {
  const sorted = [...geom.keys()].sort((a, b) => geom[b].y - geom[a].y);
  const rows: number[][] = [];
  let current: number[] = [];
  let currentY: number | null = null;
  for (const i of sorted) {
    const y = geom[i].y;
    if (currentY !== null && Math.abs(y - currentY) > ROW_Y_TOLERANCE) {
      rows.push(current);
      current = [];
    }
    current.push(i);
    currentY = y;
  }
  if (current.length > 0) rows.push(current);
  return rows;
}

/** Finds column-boundary X positions that recur across *consecutive*
 * rows — the signature of a real column structure whether it spans the
 * whole page or just a handful of rows (a small table), which
 * findCoverageBoundaries can miss precisely because it's small: other,
 * unrelated content elsewhere on the page can cover that same X range at
 * a different Y, so the gutter never reads as fully empty page-wide even
 * though it's a real, consistent gap across the table's own rows.
 * Requiring *consecutive* row indices (not just any N rows anywhere on
 * the page) is what keeps this from false-triggering on two unrelated
 * lines, far apart in the document, that coincidentally share a gap
 * position — verified directly against this pipeline's own documents:
 * scattered chart data-labels (no real column structure at all) produced
 * many spurious single/non-consecutive matches that this filters out,
 * while a genuine dense data table's dozen real year-columns, and a
 * small 2-row indicator table's own column split, both survive. */
function findRecurringRowBoundaries(geom: ItemGeometry[]): number[] {
  const rows = groupIntoRows(geom);
  const candidates: {
    x: number;
    gapStart: number;
    gapEnd: number;
    rowIndex: number;
  }[] = [];
  rows.forEach((row, rowIndex) => {
    const sorted = [...row].sort((a, b) => geom[a].x - geom[b].x);
    for (let i = 1; i < sorted.length; i++) {
      const prev = geom[sorted[i - 1]];
      const cur = geom[sorted[i]];
      const gapStart = prev.x + prev.width;
      const gapEnd = cur.x;
      if (gapEnd - gapStart >= MIN_ROW_GAP_PT) {
        candidates.push({
          x: (gapStart + gapEnd) / 2,
          gapStart,
          gapEnd,
          rowIndex,
        });
      }
    }
  });

  const sorted = [...candidates].sort((a, b) => a.x - b.x);
  const clusters: (typeof candidates)[] = [];
  let cluster: typeof candidates = [];
  for (const c of sorted) {
    if (
      cluster.length > 0 &&
      c.x - cluster[cluster.length - 1].x > BOUNDARY_CLUSTER_TOLERANCE_PT
    ) {
      clusters.push(cluster);
      cluster = [];
    }
    cluster.push(c);
  }
  if (cluster.length > 0) clusters.push(cluster);

  const boundaries: number[] = [];
  for (const c of clusters) {
    const rowIndices = [...new Set(c.map((x) => x.rowIndex))].sort(
      (a, b) => a - b,
    );
    let longestRun = 1;
    let runLen = 1;
    for (let i = 1; i < rowIndices.length; i++) {
      runLen = rowIndices[i] === rowIndices[i - 1] + 1 ? runLen + 1 : 1;
      longestRun = Math.max(longestRun, runLen);
    }
    if (longestRun >= MIN_CONSECUTIVE_ROW_SUPPORT) {
      const gapStart = Math.max(...c.map((x) => x.gapStart));
      const gapEnd = Math.min(...c.map((x) => x.gapEnd));
      boundaries.push(
        gapEnd > gapStart
          ? (gapStart + gapEnd) / 2
          : c.reduce((s, x) => s + x.x, 0) / c.length,
      );
    }
  }
  return boundaries;
}

/** Column-boundary X positions on a page — the union of both detection
 * methods above, since prose columns and tables are different enough
 * phenomena that neither method alone catches both (see each function's
 * own comment). */
function detectColumnBoundaries(geom: ItemGeometry[]): number[] {
  const merged = [
    ...findCoverageBoundaries(geom),
    ...findRecurringRowBoundaries(geom),
  ].sort((a, b) => a - b);
  const deduped: number[] = [];
  for (const x of merged) {
    if (
      deduped.length > 0 &&
      x - deduped[deduped.length - 1] < BOUNDARY_CLUSTER_TOLERANCE_PT
    ) {
      continue;
    }
    deduped.push(x);
  }
  return deduped;
}

/** A left-to-right, top-to-bottom reading-order permutation of item
 * indices — needed because pdf.js's own item order (following the PDF's
 * content stream) doesn't reliably match visual reading order for a
 * multi-column page, and DOM order is what *everything* downstream
 * follows: this module's own Range-based highlighting, and — confirmed
 * directly, by dragging a manual selection in this same rendered view —
 * the browser's native text selection too. No per-item Range-scoping
 * trick fixes that, since the wrong-order DOM is the actual problem, not
 * how any one Range gets measured.
 *
 * Boundaries come from detectColumnBoundaries; within a resulting band,
 * items keep pdf.js's own original relative order rather than being
 * re-sorted by Y — sorting by Y sounds more correct but actually breaks
 * pages where a callout box or sidebar shares a column's X range but a
 * different, overlapping Y range (verified directly against a real page:
 * Y-sorting interleaved a small indicator table with the unrelated
 * paragraph beside it, while preserving pdf.js's own order kept both
 * intact and separate, since pdf.js already emits each one
 * internally-ordered correctly — the only thing actually wrong is which
 * *columns'* items get interleaved with each other). */
function detectReadingOrderFromGeometry(geom: ItemGeometry[]): number[] {
  const n = geom.length;
  if (n === 0) return [];
  const boundaries = detectColumnBoundaries(geom);
  if (boundaries.length === 0) return [...Array(n).keys()];

  const minX = Math.min(...geom.map((g) => g.x));
  const maxX = Math.max(...geom.map((g) => g.x + g.width));
  const edges = [minX, ...boundaries, maxX];

  const order: number[] = [];
  for (let e = 0; e < edges.length - 1; e++) {
    const start = edges[e];
    const end = edges[e + 1];
    for (let i = 0; i < n; i++) {
      if (geom[i].x >= start && geom[i].x < end) order.push(i);
    }
  }
  // Items that landed on neither side of any boundary (shouldn't
  // normally happen) — append in original order rather than dropping them.
  const placed = new Set(order);
  for (let i = 0; i < n; i++) if (!placed.has(i)) order.push(i);
  return order;
}

interface StructTreeNodeLike {
  type?: string;
  id?: string;
  children?: StructTreeNodeLike[];
}

function collectStructTreeContentIds(
  node: StructTreeNodeLike | null | undefined,
  out: string[],
): void {
  if (!node) return;
  if (node.type === "content" && node.id) out.push(node.id);
  if (node.children) {
    for (const child of node.children) collectStructTreeContentIds(child, out);
  }
}

// Below this fraction of items successfully matched to the struct tree,
// the tree isn't trustworthy enough to reorder by (some untagged content
// on an otherwise-tagged page is normal; a page where most content has
// no match suggests the tree doesn't actually describe this page well).
const MIN_STRUCT_TREE_COVERAGE = 0.5;

/** A reading-order permutation built from the PDF's own tagged structure
 * tree, when one exists and covers most of the page — the actual
 * AUTHORED reading order (as a screen reader would use), not a guess
 * from geometry. Swedish municipal PDFs are routinely built this way for
 * accessibility compliance. Returns null if the page has no struct tree,
 * or too little of it could be matched to actual content to trust.
 * mcids is index-aligned with the page's real text items — each item's
 * enclosing marked-content id, or null if it has none (see
 * extractPageTextData, which tracks these from
 * getTextContent({includeMarkedContent: true})'s begin/end markers).
 *
 * Untagged items (mcid null / missing from the tree) are NOT dumped at
 * the end: multi-line bullets routinely tag only the wrapped continuation
 * lines and leave the first line untagged, and sending those first lines
 * to Infinity split phrases like "…utvecklar kompetens / för att möta…"
 * so the search couldn't find them. Each untagged item is clustered onto
 * the nearest tagged neighbor in original stream order and emitted with
 * that neighbor when the tagged sequence is walked. */
async function detectReadingOrderFromStructTree(
  page: PDFPageProxy,
  mcids: (string | null)[],
): Promise<number[] | null> {
  let tree: StructTreeNodeLike | null;
  try {
    tree = await page.getStructTree();
  } catch {
    return null;
  }
  if (!tree) return null;

  const idOrder: string[] = [];
  collectStructTreeContentIds(tree, idOrder);
  if (idOrder.length === 0) return null;

  const idRank = new Map(idOrder.map((id, i) => [id, i]));
  const n = mcids.length;
  if (n === 0) return null;

  function isTagged(index: number): boolean {
    const id = mcids[index];
    return id !== null && idRank.has(id);
  }

  const covered = mcids.filter((_, index) => isTagged(index)).length;
  if (covered / n < MIN_STRUCT_TREE_COVERAGE) return null;

  const taggedInStructOrder = [...Array(n).keys()]
    .filter(isTagged)
    .sort((a, b) => {
      const rankA = idRank.get(mcids[a]!)!;
      const rankB = idRank.get(mcids[b]!)!;
      return rankA !== rankB ? rankA - rankB : a - b;
    });

  // Attach each untagged item to the next tagged item in original order
  // (else the previous) so a bullet's untagged first line stays with its
  // tagged wrap continuations instead of floating to the end.
  const untaggedBeforeHost = new Map<number, number[]>();
  const untaggedAfterHost = new Map<number, number[]>();
  for (let index = 0; index < n; index++) {
    if (isTagged(index)) continue;
    let host = -1;
    for (let next = index + 1; next < n; next++) {
      if (isTagged(next)) {
        host = next;
        break;
      }
    }
    if (host === -1) {
      for (let prev = index - 1; prev >= 0; prev--) {
        if (isTagged(prev)) {
          host = prev;
          break;
        }
      }
    }
    if (host === -1) continue;
    const bucket = index < host ? untaggedBeforeHost : untaggedAfterHost;
    const list = bucket.get(host) ?? [];
    list.push(index);
    bucket.set(host, list);
  }

  const order: number[] = [];
  const placed = new Set<number>();
  for (const taggedIndex of taggedInStructOrder) {
    for (const untagged of untaggedBeforeHost.get(taggedIndex) ?? []) {
      order.push(untagged);
      placed.add(untagged);
    }
    order.push(taggedIndex);
    placed.add(taggedIndex);
    for (const untagged of untaggedAfterHost.get(taggedIndex) ?? []) {
      order.push(untagged);
      placed.add(untagged);
    }
  }
  for (let index = 0; index < n; index++) {
    if (!placed.has(index)) order.push(index);
  }
  return order;
}

/** The reading-order permutation to actually use for a page: the struct
 * tree when it's available and trustworthy (see
 * detectReadingOrderFromStructTree), falling back to the geometry-based
 * column detection otherwise — most PDFs aren't accessibility-tagged, so
 * this fallback is the common case, not a rare edge case. */
async function getReadingOrder(
  page: PDFPageProxy,
  mcids: (string | null)[],
  geom: ItemGeometry[],
): Promise<number[]> {
  const fromTree = await detectReadingOrderFromStructTree(page, mcids);
  return fromTree ?? detectReadingOrderFromGeometry(geom);
}

/** Extracts a page's real text items (filtered exactly the way pdf.js's
 * TextLayer filters internally — dropping marked-content boundary
 * pseudo-items themselves, which have str === undefined, rather than
 * real text), each item's enclosing marked-content id (tracked from the
 * begin/end markers includeMarkedContent surfaces — null if an item
 * isn't inside any tagged span), and each item's geometry. All three
 * stay index-aligned with each other and with a TextLayer's own textDivs
 * when built from the same getTextContent() call. */
async function extractPageTextData(page: PDFPageProxy): Promise<{
  textContent: Awaited<ReturnType<PDFPageProxy["getTextContent"]>>;
  items: PageTextItem[];
  mcids: (string | null)[];
  geom: ItemGeometry[];
}> {
  const textContent = await page.getTextContent({ includeMarkedContent: true });
  const items: PageTextItem[] = [];
  const mcids: (string | null)[] = [];
  const geom: ItemGeometry[] = [];
  // A stack, not a single scalar — nested BMC/EMC pairs are common in
  // tagged PDFs (e.g. an inline tag inside a paragraph's own span), and
  // popping back to the enclosing id on EMC (rather than resetting to
  // null) keeps later items in the outer span correctly attributed to it.
  const mcidStack: (string | null)[] = [];
  for (const item of textContent.items) {
    if ("str" in item) {
      items.push({ str: item.str, hasEOL: item.hasEOL });
      mcids.push(mcidStack.length > 0 ? mcidStack[mcidStack.length - 1] : null);
      geom.push({
        x: item.transform[4],
        y: item.transform[5],
        width: item.width,
      });
    } else if (
      item.type === "beginMarkedContentProps" ||
      item.type === "beginMarkedContent"
    ) {
      const id = "id" in item && item.id ? item.id : null;
      mcidStack.push(
        id ?? (mcidStack.length > 0 ? mcidStack[mcidStack.length - 1] : null),
      );
    } else if (item.type === "endMarkedContent") {
      mcidStack.pop();
    }
  }
  return { textContent, items, mcids, geom };
}

async function getPageItems(page: PDFPageProxy): Promise<PageTextItem[]> {
  const { items, mcids, geom } = await extractPageTextData(page);
  const order = await getReadingOrder(page, mcids, geom);
  return order.map((i) => items[i]);
}

/** Joins a page's text items into one continuous string for searching,
 * undoing the PDF's own line-wrap hyphenation along the way: these
 * documents' justified body text routinely splits a word across a line
 * break ("energi-" / "effektiv"), and left as "energi- effektiv" the
 * hyphen survives into the folded search string as noise we then have to
 * strip. hasEOL is the signal when pdf.js sets it; many producers don't,
 * so a trailing hyphen followed by an item that starts with a letter is
 * also treated as a wrap. Returns each item's [start, end) range in the
 * joined string, so a match's position can be mapped back to which
 * item(s) — and so which spans — it came from. */
function joinPageItems(items: PageTextItem[]): {
  text: string;
  ranges: { start: number; end: number }[];
} {
  let text = "";
  const ranges: { start: number; end: number }[] = [];
  for (let i = 0; i < items.length; i++) {
    const { str } = items[i];
    const start = text.length;
    if (str) {
      const nextText = items[i + 1]?.str ?? "";
      const atLineBreak =
        items[i].hasEOL ||
        (nextText === "" && !!items[i + 1]?.hasEOL) ||
        (/\S-$/.test(str) && /^[\p{L}]/u.test(nextText));
      if (atLineBreak && /\S-$/.test(str)) {
        text += str.slice(0, -1);
      } else {
        text += str + " ";
      }
    }
    ranges.push({ start, end: text.length });
  }
  return { text, ranges };
}

/** Groups a sorted-ascending list of item indices into runs of
 * consecutive integers — [3,4,5,8,9] becomes [[3,4,5],[8,9]]. This is
 * deliberately the *only* grouping a highlight bar is ever built from
 * now: every earlier attempt (grouping rendered spans by rounded
 * offsetTop, a horizontal-gap threshold, hasEOL-based line detection,
 * baseline-Y clustering with an X-gap split for tables/columns) tried to
 * reconstruct "the whole visual line" from the PDF's geometry, and each
 * one found a new way to get that wrong. The actual root cause turned
 * out to be one level up: a browser Range — whether built by this code
 * or by a person dragging a mouse selection — always includes everything
 * sitting between its two endpoints *in DOM order*, and pdf.js's own
 * text-item order for a multi-column page doesn't reliably match visual
 * reading order (confirmed directly: dragging a manual selection in this
 * same rendered view bleeds into the next column exactly like the
 * automatic highlighting did, with none of this module's code involved
 * at all). Two *consecutive array indices* can never have anything
 * between them by construction, so a Range built only across those is
 * structurally incapable of including text the match didn't touch —
 * regardless of which column, table cell, or DOM order pdf.js happened
 * to use. */
function groupIntoConsecutiveRuns(indices: number[]): number[][] {
  const sorted = [...indices].sort((a, b) => a - b);
  const runs: number[][] = [];
  let run: number[] = [];
  for (const idx of sorted) {
    if (run.length > 0 && idx !== run[run.length - 1] + 1) {
      runs.push(run);
      run = [];
    }
    run.push(idx);
  }
  if (run.length > 0) runs.push(run);
  return runs;
}

/** Finds every occurrence of `phrase` across `items` (index-aligned with
 * divs — see getPageItems) by joining the page's text, folding both sides
 * down to letters+digits (see foldForSearch / buildFoldedSearchIndex —
 * drops line-wrap hyphens, punctuation, and whitespace that differ
 * between docling markdown and pdf.js), and searching that. Falls back to
 * a leading-word prefix when the full phrase misses. Highlighting later
 * only ever spans directly-adjacent touched indices (see
 * groupIntoConsecutiveRuns). */
function findMatchedItemIndices(
  items: PageTextItem[],
  phrase: string,
): { count: number; itemIndices: Set<number> } {
  const needleCandidates = foldedNeedleCandidates(phrase);
  if (needleCandidates.length === 0) {
    return { count: 0, itemIndices: new Set() };
  }

  const { text: fullText, ranges: itemRanges } = joinPageItems(items);
  const { searchable, indexMap } = buildFoldedSearchIndex(fullText);

  let needle = "";
  for (const candidate of needleCandidates) {
    if (searchable.includes(candidate)) {
      needle = candidate;
      break;
    }
  }
  if (!needle) return { count: 0, itemIndices: new Set() };

  let count = 0;
  const itemIndices = new Set<number>();
  let searchFrom = 0;
  while (true) {
    const matchIndex = searchable.indexOf(needle, searchFrom);
    if (matchIndex === -1) break;
    count++;
    const startOrig = indexMap[matchIndex] ?? 0;
    const endOrig =
      indexMap[Math.min(matchIndex + needle.length - 1, indexMap.length - 1)] ??
      startOrig;
    searchFrom = matchIndex + needle.length;

    for (let i = 0; i < itemRanges.length; i++) {
      const range = itemRanges[i];
      if (range.start > endOrig || range.end <= startOrig) continue;
      itemIndices.add(i);
    }
  }
  return { count, itemIndices };
}

/** Product of CSS `zoom` on `element` and its ancestors — getClientRects /
 * getBoundingClientRect return visual pixels that already include this, but
 * absolutely-positioned children inside a zoomed overlay still use the
 * overlay's pre-zoom local coordinates. */
function getEffectiveCssZoom(element: HTMLElement): number {
  let zoom = 1;
  let current: HTMLElement | null = element;
  while (current) {
    const raw = current.style.zoom || getComputedStyle(current).zoom;
    if (raw && raw !== "normal") {
      const value = Number.parseFloat(raw);
      if (Number.isFinite(value) && value > 0) zoom *= value;
    }
    current = current.parentElement;
  }
  return zoom;
}

interface LocalHighlightRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

function localRectsOverlap(
  a: LocalHighlightRect,
  b: LocalHighlightRect,
): boolean {
  const aRight = a.left + a.width;
  const aBottom = a.top + a.height;
  const bRight = b.left + b.width;
  const bBottom = b.top + b.height;
  return !(
    aRight <= b.left ||
    a.left >= bRight ||
    aBottom <= b.top ||
    a.top >= bBottom
  );
}

/** Collapses overlapping highlight boxes into disjoint unions so yellow (or
 * red) is never painted twice on the same glyphs — getClientRects and
 * multi-phrase unions otherwise routinely stack translucent layers. */
function mergeOverlappingLocalRects(
  rects: LocalHighlightRect[],
): LocalHighlightRect[] {
  const boxes = rects.map((rect) => ({
    left: rect.left,
    top: rect.top,
    right: rect.left + rect.width,
    bottom: rect.top + rect.height,
  }));

  let mergedSomething = true;
  while (mergedSomething) {
    mergedSomething = false;
    outer: for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        if (
          localRectsOverlap(
            {
              left: a.left,
              top: a.top,
              width: a.right - a.left,
              height: a.bottom - a.top,
            },
            {
              left: b.left,
              top: b.top,
              width: b.right - b.left,
              height: b.bottom - b.top,
            },
          )
        ) {
          boxes[i] = {
            left: Math.min(a.left, b.left),
            top: Math.min(a.top, b.top),
            right: Math.max(a.right, b.right),
            bottom: Math.max(a.bottom, b.bottom),
          };
          boxes.splice(j, 1);
          mergedSomething = true;
          break outer;
        }
      }
    }
  }

  return boxes.map((box) => ({
    left: box.left,
    top: box.top,
    width: box.right - box.left,
    height: box.bottom - box.top,
  }));
}

/** Draws one highlight bar per visual line-segment of each run of
 * directly-adjacent touched items (see groupIntoConsecutiveRuns) into
 * `overlay`. Uses a real DOM Range per run and its getClientRects() —
 * then merges any overlapping rects so translucent colour is never
 * stacked. Client rects are converted back through CSS zoom into the
 * overlay's local coordinates (see getEffectiveCssZoom). Returns the bar
 * elements it created, so a caller that redraws on every change (see
 * PdfHighlightBody's refocus effect) can remove exactly these later. */
function drawMatchHighlights(
  overlay: HTMLElement,
  touchedItemIndices: Set<number>,
  divs: HTMLElement[],
  color: string,
): HTMLElement[] {
  const zoom = getEffectiveCssZoom(overlay);
  const overlayRect = overlay.getBoundingClientRect();
  const localRects: LocalHighlightRect[] = [];

  for (const run of groupIntoConsecutiveRuns([...touchedItemIndices])) {
    const startNode = divs[run[0]]?.firstChild;
    const endNode = divs[run[run.length - 1]]?.firstChild;
    if (!startNode || !endNode) continue;

    const range = document.createRange();
    try {
      range.setStart(startNode, 0);
      range.setEnd(endNode, endNode.textContent?.length ?? 0);
    } catch {
      continue; // stale/detached node — skip rather than throw
    }

    for (const rect of range.getClientRects()) {
      if (rect.width <= 0 || rect.height <= 0) continue;
      localRects.push({
        left: (rect.left - overlayRect.left) / zoom,
        top: (rect.top - overlayRect.top) / zoom,
        width: rect.width / zoom,
        height: rect.height / zoom,
      });
    }
  }

  const bars: HTMLElement[] = [];
  for (const rect of mergeOverlappingLocalRects(localRects)) {
    const bar = document.createElement("div");
    bar.style.position = "absolute";
    bar.style.left = `${rect.left}px`;
    bar.style.top = `${rect.top}px`;
    bar.style.width = `${rect.width}px`;
    bar.style.height = `${rect.height}px`;
    bar.style.backgroundColor = color;
    overlay.appendChild(bar);
    bars.push(bar);
  }
  return bars;
}

/** True when two client rects overlap enough to mean stacked highlights
 * on the same glyphs (not merely adjacent lines). */
function clientRectsOverlap(a: DOMRect, b: DOMRect): boolean {
  return !(
    a.right <= b.left ||
    a.left >= b.right ||
    a.bottom <= b.top ||
    a.top >= b.bottom
  );
}

/** Hides verified (yellow) bars that sit under the red focus bars so the
 * two colours don't stack into an unreadable blot. Restores any yellow
 * that isn't covered. */
function syncVerifiedBarsUnderFocus(
  verifiedBars: HTMLElement[],
  focusBars: HTMLElement[],
): void {
  if (focusBars.length === 0) {
    for (const bar of verifiedBars) bar.style.visibility = "";
    return;
  }
  const focusRects = focusBars.map((bar) => bar.getBoundingClientRect());
  for (const verifiedBar of verifiedBars) {
    const verifiedRect = verifiedBar.getBoundingClientRect();
    const covered = focusRects.some((focusRect) =>
      clientRectsOverlap(verifiedRect, focusRect),
    );
    verifiedBar.style.visibility = covered ? "hidden" : "";
  }
}

function restoreAllVerifiedBars(pages: RenderedPage[]): void {
  for (const page of pages) {
    for (const bar of page.verifiedBars) bar.style.visibility = "";
  }
}

/** A scale that renders the page exactly as wide as `container` currently
 * is (minus a little padding), so a page never appears wider than its
 * viewer and forces horizontal scrolling with everything but the middle
 * cropped from view — the same fit-to-width a normal PDF viewer defaults
 * to, computed fresh per page since "view all" can mix portrait/landscape
 * pages of different native sizes in the same container. This is the
 * document's one native render scale — the user's +/- zoom is applied
 * afterward as a CSS zoom on the already-rendered pages (see
 * PdfHighlightBody's zoom effect), not by re-rendering at a different
 * scale, since re-rendering the whole document (a full pdfjsLib.getDocument
 * fetch + every page's canvas redrawn) on every zoom click is slow and
 * visibly a full reload, not the instant zoom a +/- control implies. */
function computeFitScale(page: PDFPageProxy, container: HTMLElement): number {
  const unscaledWidth = page.getViewport({ scale: 1 }).width;
  const availableWidth = Math.max(container.clientWidth - FIT_PADDING_PX, 100);
  const fit = availableWidth / unscaledWidth;
  return Math.min(MAX_RENDER_SCALE, Math.max(MIN_RENDER_SCALE, fit));
}

/** Nearest ancestor that actually scrolls on `axis` (or the element itself
 * if it does). Used so zoom can re-anchor both the panel's vertical scroller
 * and the pages container's own horizontal overflow. */
function findScrollParent(
  element: HTMLElement,
  axis: "x" | "y",
): HTMLElement | null {
  let current: HTMLElement | null = element;
  while (current) {
    const { overflowX, overflowY } = getComputedStyle(current);
    const overflow = axis === "y" ? overflowY : overflowX;
    if (/(auto|scroll|overlay)/.test(overflow)) return current;
    current = current.parentElement;
  }
  return document.scrollingElement instanceof HTMLElement
    ? document.scrollingElement
    : null;
}

/** Applies CSS zoom, then adjusts scroll so the point that was at the
 * viewport center before the change is still centered after — CSS zoom
 * alone leaves scrollTop/Left unchanged, which anchors to the top-left
 * and makes multi-page docs look like they jump to another page. */
function zoomContainerTowardViewportCenter(
  container: HTMLElement,
  previousZoom: number,
  nextZoom: number,
): void {
  if (previousZoom === nextZoom) {
    container.style.zoom = String(nextZoom);
    return;
  }

  const verticalScroller = findScrollParent(container, "y") ?? container;
  const horizontalScroller = findScrollParent(container, "x") ?? container;
  const verticalRect = verticalScroller.getBoundingClientRect();
  const horizontalRect = horizontalScroller.getBoundingClientRect();
  const viewCenterX = horizontalRect.left + horizontalScroller.clientWidth / 2;
  const viewCenterY = verticalRect.top + verticalScroller.clientHeight / 2;

  const beforeRect = container.getBoundingClientRect();
  const localX = (viewCenterX - beforeRect.left) / previousZoom;
  const localY = (viewCenterY - beforeRect.top) / previousZoom;

  container.style.zoom = String(nextZoom);

  const afterRect = container.getBoundingClientRect();
  horizontalScroller.scrollLeft +=
    afterRect.left + localX * nextZoom - viewCenterX;
  verticalScroller.scrollTop += afterRect.top + localY * nextZoom - viewCenterY;
}

/** Mean layout font-size of the matched text-layer spans (CSS px before
 * our viewer zoom). Null if nothing measurable. */
function averageMatchedFontSizePx(
  divs: HTMLElement[],
  itemIndices: Iterable<number>,
): number | null {
  let total = 0;
  let count = 0;
  for (const index of itemIndices) {
    const div = divs[index];
    if (!div?.textContent?.trim()) continue;
    const size = Number.parseFloat(getComputedStyle(div).fontSize);
    if (Number.isFinite(size) && size > 0) {
      total += size;
      count++;
    }
  }
  return count > 0 ? total / count : null;
}

/** Zoom that makes `layoutFontPx` render at about TARGET_FOCUS_FONT_PX.
 * Clamped to [1, ZOOM_MAX] so we never shrink below fit-width. */
function focusZoomForFontSize(layoutFontPx: number | null): number {
  if (layoutFontPx === null || layoutFontPx <= 0) {
    return 1.6; // prior fixed default when font-size can't be read
  }
  const ideal = TARGET_FOCUS_FONT_PX / layoutFontPx;
  const rounded = Math.round(ideal * 10) / 10;
  return Math.min(ZOOM_MAX, Math.max(1, rounded));
}

/** Zooms toward a font-size-based target and pans so the highlight bars
 * sit in the middle of the scrollport — used by Find-in-PDF. */
function revealFocusHighlight(
  container: HTMLElement,
  bars: HTMLElement[],
  currentZoom: number,
  targetZoom: number,
): number {
  const nextZoom = Math.min(ZOOM_MAX, Math.max(1, targetZoom));
  if (bars.length === 0) {
    container.style.zoom = String(nextZoom);
    return nextZoom;
  }

  let minLeft = Infinity;
  let minTop = Infinity;
  let maxRight = -Infinity;
  let maxBottom = -Infinity;
  for (const bar of bars) {
    const rect = bar.getBoundingClientRect();
    if (rect.width <= 0 && rect.height <= 0) continue;
    minLeft = Math.min(minLeft, rect.left);
    minTop = Math.min(minTop, rect.top);
    maxRight = Math.max(maxRight, rect.right);
    maxBottom = Math.max(maxBottom, rect.bottom);
  }
  if (!Number.isFinite(minLeft)) {
    container.style.zoom = String(nextZoom);
    return nextZoom;
  }

  const targetCenterX = (minLeft + maxRight) / 2;
  const targetCenterY = (minTop + maxBottom) / 2;
  const containerRect = container.getBoundingClientRect();
  const localX = (targetCenterX - containerRect.left) / currentZoom;
  const localY = (targetCenterY - containerRect.top) / currentZoom;

  container.style.zoom = String(nextZoom);

  const verticalScroller = findScrollParent(container, "y") ?? container;
  const horizontalScroller = findScrollParent(container, "x") ?? container;
  const afterRect = container.getBoundingClientRect();
  const viewCenterX =
    horizontalScroller.getBoundingClientRect().left +
    horizontalScroller.clientWidth / 2;
  const viewCenterY =
    verticalScroller.getBoundingClientRect().top +
    verticalScroller.clientHeight / 2;

  horizontalScroller.scrollLeft +=
    afterRect.left + localX * nextZoom - viewCenterX;
  verticalScroller.scrollTop += afterRect.top + localY * nextZoom - viewCenterY;

  return nextZoom;
}

const VERIFIED_COLOR = "rgba(250, 204, 21, 0.45)"; // yellow — readable alone
const FOCUS_COLOR = "rgba(239, 68, 68, 0.28)"; // red — kept light; never stacked on yellow

/** Everything findMatchedItemIndices/drawMatchHighlights need to
 * highlight a page again later without re-fetching or re-rendering it —
 * kept around after the initial render (see PdfHighlightBody's pagesRef)
 * so a focusedPhrase change can be handled by just searching this cached
 * data and drawing one more overlay bar. */
interface RenderedPage {
  pageDiv: HTMLDivElement;
  items: PageTextItem[];
  divs: HTMLElement[];
  overlay: HTMLElement;
  verifiedBars: HTMLElement[];
}

/** Renders one page (canvas + positioned text layer) into `container` and
 * highlights every verifiedPhrase match on it in yellow — the expensive
 * step (rasterizing a full page), so callers should only invoke this for
 * pages that actually need it. Does not handle focusedPhrase — that's
 * layered on afterward via highlightFocusedPhraseOnPage, reusing the
 * RenderedPage this returns, so refocusing never re-renders anything. */
async function renderPageWithHighlights(
  page: PDFPageProxy,
  container: HTMLElement,
  verifiedPhrases: string[],
): Promise<{ verifiedMatches: number; rendered: RenderedPage }> {
  const displayScale = computeFitScale(page, container);
  const displayViewport = page.getViewport({ scale: displayScale });

  // The canvas is rasterized at a higher resolution than it's displayed
  // (like any retina-aware canvas) so CSS zoom — which stretches
  // whatever pixels are already there rather than re-rendering (see the
  // zoom effect in PdfHighlightBody) — has headroom to zoom in without
  // visibly blurring, up to ZOOM_MAX. Capped in absolute terms too, so a
  // page that's already rendering at a large displayScale (a wide modal)
  // doesn't multiply into an unreasonably large canvas.
  const renderScale = Math.min(displayScale * ZOOM_MAX, 5);
  const renderViewport = page.getViewport({ scale: renderScale });

  const pageDiv = document.createElement("div");
  pageDiv.className = "pdf-highlight-page";
  pageDiv.style.width = `${displayViewport.width}px`;
  pageDiv.style.height = `${displayViewport.height}px`;
  container.appendChild(pageDiv);

  const canvas = document.createElement("canvas");
  canvas.width = renderViewport.width;
  canvas.height = renderViewport.height;
  canvas.style.width = `${displayViewport.width}px`;
  canvas.style.height = `${displayViewport.height}px`;
  pageDiv.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (ctx) {
    await page.render({ canvas, canvasContext: ctx, viewport: renderViewport })
      .promise;
  }

  // Sits between the canvas and the (invisible) text layer, purely so
  // the highlight bars painted into it show up above the rendered page —
  // see drawMatchHighlights.
  const highlightOverlay = document.createElement("div");
  highlightOverlay.className = "pdf-highlight-overlay";
  pageDiv.appendChild(highlightOverlay);

  const textLayerDiv = document.createElement("div");
  textLayerDiv.className = "pdf-text-layer";
  // Matches displayScale (what's actually shown in CSS pixels before any
  // zoom), not renderScale (the canvas's own higher-resolution bitmap) —
  // the text layer's positions need to line up with the displayed size.
  textLayerDiv.style.setProperty("--total-scale-factor", String(displayScale));
  pageDiv.appendChild(textLayerDiv);

  // includeMarkedContent: true (inside extractPageTextData) — needed so
  // each item's enclosing tagged-structure id survives, for
  // getReadingOrder's struct-tree path. TextLayer already has its own
  // handling for the resulting marked-content boundary items (wrapping
  // their spans in a <span class="markedContent"> container), so this
  // doesn't change what gets rendered, only what we can learn from it.
  const {
    textContent,
    items: rawItems,
    mcids,
    geom: rawGeom,
  } = await extractPageTextData(page);
  const textLayer = new pdfjsLib.TextLayer({
    textContentSource: textContent,
    container: textLayerDiv,
    viewport: displayViewport,
  });
  await textLayer.render();

  // Reordered into actual reading order (see getReadingOrder) — both the
  // items/divs arrays used for matching below AND the real DOM node
  // order, since native browser text selection follows DOM order too
  // (confirmed directly: manually dragging a selection in this renderer
  // bled into the next column exactly like the automatic highlighting
  // did, before this reordering). Moving already-rendered, absolutely
  // positioned nodes via appendChild doesn't change where they're drawn —
  // only their position in the DOM/selection order; a span currently
  // nested inside a markedContent wrapper (see above) simply becomes a
  // direct child of textLayerDiv instead; textLayerDiv is already each
  // span's nearest *positioned* ancestor either way (the wrapper itself
  // isn't positioned), so this doesn't move anything visually.
  const order = await getReadingOrder(page, mcids, rawGeom);
  const items = order.map((i) => rawItems[i]);
  const divs = order.map((i) => textLayer.textDivs[i]);
  for (const div of divs) textLayerDiv.appendChild(div);

  // Unioned across every verified phrase (not one drawMatchHighlights
  // call per phrase) so two phrases touching the same item only ever
  // produce one bar there, not two stacked on top of each other.
  let verifiedMatches = 0;
  const touchedItemIndices = new Set<number>();
  for (const phrase of verifiedPhrases) {
    const { count, itemIndices } = findMatchedItemIndices(items, phrase);
    verifiedMatches += count;
    for (const i of itemIndices) touchedItemIndices.add(i);
  }
  const verifiedBars = drawMatchHighlights(
    highlightOverlay,
    touchedItemIndices,
    divs,
    VERIFIED_COLOR,
  );

  return {
    verifiedMatches,
    rendered: {
      pageDiv,
      items,
      divs,
      overlay: highlightOverlay,
      verifiedBars,
    },
  };
}

/** Searches one already-rendered page's cached data for `phrase` and, if
 * found, draws a red highlight for it — the cheap path a focusedPhrase
 * change takes once the page is already on screen, versus the expensive
 * renderPageWithHighlights above. Hides any yellow bars under the red
 * ones so colours don't stack. Returns the bar elements drawn (for later
 * removal) and whether anything matched. */
function highlightFocusedPhraseOnPage(
  rendered: RenderedPage,
  phrase: string,
): { found: boolean; bars: HTMLElement[]; suggestedZoom: number } {
  const { itemIndices } = findMatchedItemIndices(rendered.items, phrase);
  if (itemIndices.size === 0) {
    return { found: false, bars: [], suggestedZoom: 1 };
  }
  const bars = drawMatchHighlights(
    rendered.overlay,
    itemIndices,
    rendered.divs,
    FOCUS_COLOR,
  );
  syncVerifiedBarsUnderFocus(rendered.verifiedBars, bars);
  const suggestedZoom = focusZoomForFontSize(
    averageMatchedFontSizePx(rendered.divs, itemIndices),
  );
  return { found: true, bars, suggestedZoom };
}

/** Which verified phrases have no match on any already-rendered page —
 * run after the multi-page load so the commitments list can flag them. */
function findMissingPhrases(
  pages: RenderedPage[],
  phrases: string[],
): string[] {
  return phrases.filter(
    (phrase) =>
      !pages.some(
        (page) => findMatchedItemIndices(page.items, phrase).count > 0,
      ),
  );
}

export interface PdfHighlightTarget {
  url: string;
  /** Every verified commitment's text — marked yellow throughout the
   * document. Pass an empty array (with focusedPhrase set) for the fast
   * single-commitment path, which only renders the one matching page
   * instead of the whole document — used by the modal variant, where
   * every open is a fresh mount anyway. The panel variant always passes
   * every verified phrase here, even for a single clicked commitment, so
   * the same fully-rendered document can be reused across clicks (see
   * the refocus effect below). */
  verifiedPhrases: string[];
  /** The one commitment the user clicked in on, if any — marked red and
   * scrolled into view once found. Changing this alone (with url/
   * verifiedPhrases unchanged) does not reload or re-render the document —
   * see the refocus effect below. */
  focusedPhrase?: string;
  /** Fires after the PDF has been opened and searched — never before open.
   * `missingPhrases` are verified texts we still couldn't locate in the
   * pdf.js text layer (so the commitments list can flag them for manual
   * checking). `searchedPhrases` is what this pass looked for, so a
   * single-commitment find can update just that one without wiping a
   * prior "view all" result. */
  onVerifiedSearchComplete?: (result: {
    searchedPhrases: string[];
    missingPhrases: string[];
  }) => void;
}

/** The actual PDF loading/searching/rendering logic, shared by both the
 * full-screen modal and the side-by-side panel below — the two differ
 * only in chrome (a Dialog vs. a plain bordered pane), not in how the PDF
 * itself gets fetched, searched, or highlighted. */
function PdfHighlightBody({
  open,
  url,
  verifiedPhrases,
  focusedPhrase,
  onVerifiedSearchComplete,
}: PdfHighlightTarget & { open: boolean }) {
  // A callback ref backed by state, not a plain useRef — when this runs
  // inside the modal variant, Radix Dialog's Content (see dialog.tsx's
  // data-[state=open]:animate-in classes) takes an extra render cycle to
  // actually mount its children the first time it opens, so a plain ref
  // is still null when this component's first effect run checks it.
  // Since nothing in the effect's dependency array changes afterward,
  // that left it permanently bailing out with the spinner stuck forever.
  // Storing the node in state means React re-renders (and the effect
  // below re-runs) at the exact moment the node actually attaches,
  // however many cycles that takes — harmless overhead in the panel
  // variant, which doesn't have this delay.
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matchCount, setMatchCount] = useState(0);
  const [missingPhraseCount, setMissingPhraseCount] = useState(0);
  const [focusFound, setFocusFound] = useState(false);
  // Only meaningful in the fast single-page path — lets the description
  // say "not found anywhere in the document" instead of the more
  // ambiguous default message once loading finishes with zero matches.
  const [searchedWholeDoc, setSearchedWholeDoc] = useState(false);
  // The user's +/- adjustment on top of the document's native fit-to-width
  // render (see computeFitScale) — 1 means "as rendered". Applied as a
  // CSS zoom on the container below (not by re-rendering pages at a new
  // scale): re-rendering means a fresh pdfjsLib.getDocument fetch and
  // every page's canvas redrawn from scratch, which is slow and visibly
  // a full reload — exactly what a +/- zoom control shouldn't do. Reset
  // per document, since a zoom level chosen for one PDF's layout isn't
  // necessarily right for the next one.
  const [zoom, setZoom] = useState(1);
  const previousZoomRef = useRef(1);
  const pagesRef = useRef<RenderedPage[]>([]);
  const focusBarsRef = useRef<HTMLElement[]>([]);

  // Keep the latest callback without putting it in effect deps — a new
  // arrow from the parent every render must not re-fetch the PDF.
  const onVerifiedSearchCompleteRef = useRef(onVerifiedSearchComplete);
  onVerifiedSearchCompleteRef.current = onVerifiedSearchComplete;

  const isFocusedOnly = verifiedPhrases.length === 0 && !!focusedPhrase;

  // The caller's plan-detail data gets refetched on a poll elsewhere in
  // the tree, which hands us a brand-new (but content-identical) array
  // every few seconds — .filter().map() upstream always allocates fresh.
  // Depending on verifiedPhrases directly would re-trigger the load
  // effect below (wiping and re-rendering every page) on every one of
  // those polls. Keying on the joined content instead means it only
  // reruns when the actual set of verified phrases changes.
  const verifiedPhrasesKey = verifiedPhrases.join("|");

  useEffect(() => {
    setZoom(1);
    previousZoomRef.current = 1;
  }, [url]);

  // Instant, non-reloading zoom: CSS zoom scales layout (unlike
  // transform: scale), then we re-anchor scroll so the viewport's center
  // stays on the same spot of the page — without that, scrollTop is
  // unchanged and the zoom appears to grow from the top (often another
  // page than the one you were looking at).
  useEffect(() => {
    if (!container) return;
    const previousZoom = previousZoomRef.current;
    previousZoomRef.current = zoom;
    zoomContainerTowardViewportCenter(container, previousZoom, zoom);

    // Focus bars are measured via getClientRects (visual pixels). After a
    // zoom change, redraw the current focus highlight so it stays glued to
    // the text — same path as clicking Find again.
    if (previousZoom === zoom || isLoading || isFocusedOnly || !focusedPhrase) {
      return;
    }
    for (const bar of focusBarsRef.current) bar.remove();
    focusBarsRef.current = [];
    restoreAllVerifiedBars(pagesRef.current);
    for (const rendered of pagesRef.current) {
      const result = highlightFocusedPhraseOnPage(rendered, focusedPhrase);
      if (result.found) {
        focusBarsRef.current.push(...result.bars);
        break;
      }
    }
  }, [container, zoom, focusedPhrase, isLoading, isFocusedOnly]);

  // Full multi-page load — renders every page with verifiedPhrases
  // highlighted yellow. Skipped for the fast single-page path (isFocusedOnly),
  // which the effect below handles instead. Deliberately does not depend
  // on zoom — see the zoom effect above for why.
  useEffect(() => {
    if (!open || !container || isFocusedOnly) return;

    let cancelled = false;
    let loadingTask: ReturnType<typeof pdfjsLib.getDocument> | null = null;
    setIsLoading(true);
    setError(null);
    setMatchCount(0);
    setMissingPhraseCount(0);
    setFocusFound(false);
    container.innerHTML = "";
    pagesRef.current = [];
    focusBarsRef.current = [];

    (async () => {
      try {
        loadingTask = pdfjsLib.getDocument({ url });
        const doc = await Promise.race([
          loadingTask.promise,
          new Promise<never>((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error(
                    "Timed out after 20s loading the PDF — the pdf.js worker likely failed to initialize",
                  ),
                ),
              20000,
            ),
          ),
        ]);

        let totalMatches = 0;
        for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
          if (cancelled) return;
          const page = await doc.getPage(pageNum);
          const { verifiedMatches, rendered } = await renderPageWithHighlights(
            page,
            container,
            verifiedPhrases,
          );
          if (cancelled) return;
          totalMatches += verifiedMatches;
          pagesRef.current.push(rendered);
        }

        if (!cancelled) {
          const missingPhrases = findMissingPhrases(
            pagesRef.current,
            verifiedPhrases,
          );
          setMatchCount(totalMatches);
          setMissingPhraseCount(missingPhrases.length);
          setIsLoading(false);
          onVerifiedSearchCompleteRef.current?.({
            searchedPhrases: verifiedPhrases,
            missingPhrases,
          });
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load PDF");
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      // Aborts network requests and tears down the worker + any rendered
      // page canvases — without this, every reload (new url, phrase set,
      // or panel close) leaked the full previous document.
      loadingTask?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally keyed on verifiedPhrasesKey (a content signature), not verifiedPhrases by reference — see comment above its definition
  }, [open, url, verifiedPhrasesKey, container, isFocusedOnly]);

  // Fast single-page path — only used when there's no verifiedPhrases set
  // (the modal's per-commitment "Find in PDF", not the panel): scans page
  // text cheaply to find focusedPhrase without rendering anything, then
  // renders + highlights just that one page. Reloads on every
  // focusedPhrase change since each modal open is a fresh mount with
  // nothing cached to reuse anyway.
  useEffect(() => {
    if (!open || !container || !isFocusedOnly) return;

    let cancelled = false;
    let loadingTask: ReturnType<typeof pdfjsLib.getDocument> | null = null;
    setIsLoading(true);
    setError(null);
    setFocusFound(false);
    setMissingPhraseCount(0);
    setSearchedWholeDoc(false);
    container.innerHTML = "";

    (async () => {
      try {
        loadingTask = pdfjsLib.getDocument({ url });
        const doc = await Promise.race([
          loadingTask.promise,
          new Promise<never>((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error(
                    "Timed out after 20s loading the PDF — the pdf.js worker likely failed to initialize",
                  ),
                ),
              20000,
            ),
          ),
        ]);

        const needleCandidates = foldedNeedleCandidates(focusedPhrase!);
        let targetPageNum: number | null = null;
        for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
          if (cancelled) return;
          const page = await doc.getPage(pageNum);
          const items = await getPageItems(page);
          const { text } = joinPageItems(items);
          const searchable = foldForSearch(text);
          if (needleCandidates.some((needle) => searchable.includes(needle))) {
            targetPageNum = pageNum;
            break;
          }
        }
        if (cancelled) return;

        let foundFocused = false;
        if (targetPageNum !== null) {
          const page = await doc.getPage(targetPageNum);
          const { rendered } = await renderPageWithHighlights(
            page,
            container,
            [],
          );
          if (cancelled) return;
          const { found, bars, suggestedZoom } = highlightFocusedPhraseOnPage(
            rendered,
            focusedPhrase!,
          );
          foundFocused = found;
          if (found) {
            setFocusFound(true);
            focusBarsRef.current = bars;
            requestAnimationFrame(() => {
              if (cancelled || !container) return;
              const nextZoom = revealFocusHighlight(
                container,
                bars,
                previousZoomRef.current,
                suggestedZoom,
              );
              previousZoomRef.current = nextZoom;
              setZoom(nextZoom);
            });
          }
        } else {
          setSearchedWholeDoc(true);
        }
        setMissingPhraseCount(foundFocused ? 0 : 1);
        setIsLoading(false);
        onVerifiedSearchCompleteRef.current?.({
          searchedPhrases: [focusedPhrase!],
          missingPhrases: foundFocused ? [] : [focusedPhrase!],
        });
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load PDF");
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      loadingTask?.destroy();
    };
  }, [open, url, focusedPhrase, container, isFocusedOnly]);

  // Refocus — runs whenever focusedPhrase changes while the full
  // multi-page render above is already in place (the panel's normal
  // case: the user clicks a different commitment's "Find in PDF" without
  // closing the panel). Reuses the cached per-page data instead of
  // re-fetching or re-rendering anything.
  useEffect(() => {
    if (isFocusedOnly || isLoading) return;

    for (const bar of focusBarsRef.current) bar.remove();
    focusBarsRef.current = [];
    restoreAllVerifiedBars(pagesRef.current);

    if (!focusedPhrase) {
      setFocusFound(false);
      return;
    }

    let found = false;
    for (const rendered of pagesRef.current) {
      const result = highlightFocusedPhraseOnPage(rendered, focusedPhrase);
      if (result.found) {
        focusBarsRef.current.push(...result.bars);
        found = true;
        requestAnimationFrame(() => {
          if (!container) return;
          const nextZoom = revealFocusHighlight(
            container,
            result.bars,
            previousZoomRef.current,
            result.suggestedZoom,
          );
          previousZoomRef.current = nextZoom;
          setZoom(nextZoom);
        });
        break;
      }
    }
    setFocusFound(found);
    if (focusedPhrase) {
      onVerifiedSearchCompleteRef.current?.({
        searchedPhrases: [focusedPhrase],
        missingPhrases: found ? [] : [focusedPhrase],
      });
    }
    // isLoading flipping false->true->false around a reload (a new
    // verifiedPhrasesKey) re-triggers this both times; the first run is a
    // no-op (guarded above), and the second searches the freshly
    // rendered pagesRef, so no separate "did it just finish" signal is
    // needed beyond isLoading itself.
  }, [focusedPhrase, isLoading, isFocusedOnly, container]);

  const description = isLoading
    ? isFocusedOnly
      ? "Searching for the passage…"
      : "Loading and searching every page…"
    : error
      ? undefined
      : isFocusedOnly
        ? focusFound
          ? "Passage found and highlighted in red"
          : searchedWholeDoc
            ? "Not found in the PDF text layer — marked in the commitments list for manual check"
            : undefined
        : `${matchCount} verified passage(s) highlighted in yellow` +
          (missingPhraseCount > 0
            ? ` — ${missingPhraseCount} not found in the PDF text layer (marked in the list)`
            : "") +
          (focusedPhrase
            ? focusFound
              ? " — the selected commitment is highlighted in red"
              : " — the selected commitment wasn't found (marked in the list)"
            : "");

  const zoomOutDisabled = isLoading || zoom <= ZOOM_MIN;
  const zoomInDisabled = isLoading || zoom >= ZOOM_MAX;

  return (
    <>
      <style>{TEXT_LAYER_CSS}</style>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-gray-04 py-1">
        {description ? (
          <p className="text-sm text-gray-02">{description}</p>
        ) : (
          <span />
        )}
        {!error && (
          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={() =>
                setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)))
              }
              disabled={zoomOutDisabled}
              className="rounded-sm p-1 text-gray-02 opacity-70 hover:bg-gray-03/60 hover:opacity-100 disabled:pointer-events-none disabled:opacity-30"
              title="Zoom out"
            >
              <Minus className="h-3.5 w-3.5" />
              <span className="sr-only">Zoom out</span>
            </button>
            <span className="w-10 text-center text-xs tabular-nums text-gray-02">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() =>
                setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)))
              }
              disabled={zoomInDisabled}
              className="rounded-sm p-1 text-gray-02 opacity-70 hover:bg-gray-03/60 hover:opacity-100 disabled:pointer-events-none disabled:opacity-30"
              title="Zoom in"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="sr-only">Zoom in</span>
            </button>
          </div>
        )}
      </div>
      {error ? (
        <p className="text-sm text-pink-03">Could not load PDF: {error}</p>
      ) : (
        <>
          {isLoading && (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 text-blue-03 animate-spin" />
            </div>
          )}
          <div
            ref={setContainer}
            // Zoom is applied here; horizontal/vertical scrolling lives on an
            // ancestor (panel/modal). Putting overflow on the zoomed node
            // itself fails — CSS zoom grows its layout box so it never
            // overflows, and left/right panning after zoom becomes impossible.
            className="flex w-max min-w-full flex-col items-center"
          />
        </>
      )}
    </>
  );
}

export interface PdfHighlightViewerProps extends PdfHighlightTarget {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Full-screen modal variant — a Dialog on top of whatever's open behind
 * it. Used on small/medium screens, where there isn't room for the PDF
 * and the commitments list side by side (see PdfHighlightPanel for that). */
export function PdfHighlightViewer({
  open,
  onOpenChange,
  url,
  verifiedPhrases,
  focusedPhrase,
  onVerifiedSearchComplete,
}: PdfHighlightViewerProps) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="6xl"
      scrollable
      title="Source PDF"
    >
      <PdfHighlightBody
        open={open}
        url={url}
        verifiedPhrases={verifiedPhrases}
        focusedPhrase={focusedPhrase}
        onVerifiedSearchComplete={onVerifiedSearchComplete}
      />
    </Modal>
  );
}

export interface PdfHighlightPanelProps extends PdfHighlightTarget {
  onClose: () => void;
}

/** Inline side-by-side variant — no Dialog/overlay, just a bordered pane
 * meant to sit next to the commitments list so both stay visible and
 * scrollable at once (see StepResultDialog's large-screen split layout). */
export function PdfHighlightPanel({
  url,
  verifiedPhrases,
  focusedPhrase,
  onVerifiedSearchComplete,
  onClose,
}: PdfHighlightPanelProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-2 flex items-center justify-between gap-2 border-b border-gray-03 pb-2">
        <h3 className="text-sm font-semibold text-gray-01">Source PDF</h3>
        <button
          onClick={onClose}
          className="rounded-sm p-1 text-gray-02 opacity-70 hover:bg-gray-03/60 hover:opacity-100"
          title="Close"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <PdfHighlightBody
          open
          url={url}
          verifiedPhrases={verifiedPhrases}
          focusedPhrase={focusedPhrase}
          onVerifiedSearchComplete={onVerifiedSearchComplete}
        />
      </div>
    </div>
  );
}
