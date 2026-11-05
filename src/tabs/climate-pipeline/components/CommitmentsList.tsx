import { useState } from "react";
import {
  FileCheck,
  FileWarning,
  Image,
  SearchCheck,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  Commitment,
  DocumentReference,
  DocumentReferenceRelationship,
} from "../hooks/useClimatePlanDetail";
import { reviewKey } from "../hooks/usePipelineReviews";
import { ReviewControls } from "./ReviewControls";
import {
  COMMITMENT_THEME_OPTIONS,
  actionableFilterSuggestEditor,
  climateFilterSuggestEditor,
  extractCommitmentSuggestEditor,
  similarGroupSuggestEditor,
  themeSuggestEditor,
} from "./structuredSuggestEditors";
import { commitmentEntityId } from "../lib/stepReviewEntities";
import type { ReviewContext } from "./reviewContext";
import { MetaChip, QaFooter, type MetaChipTone } from "./stepResultListUi";
import { RunCompanionButton } from "./stepResultDialogChrome";
import type { PdfViewerState } from "./commitmentPdf";

function documentReferenceTone(
  relationship: DocumentReferenceRelationship,
): MetaChipTone {
  switch (relationship) {
    case "companion":
      return "type";
    case "initiative":
      return "relevance";
    default:
      return "score";
  }
}

function YesNo({ value }: { value: boolean | null }) {
  if (value === null) return <span className="text-gray-02">—</span>;
  return (
    <span className={value ? "text-green-03" : "text-pink-03"}>
      {value ? "Yes" : "No"}
    </span>
  );
}

/** Compact groundedness flag — visible on every commitment step. */
function FoundInDocumentFlag({ unverified }: { unverified: boolean }) {
  const found = !unverified;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
        found
          ? "border-green-03/40 bg-green-03/10 text-green-03"
          : "border-orange-03/40 bg-orange-03/10 text-orange-03",
      )}
      title={
        found
          ? "Found in document — quote grounded in plan markdown"
          : "Not found in document — may be invented or unfindable"
      }
    >
      {found ? (
        <FileCheck className="h-3 w-3" aria-hidden />
      ) : (
        <FileWarning className="h-3 w-3" aria-hidden />
      )}
      <span>{found ? "In markdown" : "Not in markdown"}</span>
    </span>
  );
}

/** Flags commitments sourced from a recovered image (OCR/AI description) —
 * these won't be findable via the PDF text layer's "Find in PDF" search. */
function ImageSourceFlag() {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-md border border-blue-03/40 bg-blue-03/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-03"
      title="Extracted from a recovered image (OCR/AI description), not the document's text layer — not searchable in the PDF"
    >
      <Image className="h-3 w-3" aria-hidden />
      <span>From image</span>
    </span>
  );
}

/** Shown after a PDF search couldn't re-locate a markdown-verified quote
 * in the pdf.js text layer — worth a manual look in the source PDF. */
function NotFoundInPdfFlag() {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-md border border-pink-03/40 bg-pink-03/10 px-1.5 py-0.5 text-[10px] font-medium text-pink-03"
      title="Verified in plan markdown, but not found again in the PDF text layer — check manually if needed"
    >
      <FileWarning className="h-3 w-3" aria-hidden />
      <span>Not in PDF text</span>
    </span>
  );
}

const ORIGIN_LABELS: Record<string, string> = {
  region: "region",
  national: "national",
  eu: "EU",
  other: "other",
};

/** Flags a commitment whose target/measure is explicitly attributed to
 * another body rather than being the municipality's own — not always a
 * numeric "goal", can equally be a measure someone else suggested.
 * Independent of actor: the municipality is usually still the one doing
 * the committing. Can name more than one body at once. */
