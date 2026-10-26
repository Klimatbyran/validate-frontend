import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Code, Copy, FileText, Loader2, Tags } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/ui/modal";
import { CollapsibleSection } from "@/ui/collapsible-section";
import { MarkdownVectorPagesDisplay } from "@/ui/markdown-display";
import { PdfHighlightViewer, PdfHighlightPanel } from "./PdfHighlightViewer";
import { ResizableSplitView } from "./ResizableSplitView";
import { RecoveredImagesGallery } from "./RecoveredImagesGallery";
import { Button } from "@/ui/button";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { getClimatePlansPipelineApiUrl } from "@/config/api-env";
import { StatusPill } from "@/components/StatusPill";
import {
  toSwimlaneStatus,
  type ClimatePipelinePlan,
} from "../hooks/useClimatePipelinePlans";
import {
  useClimatePlanDetail,
  type ClimatePlanDetail,
  type Commitment,
  type DocumentReference,
} from "../hooks/useClimatePlanDetail";
import {
  indexReviewsByEntity,
  reviewKey,
  type PipelineReview,
} from "../hooks/usePipelineReviews";
import { ReviewControls } from "./ReviewControls";
import { StepReviewMode } from "./StepReviewMode";
import { QaReviewToolbar } from "./QaReviewToolbar";
import { StepReviewItemCard } from "./StepReviewItemCard";
import {
  buildStepReviewItems,
  commitmentsForStep,
  countByQaStatus,
  filterByQaStatus,
  filterCommitmentsByQaStatus,
  filterMeasuresByQaStatus,
  filterTeMatchesForListView,
  getReviewableItemCount,
  getStepReviewPrompt,
  stepSupportsReviewMode,
  type QaStatusFilter,
  type StepViewMode,
} from "../lib/stepReviewQueue";
import type { ReviewContext } from "./reviewContext";
import { MetaChip, QaFooter } from "./stepResultListUi";
import { TransitionElementsView } from "./TransitionElementsList";
import { CommitmentsList, DocumentReferencesList } from "./CommitmentsList";
import {
  CLIMATE_PASSED_COLOR,
  commitmentParts,
  type PdfViewerState,
} from "./commitmentPdf";
import { MeasuresList } from "./MeasuresList";
import {
  ApproveButton,
  PreviousStepRuns,
  RerunButton,
  StepNavArrow,
} from "./stepResultDialogChrome";

/** Count of items shown in each step's dialog — same filters the dialog
 * content itself applies, so the title badge always matches what's below. */
function getStepItemCount(
  step: string,
  detail: ClimatePlanDetail,
): number | null {
  const reviewable = getReviewableItemCount(step, detail);
  if (reviewable !== null) return reviewable;
  switch (step) {
    case "documentReferences":
      return detail.documentReferences.length;
    case "classifyActivityShiftTypes":
      return detail.extractedMeasures.reduce(
        (n, m) => n + (m.score?.activityShifts.length ?? 0),
        0,
      );
    default:
      return null;
  }
}

export interface StepResultDialogProps {
  plan: ClimatePipelinePlan | null;
  step: string | null;
  /** Set when opened from a previous-run pill — shows that specific run's
   * status/timestamps instead of defaulting to the latest. */
  runId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRerun?: () => void;
  /** Adjacent swimlane workers for outside-modal prev/next arrows. */
  adjacentSteps?: { prev: string | null; next: string | null };
  onNavigateStep?: (step: string) => void;
}