function OriginFlag({
  originatesFrom,
}: {
  originatesFrom: Commitment["originatesFrom"];
}) {
  if (!originatesFrom || originatesFrom.length === 0) return null;
  const label = originatesFrom.map((o) => ORIGIN_LABELS[o] ?? o).join(", ");
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-md border border-blue-03/40 bg-blue-03/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-03"
      title={`Originates from ${label} — not a target/measure the municipality set itself`}
    >
      <Target className="h-3 w-3" aria-hidden />
      <span>Originates from: {label}</span>
    </span>
  );
}

function CommitmentReviewControls({
  commitment,
  columns,
  reviewCtx,
}: {
  commitment: Commitment;
  columns: "extract" | "climate" | "actionable";
  reviewCtx: ReviewContext;
}) {
  const entityKey = reviewKey(
    reviewCtx.step,
    "commitment",
    commitmentEntityId(commitment),
  );
  const snapshot = {
    stableId: commitment.stableId,
    text: commitment.text,
    climateRelevant: commitment.climateRelevant,
    adaptation: commitment.adaptation,
    climateFilterReason: commitment.climateFilterReason,
    actionable: commitment.actionable,
    actionableReason: commitment.actionableReason,
    unverified: commitment.unverified,
    foundInDocument: !commitment.unverified,
    section: commitment.section,
    type: commitment.type,
  };

  const defaultSuggestedValue =
    columns === "climate"
      ? {
          climateRelevant: commitment.climateRelevant ?? false,
          adaptation: commitment.adaptation,
        }
      : columns === "actionable"
        ? { actionable: commitment.actionable ?? false }
        : {
            foundInDocument: !commitment.unverified,
          };

  const suggestEditor =
    columns === "climate"
      ? climateFilterSuggestEditor({
          climateRelevant: commitment.climateRelevant,
          adaptation: commitment.adaptation,
        })
      : columns === "actionable"
        ? actionableFilterSuggestEditor(commitment.actionable)
        : extractCommitmentSuggestEditor({
            unverified: commitment.unverified,
          });

  return (
    <ReviewControls
      planId={reviewCtx.planId}
      step={reviewCtx.step}
      entityType="commitment"
      entityId={commitmentEntityId(commitment)}
      reviewedSnapshot={snapshot}
      review={reviewCtx.reviewsByEntity.get(entityKey)}
      defaultSuggestedValue={defaultSuggestedValue}
      suggestEditor={suggestEditor}
      onChanged={(next) => reviewCtx.onReviewChanged(next, entityKey)}
    />
  );
}

export function DocumentReferencesList({
  documentReferences,
}: {
  documentReferences: DocumentReference[];
}) {
  if (documentReferences.length === 0) {
    return (
      <p className="text-sm text-gray-02">
        No referenced documents found in this plan.
      </p>
    );
  }

  // groupDocumentReferences assigns groupId to rows naming the same
  // document from different sections — collapse those into one card so
  // the list doesn't repeat "avfallsplan" and "Avfallsplan" separately.
  // Ungrouped rows (groupId null) fall back to a group of one, keyed by
  // their own id.
  const groups = new Map<string, DocumentReference[]>();
  for (const ref of documentReferences) {
    const key = ref.groupId ?? ref.id;
    const list = groups.get(key) ?? [];
    list.push(ref);
    groups.set(key, list);
  }
  // A group's relationship is whichever member is "companion" — one
  // mention explicitly tying it to this plan's own measures outweighs
  // other mentions that were merely topically relevant. "initiative" is
  // the next strongest signal (an explicit adoption act), then "related".
  const groupedRefs = [...groups.values()].map((members) => ({
    name: members[0].name,
    relationship: members.some((m) => m.relationship === "companion")
      ? ("companion" as const)
      : members.some((m) => m.relationship === "initiative")
        ? ("initiative" as const)
        : ("related" as const),
    members,
  }));

  const companions = groupedRefs.filter((g) => g.relationship === "companion");
  const initiatives = groupedRefs.filter(
    (g) => g.relationship === "initiative",
  );
  const related = groupedRefs.filter((g) => g.relationship === "related");

  const renderGroup = (group: (typeof groupedRefs)[number]) => (
    <article
      key={group.members[0].id}
      className="rounded-lg border border-gray-03/50 bg-gray-03/20 p-3 min-w-0 space-y-2"
    >
      <div className="flex flex-wrap items-center gap-2">
        <MetaChip
          label="Relationship"
          tone={documentReferenceTone(group.relationship)}
        >
          {group.relationship}
        </MetaChip>
        <span className="text-sm font-medium text-gray-01">{group.name}</span>
        {group.members.length > 1 && (
          <span className="text-xs text-gray-02">
            mentioned {group.members.length}×
          </span>
        )}
        {group.relationship === "companion" &&
          (() => {
            const runUrl = group.members.find((m) => m.url)?.url;
            return runUrl ? (
              <RunCompanionButton url={runUrl} name={group.name} />
            ) : null;
          })()}
      </div>
      <div className="space-y-2 border-l-2 border-gray-03/50 pl-3">
        {group.members.map((ref) => (
          <div key={ref.id} className="space-y-0.5">
            <p className="text-xs text-gray-02 break-words">
              Section: {ref.section}
            </p>
            <p className="text-sm text-gray-01 break-words">
              &ldquo;{ref.quote}&rdquo;
            </p>
            <p className="text-xs italic text-gray-02 break-words">
              {ref.reasoning}
            </p>
            {ref.url && (
              <a
                href={ref.url}
                target="_blank"
                rel="noreferrer"
                className="inline-block break-all text-xs text-blue-500 underline"
              >
                {ref.url}
              </a>
            )}
          </div>
        ))}
      </div>
    </article>
  );

  return (
    <div className="space-y-4">
      {companions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-02">
            Companion — likely holds this plan&apos;s own measures (
            {companions.length})
          </p>
          <div className="space-y-2">{companions.map(renderGroup)}</div>
        </div>
      )}
      {initiatives.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-02">
            Initiative — a regional/national program the municipality has
            explicitly joined ({initiatives.length})
          </p>
          <div className="space-y-2">{initiatives.map(renderGroup)}</div>
        </div>
      )}
      {related.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-02">
            Related documents ({related.length})
          </p>
          <div className="space-y-2">{related.map(renderGroup)}</div>
        </div>
      )}
    </div>
  );
}