export function StepResultDialog({
  plan,
  step,
  runId,
  open,
  onOpenChange,
  onRerun,
  adjacentSteps,
  onNavigateStep,
}: StepResultDialogProps) {
  const { detail, isLoading, error, refresh } = useClimatePlanDetail(
    open ? (plan?.id ?? null) : null,
  );
  const [localReviews, setLocalReviews] = useState<Map<
    string,
    PipelineReview
  > | null>(null);
  const [pdfViewer, setPdfViewer] = useState<PdfViewerState | null>(null);
  // Verified commitment texts the PDF text-layer search couldn't re-find
  // after opening the viewer — filled in by onVerifiedSearchComplete, kept
  // so the list can flag them for manual checking even after the PDF closes.
  const [pdfMissingPhrases, setPdfMissingPhrases] = useState<Set<string>>(
    () => new Set(),
  );
  // Wide enough to fit a commitments list and a PDF page side by side —
  // below this, the PDF instead opens as its own full-screen modal (see
  // the return statement below).
  const isLargeScreen = useMediaQuery("(min-width: 1024px)");
  const [viewMode, setViewMode] = useState<StepViewMode>("list");
  const [qaFilter, setQaFilter] = useState<QaStatusFilter>("all");
  const [reviewIndex, setReviewIndex] = useState(0);

  const reviewsByEntity = useMemo(() => {
    if (localReviews) return localReviews;
    return indexReviewsByEntity(detail?.reviews ?? []);
  }, [detail?.reviews, localReviews]);

  const detailReviewsKey = detail?.reviews?.map((r) => r.id).join(",") ?? "";
  useEffect(() => {
    setLocalReviews(null);
  }, [detail?.id, detailReviewsKey]);

  // A PDF panel/modal left open from a previous step or plan would
  // otherwise linger, showing the wrong document's highlights.
  useEffect(() => {
    setPdfViewer(null);
    setPdfMissingPhrases(new Set());
  }, [plan?.id, step, open]);

  // Fresh dialog session / different step: start on list with All.
  useEffect(() => {
    setViewMode("list");
    setQaFilter("all");
    setReviewIndex(0);
  }, [plan?.id, step, open]);

  // Changing filter or entering review mode restarts at the first item.
  useEffect(() => {
    setReviewIndex(0);
  }, [qaFilter, viewMode]);

  // Clamp when the filtered queue shrinks (e.g. OK under Not reviewed).
  useEffect(() => {
    if (!detail || !step || !stepSupportsReviewMode(step)) return;
    const items = filterByQaStatus(
      buildStepReviewItems(step, detail),
      step,
      reviewsByEntity,
      qaFilter,
    );
    if (items.length === 0) {
      if (reviewIndex !== 0) setReviewIndex(0);
      return;
    }
    const max = items.length - 1;
    if (reviewIndex > max) setReviewIndex(max);
  }, [detail, step, reviewsByEntity, qaFilter, reviewIndex]);

  // Opening the split panel swaps the commitments list into a whole new
  // parent (plain scroll div -> ResizableSplitView's left pane), so React
  // remounts it at scroll position 0 — losing the spot the user was just
  // looking at. Re-find the clicked commitment in the fresh DOM and scroll
  // it back into view instead of leaving the list jumped to the top.
  useEffect(() => {
    if (pdfViewer?.mode !== "focused") return;
    const el = document.getElementById(`commitment-${pdfViewer.commitment.id}`);
    el?.scrollIntoView({ block: "center" });
  }, [pdfViewer]);

  if (!plan || !step) return null;

  // Local const so nested helpers keep `string` after the null guard
  // (function declarations would not retain the narrowing).
  const stepId = step;

  const stepRuns = plan.pipelineSteps.filter((s) => s.step === stepId);
  const run = runId
    ? (stepRuns.find((s) => s.runId === runId) ?? stepRuns[0])
    : stepRuns[0];
  const previousRuns = stepRuns.slice(1);
  const itemCount = detail ? getStepItemCount(stepId, detail) : null;
  const viewingPastRun = Boolean(runId) && run !== stepRuns[0];

  const reviewCtx: ReviewContext = {
    planId: plan.id,
    step: stepId,
    reviewsByEntity,
    onReviewChanged: (next, key) => {
      setLocalReviews((prev) => {
        const base = new Map(prev ?? reviewsByEntity);
        if (next) base.set(key, next);
        else base.delete(key);
        return base;
      });
    },
    onAdvanceAfterOk:
      viewMode === "review"
        ? () => {
            // Under not-reviewed, the OK'd item leaves the queue and the next
            // item slides into this index — stay put. Otherwise step forward.
            if (qaFilter === "not-reviewed") return;
            setReviewIndex((i) => i + 1);
          }
        : undefined,
  };

  // Whole-plan list, independent of which step's filtered view is open —
  // "Find in PDF" always highlights every verified commitment, not just
  // the ones visible in the current step. Hoisted above the content IIFE
  // (rather than computed inside it) so the split-view PDF panel in the
  // return statement below can use the same values.
  // Flat per-part phrases, not one string per commitment — a merged
  // commitment's parts don't always sit next to each other in the source
  // (see commitmentExtraction.ts's merge loop), so searching for the whole
  // merged text as one string would miss every part after the first. Each
  // part is searched/highlighted independently (same pattern as the
  // focused-commitment path — see PdfHighlightViewer's verifiedPhrases
  // loop, which already unions per-phrase matches into one highlight set).
  // Includes fromRecoveredImage commitments too — docling routes a region
  // through image recovery when its OWN layout model misclassifies it as a
  // picture, which doesn't always mean the underlying PDF actually lacks
  // real selectable text there (confirmed on a real plan: pdftotext found
  // clean text at a spot docling had classified as an image). Searching
  // anyway and falling back to NotFoundInPdfFlag when it's a genuine image
  // costs nothing — the search already handles "not found" gracefully for
  // ordinary misses.
  const verifiedCommitments = detail
    ? detail.commitments.filter((c) => !c.unverified)
    : [];
  const allVerifiedPhrases = verifiedCommitments.flatMap(commitmentParts);
  // Maps each searched part phrase back to the commitment it belongs to,
  // so "this part wasn't found" can be reported as "this commitment wasn't
  // fully found" via pdfMissingPhrases (keyed by commitment text, per the
  // NotFoundInPdfFlag checks below) without changing what those checks key
  // on.
  const partToCommitmentText = new Map<string, string>();
  for (const c of verifiedCommitments) {
    for (const part of commitmentParts(c))
      partToCommitmentText.set(part, c.text);
  }
  // Same split, but by whether each commitment passed the climate filter —
  // feeds the "view all in PDF, climate-colored" button on that step (see
  // CommitmentsList's columns === "climate" branch). Still only
  // markdown-verified commitments — an unverified one can't be found in
  // the PDF text layer either, there's nothing useful to highlight.
  const climatePassedPhrases = verifiedCommitments
    .filter((c) => c.climateRelevant)
    .flatMap(commitmentParts);
  const climateFilteredOutPhrases = verifiedCommitments
    .filter((c) => !c.climateRelevant)
    .flatMap(commitmentParts);
  const pdfUrl = detail
    ? `${getClimatePlansPipelineApiUrl()}/plans/${detail.id}/pdf`
    : "";

  function handleVerifiedSearchComplete(result: {
    searchedPhrases: string[];
    missingPhrases: string[];
  }) {
    const missingFromThisSearch = new Set(result.missingPhrases);
    const searchedFullVerifiedSet =
      result.searchedPhrases.length === allVerifiedPhrases.length &&
      allVerifiedPhrases.every((phrase) =>
        result.searchedPhrases.includes(phrase),
      );

    if (searchedFullVerifiedSet) {
      // result.* here are per-part phrases (see allVerifiedPhrases above)
      // — a commitment counts as missing if ANY of its own parts wasn't
      // found, same "every part must hold" bar the worker's own
      // unverified check uses. pdfMissingPhrases stays keyed by
      // commitment text either way, so NotFoundInPdfFlag's checks don't
      // need to change.
      const missingCommitments = new Set<string>();
      for (const phrase of missingFromThisSearch) {
        const commitmentText = partToCommitmentText.get(phrase);
        if (commitmentText) missingCommitments.add(commitmentText);
      }
      setPdfMissingPhrases(missingCommitments);
      return;
    }

    // Single-commitment find: merge into any prior "view all" result.
    // This path's phrases are already commitment-level (the focused path
    // reports missing/searched using the commitment's flat text as its
    // identifier — see PdfHighlightBody), unlike the view-all path above.
    setPdfMissingPhrases((previous) => {
      const next = new Set(previous);
      for (const phrase of result.searchedPhrases) {
        if (missingFromThisSearch.has(phrase)) next.add(phrase);
        else next.delete(phrase);
      }
      return next;
    });
  }

  const supportsReviewMode = stepSupportsReviewMode(stepId);
  const reviewPrompt = getStepReviewPrompt(stepId);
  const allReviewItems = detail ? buildStepReviewItems(stepId, detail) : [];
  const filteredReviewItems = filterByQaStatus(
    allReviewItems,
    stepId,
    reviewsByEntity,
    qaFilter,
  );
  const qaCounts = countByQaStatus(allReviewItems, stepId, reviewsByEntity);
  const safeReviewIndex =
    filteredReviewItems.length === 0
      ? 0
      : Math.min(Math.max(reviewIndex, 0), filteredReviewItems.length - 1);

  const optionCommitments = detail ? commitmentsForStep(stepId, detail) : [];

  const sharedCommitmentListProps = {
    reviewCtx,
    allVerifiedPhrases,
    climatePassedPhrases,
    climateFilteredOutPhrases,
    pdfMissingPhrases,
    setPdfViewer,
    optionCommitments,
  };

  function renderCommitmentsList(
    commitments: Commitment[],
    columns: "extract" | "climate" | "actionable" | "similar" | "themes",
    documentReferences?: DocumentReference[],
  ) {
    const filtered = filterCommitmentsByQaStatus(
      commitments,
      stepId,
      reviewsByEntity,
      qaFilter,
    );
    if (filtered.length === 0 && qaFilter !== "all") {
      return (
        <p className="text-sm text-gray-02">No items match this filter.</p>
      );
    }
    return (
      <CommitmentsList
        commitments={filtered}
        documentReferences={documentReferences}
        columns={columns}
        {...sharedCommitmentListProps}
      />
    );
  }

  function renderFilteredOrEmpty(isEmpty: boolean, node: ReactNode): ReactNode {
    if (isEmpty && qaFilter !== "all") {
      return (
        <p className="text-sm text-gray-02">No items match this filter.</p>
      );
    }
    return node;
  }

  const content = (() => {
    if (isLoading || !detail) {
      return (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="w-6 h-6 text-blue-03 animate-spin" />
        </div>
      );
    }
    if (error) {
      return <p className="text-sm text-pink-03">Could not load: {error}</p>;
    }

    if (supportsReviewMode && viewMode === "review" && reviewPrompt) {
      const current = filteredReviewItems[safeReviewIndex] ?? null;
      if (!current) {
        return (
          <StepReviewMode
            prompt={reviewPrompt}
            itemCount={0}
            index={0}
            onIndexChange={setReviewIndex}
            className="h-full min-h-0"
          >
            {null}
          </StepReviewMode>
        );
      }
      return (
        <StepReviewItemCard
          key={current.entityId}
          item={current}
          reviewCtx={reviewCtx}
          optionCommitments={optionCommitments}
          pdfMissingPhrases={pdfMissingPhrases}
          onFindInPdf={(commitment) =>
            setPdfViewer({ mode: "focused", commitment })
          }
          onNavigateToEntityId={(entityId) => {
            const idx = filteredReviewItems.findIndex(
              (item) => item.entityId === entityId,
            );
            if (idx >= 0) setReviewIndex(idx);
          }}
        >
          {({ body, dock, contextLabel, subProgress }) => (
            <StepReviewMode
              prompt={reviewPrompt}
              itemCount={filteredReviewItems.length}
              index={safeReviewIndex}
              onIndexChange={setReviewIndex}
              contextLabel={contextLabel}
              subProgress={subProgress}
              footer={dock}
              className="h-full min-h-0"
            >
              {body}
            </StepReviewMode>
          )}
        </StepReviewItemCard>
      );
    }

    switch (step) {
      // "documentReferences" is a synthetic pseudo-step opened from the
      // plan row's reference-count badge (see PlanRow's
      // DOCUMENT_REFERENCES_STEP); "groupDocumentReferences" is the real
      // pipeline step's own swimlane pill. Both show the same list — the
      // pill needs its own case too, or clicking it falls through to "No
      // details for this step" below.
      case "documentReferences":
      case "groupDocumentReferences":
        return (
          <DocumentReferencesList
            documentReferences={detail.documentReferences}
          />
        );
      case "extractMunicipality": {
        const entityKey = reviewKey(step, "municipality", plan.id);
        const snapshot = {
          extractedMunicipalityName: detail.extractedMunicipalityName,
          approvedMunicipalityName: detail.municipality?.name ?? null,
        };
        const adoptedDisplay = detail.adoptedAt
          ? new Date(detail.adoptedAt).toLocaleDateString()
          : detail.adoptedAtText;
        const coverageDisplay =
          detail.coveragePeriodText ??
          (detail.coveragePeriodStart
            ? `${detail.coveragePeriodStart}–${detail.coveragePeriodEnd ?? "?"}`
            : null);
        return (
          <div className="space-y-4 text-sm min-w-0">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-01 break-words">
                {detail.documentTitle ?? "Untitled document"}
              </h3>
              <div className="flex flex-wrap items-center gap-1.5">
                <MetaChip label="Municipality" tone="relevance">
                  {detail.municipality?.name ??
                    detail.extractedMunicipalityName ??
                    "—"}
                </MetaChip>
                {adoptedDisplay && (
                  <MetaChip label="Adopted" tone="score">
                    {adoptedDisplay}
                  </MetaChip>
                )}
                {coverageDisplay && (
                  <MetaChip label="Covers" tone="type">
                    {coverageDisplay}
                  </MetaChip>
                )}
                <ApproveButton
                  planId={plan.id}
                  extractedName={detail.extractedMunicipalityName}
                  approvedName={detail.municipality?.name ?? null}
                  onApproved={refresh}
                />
              </div>
              {/* Only shown when it actually differs — the common case
                  (approval just confirmed the extraction) doesn't need two
                  near-identical lines competing for attention. */}
              {detail.municipality &&
                detail.extractedMunicipalityName &&
                detail.municipality.name !==
                  detail.extractedMunicipalityName && (
                  <p className="text-xs text-gray-02">
                    Originally extracted as &ldquo;
                    {detail.extractedMunicipalityName}&rdquo;
                  </p>
                )}
            </div>
            {detail.documentDescription && (
              <p className="text-sm text-gray-01 border-l-2 border-gray-03 pl-3 italic">
                {detail.documentDescription}
              </p>
            )}
            <QaFooter>
              <ReviewControls
                planId={plan.id}
                step={step}
                entityType="municipality"
                entityId={plan.id}
                reviewedSnapshot={snapshot}
                review={reviewsByEntity.get(entityKey)}
                defaultSuggestedValue={{
                  municipalityName: detail.extractedMunicipalityName ?? "",
                }}
                onChanged={(next) => reviewCtx.onReviewChanged(next, entityKey)}
              />
            </QaFooter>
          </div>
        );
      }
      case "extractCommitments":
        return renderCommitmentsList(
          detail.commitments,
          "extract",
          detail.documentReferences,
        );
      case "filterCommitmentsClimate":
        return renderCommitmentsList(detail.commitments, "climate");
      case "filterCommitmentsActionable":
        return renderCommitmentsList(
          detail.commitments.filter((c) => c.climateRelevant),
          "actionable",
        );
      case "groupCommitmentsSimilar":
        return renderCommitmentsList(
          detail.commitments.filter((c) => c.climateRelevant && c.actionable),
          "similar",
        );
      case "groupCommitmentsThemes":
        return renderCommitmentsList(
          detail.commitments.filter((c) => c.climateRelevant && c.actionable),
          "themes",
        );
      case "extractMeasures": {
        const measures = filterMeasuresByQaStatus(
          detail.extractedMeasures,
          stepId,
          reviewsByEntity,
          qaFilter,
        );
        return renderFilteredOrEmpty(
          measures.length === 0,
          <MeasuresList
            measures={measures}
            columns="extract"
            reviewCtx={reviewCtx}
          />,
        );
      }
      case "scoreMeasures": {
        const measures = filterMeasuresByQaStatus(
          detail.extractedMeasures,
          stepId,
          reviewsByEntity,
          qaFilter,
        );
        return renderFilteredOrEmpty(
          measures.length === 0,
          <MeasuresList
            measures={measures}
            columns="score"
            reviewCtx={reviewCtx}
          />,
        );
      }
      case "classifyActivityShiftTypes":
        return (
          <TransitionElementsView
            measures={detail.extractedMeasures}
            reviewCtx={reviewCtx}
            showMatches={false}
          />
        );
      case "matchTransitionElements": {
        const { measures, visibleMatchIdsByShiftKey } =
          filterTeMatchesForListView(
            detail.extractedMeasures,
            stepId,
            reviewsByEntity,
            qaFilter,
          );
        return renderFilteredOrEmpty(
          measures.length === 0,
          <TransitionElementsView
            measures={measures}
            reviewCtx={reviewCtx}
            visibleMatchIdsByShiftKey={
              qaFilter === "all" ? undefined : visibleMatchIdsByShiftKey
            }
          />,
        );
      }
      default:
        return (
          <p className="text-sm text-gray-02">No details for this step.</p>
        );
    }
  })();

  // On large screens, the PDF opens as a panel to the right of the
  // content instead of stacking a second modal on top — both stay
  // visible and independently scrollable at once. Smaller screens don't
  // have room for that, so the PDF still opens as its own full-screen
  // modal there (see the non-split branch below).
  const showSplitPanel = isLargeScreen && pdfViewer !== null;

  // Climate step's PDF view shows green/gray (passed/filtered-out) instead
  // of the usual flat yellow — bound to which step is active rather than
  // pdfViewer.mode, since the panel below always shows the full background
  // set regardless of mode ("focused" only adds a red overlay on top of
  // it), so its color choice needs the same binding the modal's
  // "all-climate" mode uses.
  const isClimateStep = step === "filterCommitmentsClimate";

  const qaToolbar = supportsReviewMode ? (
    <div className="mt-2">
      <QaReviewToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        qaFilter={qaFilter}
        onQaFilterChange={setQaFilter}
        counts={qaCounts}
      />
    </div>
  ) : null;

  // Keep interactive controls out of DialogTitle / <h2> for a11y.
  const dialogTitle = (
    <div className="flex flex-wrap items-center gap-3">
      <span>{stepId}</span>
      {itemCount !== null && (
        <span className="text-xs font-normal text-gray-02">
          {itemCount} {itemCount === 1 ? "item" : "items"}
        </span>
      )}
      {stepId !== "documentReferences" && (
        <>
          <StatusPill
            label={run?.status ?? "pending"}
            status={toSwimlaneStatus(run?.status)}
            isActive={run?.status === "running"}
          />
          <RerunButton
            planId={plan.id}
            step={stepId}
            onRerun={() => {
              refresh();
              onRerun?.();
            }}
          />
        </>
      )}
    </div>
  );
  // Lets a reviewer check how docling's parsed markdown actually renders
  // (tables in particular — table-structure bugs like the banner-row one
  // fixed in commitmentText.ts are much easier to spot rendered than in
  // raw pipe-syntax) without leaving the dialog. Same rendering component
  // used for company markdown (see markdown-display.tsx).
  const sourceMarkdownSection = detail?.markdown ? (
    <div className="mt-3">
      <CollapsibleSection
        title="Source markdown — pretty"
        icon={<FileText />}
        accentIconBg="bg-blue-03/20"
        accentTextColor="text-blue-03"
      >
        <div className="prose prose-sm prose-invert max-w-none">
          <MarkdownVectorPagesDisplay value={detail.markdown} />
        </div>
      </CollapsibleSection>
      <CollapsibleSection
        title="Source markdown — raw"
        icon={<Code />}
        accentIconBg="bg-pink-03/20"
        accentTextColor="text-pink-03"
      >
        <div className="flex justify-end mb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(detail.markdown!);
              toast.success("Raw markdown copied");
            }}
            className="text-gray-02 hover:bg-gray-03/40"
          >
            <Copy className="w-4 h-4 mr-1" />
            Copy
          </Button>
        </div>
        <pre className="text-xs text-gray-02 overflow-x-auto whitespace-pre-wrap">
          {detail.markdown}
        </pre>
      </CollapsibleSection>
      {detail.annotatedMarkdown && (
        <CollapsibleSection
          title="Source markdown — annotated"
          icon={<Tags />}
          accentIconBg="bg-orange-03/20"
          accentTextColor="text-orange-03"
        >
          <p className="text-xs text-gray-02 mb-2">
            The source markdown with "[SYSTEM NOTE: ...]" markers inserted
            wherever a heading is immediately preceded by a bare-number
            decorative image — exactly what chunking/extraction actually sees
            for those headings (see rule 8). Computed fresh on every fetch,
            never stored, never used for verification.
          </p>
          <pre className="text-xs text-gray-02 overflow-x-auto whitespace-pre-wrap">
            {detail.annotatedMarkdown}
          </pre>
        </CollapsibleSection>
      )}
    </div>
  ) : null;

  // Same dialog-level data as sourceMarkdownSection above (fetched once
  // per plan, not per step) — shown on every step's dialog, not just
  // docling's, since a reviewer checking e.g. extractCommitments'
  // output for a fromRecoveredImage commitment needs to see the actual
  // picture it came from just as much as someone checking docling itself.
  const recoveredImagesSection = (
    <RecoveredImagesGallery images={detail?.recoveredImages ?? []} />
  );

  const dialogDescription =
    step === "documentReferences" ? (
      "Collected by extractCommitments across all sections, then deduplicated by groupDocumentReferences — this view itself isn't a separate pipeline step."
    ) : run ? (
      <div>
        <span className="text-xs">
          Started {new Date(run.startedAt).toLocaleString()}
          {run.completedAt &&
            ` · finished ${new Date(run.completedAt).toLocaleString()}`}
          {run.error && (
            <span className="block text-pink-03 mt-1">{run.error}</span>
          )}
        </span>
        {viewingPastRun && (
          <span className="block text-xs text-blue-03 mt-1">
            Viewing a past run — status/timing only; commitment and measure
            content below always reflects the current data.
          </span>
        )}
        <span className="block text-xs text-gray-02 mt-1">
          QA marks are an overlay — they do not change live pipeline outputs.
          Use the review board to export feedback for improving the pipeline.
        </span>
        <PreviousStepRuns runs={previousRuns} />
      </div>
    ) : (
      "This step hasn't run yet."
    );

  const sideNav =
    onNavigateStep && adjacentSteps
      ? {
          left: adjacentSteps.prev ? (
            <StepNavArrow
              direction="prev"
              stepName={adjacentSteps.prev}
              onClick={() => onNavigateStep(adjacentSteps.prev!)}
            />
          ) : undefined,
          right: adjacentSteps.next ? (
            <StepNavArrow
              direction="next"
              stepName={adjacentSteps.next}
              onClick={() => onNavigateStep(adjacentSteps.next!)}
            />
          ) : undefined,
        }
      : undefined;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      // Review mode stays on 6xl (same as list) so prev/next arrows outside
      // the card still fit on screen. Only the PDF split view needs full width.
      size={showSplitPanel ? "full" : "6xl"}
      scrollable={!showSplitPanel && viewMode !== "review"}
      fillHeight={showSplitPanel || viewMode === "review"}
      sideNav={sideNav}
      // The split-view case moves this into the left pane instead (see
      // below) — the shared header would otherwise push the PDF pane down
      // by however tall the run's timing/QA/previous-runs block happens
      // to be, capping how much vertical room the PDF actually gets. The
      // PDF pane doesn't need any of that context; the commitments list
      // does.
      title={showSplitPanel ? undefined : dialogTitle}
      description={
        showSplitPanel || viewMode === "review" ? undefined : dialogDescription
      }
    >
      {showSplitPanel ? (
        <ResizableSplitView
          className="min-h-0 flex-1"
          left={
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="shrink-0 mb-3 border-b border-gray-03 bg-gray-04 pb-3">
                <h2 className="text-lg font-medium text-gray-01">
                  {dialogTitle}
                </h2>
                {viewMode !== "review" && (
                  <div className="mt-1 text-sm text-gray-02">
                    {dialogDescription}
                  </div>
                )}
                {qaToolbar}
              </div>
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {content}
              </div>
              {viewMode !== "review" && sourceMarkdownSection}
              {viewMode !== "review" && recoveredImagesSection}
            </div>
          }
          right={
            <PdfHighlightPanel
              url={pdfUrl}
              // Always the full set (never just the one clicked
              // commitment) so the panel renders the same document with
              // the same highlights every time it's opened for this plan
              // — clicking a different commitment's "Find in PDF" while
              // the panel stays open then only has to move the red
              // highlight (see PdfHighlightBody's refocus effect), not
              // reload anything. On the climate step this is the
              // green/gray passed/filtered-out split instead of flat
              // yellow (see isClimateStep above).
              verifiedPhrases={
                isClimateStep ? climatePassedPhrases : allVerifiedPhrases
              }
              verifiedColor={isClimateStep ? CLIMATE_PASSED_COLOR : undefined}
              secondaryPhrases={
                isClimateStep ? climateFilteredOutPhrases : undefined
              }
              focusedPhrase={
                pdfViewer?.mode === "focused"
                  ? pdfViewer.commitment.text
                  : undefined
              }
              focusedPhraseParts={
                pdfViewer?.mode === "focused"
                  ? pdfViewer.commitment.extractionParts?.map((p) => p.text)
                  : undefined
              }
              onVerifiedSearchComplete={handleVerifiedSearchComplete}
              onClose={() => setPdfViewer(null)}
            />
          }
        />
      ) : viewMode === "review" ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="mb-3 shrink-0">{qaToolbar}</div>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {content}
          </div>
        </div>
      ) : (
        <>
          {qaToolbar}
          <div className="mt-4 min-w-0 overflow-x-hidden">
            {content}
            {sourceMarkdownSection}
            {recoveredImagesSection}
          </div>
          {pdfViewer && (
            <PdfHighlightViewer
              open
              onOpenChange={(nextOpen) => {
                if (!nextOpen) setPdfViewer(null);
              }}
              url={pdfUrl}
              verifiedPhrases={
                pdfViewer.mode === "all-climate"
                  ? climatePassedPhrases
                  : pdfViewer.mode === "all"
                    ? allVerifiedPhrases
                    : []
              }
              verifiedColor={
                pdfViewer.mode === "all-climate"
                  ? CLIMATE_PASSED_COLOR
                  : undefined
              }
              secondaryPhrases={
                pdfViewer.mode === "all-climate"
                  ? climateFilteredOutPhrases
                  : undefined
              }
              focusedPhrase={
                pdfViewer.mode === "focused"
                  ? pdfViewer.commitment.text
                  : undefined
              }
              focusedPhraseParts={
                pdfViewer.mode === "focused"
                  ? pdfViewer.commitment.extractionParts?.map((p) => p.text)
                  : undefined
              }
              onVerifiedSearchComplete={handleVerifiedSearchComplete}
            />
          )}
        </>
      )}
    </Modal>
  );
}