export function CommitmentsList({
  commitments,
  documentReferences,
  columns,
  reviewCtx,
  allVerifiedPhrases,
  climatePassedPhrases,
  climateFilteredOutPhrases,
  pdfMissingPhrases,
  setPdfViewer,
  /** Hide list-only chrome (bulk PDF, groundedness filters, group headers
   * copy) so Review mode can show one clean card. */
  focusSingle = false,
  /** Review mode for theme/similar: one group with its section header,
   * without the list-wide intro line. */
  focusGroup = false,
  /** Full eligible set for suggest editors — when the visible list is
   * filtered or single-item, options still cover every group/theme. */
  optionCommitments,
}: {
  commitments: Commitment[];
  documentReferences?: DocumentReference[];
  columns: "extract" | "climate" | "actionable" | "similar" | "themes";
  reviewCtx: ReviewContext;
  allVerifiedPhrases: string[];
  /** Only used when columns === "climate" — see the view-all-in-PDF button
   * further down, which colors these green/gray instead of flat yellow. */
  climatePassedPhrases: string[];
  climateFilteredOutPhrases: string[];
  pdfMissingPhrases: Set<string>;
  setPdfViewer: (v: PdfViewerState | null) => void;
  focusSingle?: boolean;
  focusGroup?: boolean;
  optionCommitments?: Commitment[];
}) {
  const optionsSource = optionCommitments ?? commitments;
  // Declared before the early return below so it's called unconditionally
  // on every render, per rules of hooks — only used by the default
  // (extract/climate/actionable) list further down, not the grouped
  // similar/themes views.
  const [flagFilter, setFlagFilter] = useState<
    "all" | "not-in-markdown" | "not-in-pdf"
  >("all");

  if (commitments.length === 0) {
    return <p className="text-sm text-gray-02">No commitments yet.</p>;
  }

  const referencesBySection = new Map<string, DocumentReference[]>();
  for (const ref of documentReferences ?? []) {
    const list = referencesBySection.get(ref.section) ?? [];
    list.push(ref);
    referencesBySection.set(ref.section, list);
  }

  const missingInView = commitments.filter((c) =>
    pdfMissingPhrases.has(c.text),
  ).length;

  if (columns === "similar") {
    const groups = new Map<string, Commitment[]>();
    const singletons: Commitment[] = [];
    for (const c of commitments) {
      if (c.similarGroupId) {
        const list = groups.get(c.similarGroupId) ?? [];
        list.push(c);
        groups.set(c.similarGroupId, list);
      } else {
        singletons.push(c);
      }
    }
    const groupOptions = [
      ...new Set(
        optionsSource
          .map((c) => c.similarGroupId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    const renderCommitmentRow = (c: Commitment) => {
      const entityKey = reviewKey(
        reviewCtx.step,
        "commitment",
        commitmentEntityId(c),
      );
      return (
        <li key={c.id} className="min-w-0 space-y-1.5 px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11px] text-gray-02">
              {c.stableId}
            </span>
            <FoundInDocumentFlag unverified={c.unverified} />
            {c.fromRecoveredImage && <ImageSourceFlag />}
            {pdfMissingPhrases.has(c.text) && <NotFoundInPdfFlag />}
            <OriginFlag originatesFrom={c.originatesFrom} />
          </div>
          <p className="text-sm text-gray-01 break-words">{c.text}</p>
          <QaFooter>
            <ReviewControls
              planId={reviewCtx.planId}
              step={reviewCtx.step}
              entityType="commitment"
              entityId={commitmentEntityId(c)}
              reviewedSnapshot={{
                id: c.id,
                stableId: c.stableId,
                text: c.text,
                similarGroupId: c.similarGroupId,
                unverified: c.unverified,
                foundInDocument: !c.unverified,
              }}
              review={reviewCtx.reviewsByEntity.get(entityKey)}
              defaultSuggestedValue={{ similarGroupId: c.similarGroupId }}
              suggestEditor={similarGroupSuggestEditor(
                c.similarGroupId,
                groupOptions,
              )}
              onChanged={(next) => reviewCtx.onReviewChanged(next, entityKey)}
            />
          </QaFooter>
        </li>
      );
    };

    if (focusSingle) {
      return (
        <ul className="divide-y divide-gray-03/40 rounded-lg border border-gray-03/60 bg-gray-03/15">
          {commitments.map(renderCommitmentRow)}
        </ul>
      );
    }

    return (
      <div className="space-y-3">
        {!focusGroup && (
          <p className="text-xs text-gray-02">
            {groups.size} duplicate group(s), {singletons.length} unique
            commitment(s) — mark each commitment; Review mode walks one group at
            a time
          </p>
        )}
        {[...groups.entries()]
          .sort(([, a], [, b]) => b.length - a.length)
          .map(([groupId, members]) => (
            <section
              key={groupId}
              className="min-w-0 overflow-hidden rounded-lg border border-gray-03/60 bg-gray-03/15"
            >
              <header className="flex flex-wrap items-center gap-2 border-b border-gray-03/50 bg-gray-03/40 px-3 py-2">
                <span className="text-sm font-semibold text-gray-01">
                  Duplicate group
                </span>
                <span className="rounded-full bg-gray-04/60 px-2 py-0.5 text-[11px] tabular-nums text-gray-02">
                  {members.length}
                </span>
                <span
                  className="max-w-full truncate font-mono text-[10px] text-gray-02"
                  title={groupId}
                >
                  {groupId}
                </span>
              </header>
              <ul className="divide-y divide-gray-03/40">
                {members.map(renderCommitmentRow)}
              </ul>
            </section>
          ))}
        {singletons.length > 0 && (
          <section className="min-w-0 overflow-hidden rounded-lg border border-gray-03/60 bg-gray-03/15">
            <header className="flex flex-wrap items-center gap-2 border-b border-gray-03/50 bg-gray-03/40 px-3 py-2">
              <span className="text-sm font-semibold text-gray-01">Unique</span>
              <span className="rounded-full bg-gray-04/60 px-2 py-0.5 text-[11px] tabular-nums text-gray-02">
                {singletons.length}
              </span>
            </header>
            <ul className="divide-y divide-gray-03/40">
              {singletons.map(renderCommitmentRow)}
            </ul>
          </section>
        )}
      </div>
    );
  }

  if (columns === "themes") {
    const byTheme = new Map<string, Commitment[]>();
    for (const c of commitments) {
      const key = c.theme ?? "(none)";
      const list = byTheme.get(key) ?? [];
      list.push(c);
      byTheme.set(key, list);
    }
    const themeOptions = [
      ...COMMITMENT_THEME_OPTIONS,
      ...[
        ...new Set(
          optionsSource
            .map((c) => c.theme)
            .filter((theme): theme is string => Boolean(theme)),
        ),
      ].filter(
        (key) =>
          key !== "(none)" &&
          !(COMMITMENT_THEME_OPTIONS as readonly string[]).includes(key),
      ),
    ];

    const renderThemeRow = (c: Commitment) => {
      const entityKey = reviewKey(
        reviewCtx.step,
        "commitment",
        commitmentEntityId(c),
      );
      return (
        <li key={c.id} className="min-w-0 space-y-1.5 px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11px] text-gray-02">
              {c.stableId}
            </span>
            <FoundInDocumentFlag unverified={c.unverified} />
            {c.fromRecoveredImage && <ImageSourceFlag />}
            {pdfMissingPhrases.has(c.text) && <NotFoundInPdfFlag />}
            <OriginFlag originatesFrom={c.originatesFrom} />
          </div>
          <p className="text-sm text-gray-01 break-words">{c.text}</p>
          <QaFooter>
            <ReviewControls
              planId={reviewCtx.planId}
              step={reviewCtx.step}
              entityType="commitment"
              entityId={commitmentEntityId(c)}
              reviewedSnapshot={{
                id: c.id,
                stableId: c.stableId,
                text: c.text,
                theme: c.theme,
                unverified: c.unverified,
                foundInDocument: !c.unverified,
              }}
              review={reviewCtx.reviewsByEntity.get(entityKey)}
              defaultSuggestedValue={{
                theme: c.theme ?? "other",
              }}
              suggestEditor={themeSuggestEditor(
                c.theme ?? "(none)",
                themeOptions,
              )}
              onChanged={(next) => reviewCtx.onReviewChanged(next, entityKey)}
            />
          </QaFooter>
        </li>
      );
    };

    if (focusSingle) {
      return (
        <ul className="divide-y divide-gray-03/40 rounded-lg border border-gray-03/60 bg-gray-03/15">
          {commitments.map(renderThemeRow)}
        </ul>
      );
    }

    return (
      <div className="space-y-3">
        {!focusGroup && (
          <p className="text-xs text-gray-02">
            Commitments grouped by theme — mark each commitment; Review mode
            walks one theme at a time
          </p>
        )}
        {[...byTheme.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([theme, members]) => (
            <section
              key={theme}
              className="min-w-0 overflow-hidden rounded-lg border border-gray-03/60 bg-gray-03/15"
            >
              <header className="flex flex-wrap items-center gap-2 border-b border-gray-03/50 bg-gray-03/40 px-3 py-2">
                <span className="text-sm font-semibold capitalize text-gray-01">
                  {theme}
                </span>
                <span className="rounded-full bg-gray-04/60 px-2 py-0.5 text-[11px] tabular-nums text-gray-02">
                  {members.length}
                </span>
              </header>
              <ul className="divide-y divide-gray-03/40">
                {members.map(renderThemeRow)}
              </ul>
            </section>
          ))}
      </div>
    );
  }

  const filteredCommitments = commitments.filter((c) => {
    if (flagFilter === "not-in-markdown") return c.unverified;
    if (flagFilter === "not-in-pdf") return pdfMissingPhrases.has(c.text);
    return true;
  });

  return (
    <div className="space-y-3">
      {!focusSingle &&
        (columns === "climate"
          ? (climatePassedPhrases.length > 0 ||
              climateFilteredOutPhrases.length > 0) && (
              <button
                onClick={() => setPdfViewer({ mode: "all-climate" })}
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-03 bg-gray-03/40 px-2.5 py-1.5 text-xs text-gray-01 hover:bg-gray-03/60"
                title="Open the source PDF — climate-relevant commitments in green, filtered-out ones in gray"
              >
                <SearchCheck className="w-3.5 h-3.5" />
                View all in PDF ({
                  climatePassedPhrases.length
                } climate-relevant, {climateFilteredOutPhrases.length} filtered
                out)
              </button>
            )
          : allVerifiedPhrases.length > 0 && (
              <button
                onClick={() => setPdfViewer({ mode: "all" })}
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-03 bg-gray-03/40 px-2.5 py-1.5 text-xs text-gray-01 hover:bg-gray-03/60"
                title="Open the source PDF with every verified commitment highlighted"
              >
                <SearchCheck className="w-3.5 h-3.5" />
                View all {allVerifiedPhrases.length} verified passages in PDF
              </button>
            ))}
      {!focusSingle && pdfMissingPhrases.size > 0 && (
        <p className="rounded-md border border-pink-03/30 bg-pink-03/10 px-2.5 py-1.5 text-xs text-pink-03">
          {missingInView > 0
            ? `${missingInView} markdown-verified commitment(s) in this list weren't found in the PDF text layer after search — marked “Not in PDF text” for manual check.`
            : `${pdfMissingPhrases.size} markdown-verified commitment(s) weren't found in the PDF text layer (may be on another step's filtered list).`}
        </p>
      )}
      {!focusSingle && columns === "extract" && (
        <p className="text-xs text-gray-02">
          <span className="text-gray-01">In markdown / Not in markdown</span>{" "}
          shows whether the quote was found in the plan markdown.{" "}
          <span className="text-gray-01">Not in PDF text</span> is a second,
          separate check — it only ever appears on markdown-verified quotes
          where the PDF's own text layer search still couldn't locate them.
        </p>
      )}
      {!focusSingle &&
        (commitments.some((c) => c.unverified) ||
          pdfMissingPhrases.size > 0) && (
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setFlagFilter("all")}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs font-medium",
                flagFilter === "all"
                  ? "border-gray-01/40 bg-gray-01/10 text-gray-01"
                  : "border-gray-03 bg-gray-03/20 text-gray-02 hover:bg-gray-03/40",
              )}
            >
              All ({commitments.length})
            </button>
            <button
              onClick={() => setFlagFilter("not-in-markdown")}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs font-medium",
                flagFilter === "not-in-markdown"
                  ? "border-orange-03/50 bg-orange-03/15 text-orange-03"
                  : "border-gray-03 bg-gray-03/20 text-gray-02 hover:bg-gray-03/40",
              )}
            >
              Not in markdown ({commitments.filter((c) => c.unverified).length})
            </button>
            <button
              onClick={() => setFlagFilter("not-in-pdf")}
              disabled={pdfMissingPhrases.size === 0}
              title={
                pdfMissingPhrases.size === 0
                  ? 'Open "View all verified passages in PDF" above first to run this check'
                  : undefined
              }
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40",
                flagFilter === "not-in-pdf"
                  ? "border-pink-03/50 bg-pink-03/15 text-pink-03"
                  : "border-gray-03 bg-gray-03/20 text-gray-02 hover:bg-gray-03/40",
              )}
            >
              Not in PDF text ({missingInView})
            </button>
          </div>
        )}
      {filteredCommitments.length === 0 ? (
        <p className="text-sm text-gray-02">
          No commitments match this filter.
        </p>
      ) : (
        filteredCommitments.map((c, idx) => (
          <div key={c.id} id={`commitment-${c.id}`} className="space-y-3">
            {columns === "extract" &&
              c.section !== filteredCommitments[idx - 1]?.section &&
              referencesBySection.get(c.section)?.map((ref) => (
                <div
                  key={ref.id}
                  className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-gray-01"
                >
                  <p className="flex flex-wrap items-center gap-2 font-medium">
                    <MetaChip
                      label="Relationship"
                      tone={documentReferenceTone(ref.relationship)}
                    >
                      {ref.relationship}
                    </MetaChip>
                    This section references: {ref.name}
                  </p>
                  <p className="mt-1 text-xs text-gray-02 break-words">
                    &ldquo;{ref.quote}&rdquo;
                  </p>
                  <p className="mt-1 text-xs italic text-gray-02 break-words">
                    {ref.reasoning}
                  </p>
                  {ref.url && (
                    <a
                      href={ref.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block break-all text-xs text-blue-500 underline"
                    >
                      {ref.url}
                    </a>
                  )}
                </div>
              ))}
            <article className="rounded-lg border border-gray-03/50 bg-gray-03/20 p-3 min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-mono text-xs text-gray-02">
                  {c.stableId}
                </span>
                <FoundInDocumentFlag unverified={c.unverified} />
                {c.fromRecoveredImage && <ImageSourceFlag />}
                {pdfMissingPhrases.has(c.text) && <NotFoundInPdfFlag />}
                <OriginFlag originatesFrom={c.originatesFrom} />
                {!c.unverified && (
                  <button
                    onClick={() =>
                      setPdfViewer({ mode: "focused", commitment: c })
                    }
                    className="inline-flex items-center gap-1 rounded-md border border-gray-03 bg-gray-03/40 px-2 py-1 text-xs text-gray-01 hover:bg-gray-03/60"
                    title={
                      c.fromRecoveredImage
                        ? "Search for this passage in the source PDF — docling routed it through image recovery, but the PDF sometimes has real selectable text there anyway"
                        : "Find and highlight this passage in the source PDF"
                    }
                  >
                    <SearchCheck className="w-3 h-3" />
                    Find in PDF
                  </button>
                )}
                {columns === "extract" && (
                  <MetaChip label="Type">{c.type}</MetaChip>
                )}
                {columns === "climate" && (
                  <>
                    <MetaChip label="Climate">
                      <YesNo value={c.climateRelevant} />
                    </MetaChip>
                    <MetaChip label="Adaptation">
                      <YesNo value={c.adaptation} />
                    </MetaChip>
                  </>
                )}
                {columns === "actionable" && (
                  <MetaChip label="Actionable">
                    <YesNo value={c.actionable} />
                  </MetaChip>
                )}
              </div>
              <p className="text-sm text-gray-01 break-words whitespace-pre-wrap">
                {c.text}
              </p>
              {c.type === "TABLE" &&
                c.tableMetadata &&
                c.tableMetadata.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {c.tableMetadata.map((field, i) => (
                      <MetaChip key={i} label={field.label}>
                        {field.value}
                      </MetaChip>
                    ))}
                  </div>
                )}
              {columns === "extract" && c.section && (
                <p className="text-xs text-gray-02 break-words">
                  Section: {c.section}
                </p>
              )}
              {columns === "climate" && c.climateFilterReason && (
                <p className="text-xs text-gray-02 break-words">
                  {c.climateFilterReason}
                </p>
              )}
              {columns === "actionable" && c.actionableReason && (
                <p className="text-xs text-gray-02 break-words">
                  {c.actionableReason}
                </p>
              )}
              <QaFooter>
                <CommitmentReviewControls
                  commitment={c}
                  columns={columns}
                  reviewCtx={reviewCtx}
                />
              </QaFooter>
            </article>
          </div>
        ))
      )}
    </div>
  );
}
