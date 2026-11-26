import { useEffect, useState, type ReactNode } from "react";
import {
  ChevronDown,
  ChevronUp,
  History,
  Loader2,
  RefreshCw,
  Trash2,
  GitMerge,
  ShieldCheck,
  Check,
  X,
  Undo2,
  Link2Off,
  MessageSquare,
  Camera,
  Search,
  Save,
  Hammer,
  RotateCcw,
  ClipboardCopy,
} from "lucide-react";
import { toast } from "sonner";
import { copyMarkdown } from "./lib/copyMarkdown";
import { shadowTaxonomyMarkdown } from "./lib/shadowTaxonomyMarkdown";
import { useI18n } from "@/contexts/I18nContext";
import { useAuth } from "@/hooks/useAuth";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Button } from "@/ui/button";
import { ConfirmDialog } from "@/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/ui/dialog";
import { cn } from "@/lib/utils";
import { ShadowTaxonomyLegacyView } from "./components/ShadowTaxonomyLegacyView";
import { ShadowTaxonomyDiffView } from "./components/ShadowTaxonomyDiffView";
import { MunicipalityPill } from "./components/MunicipalityPill";
import { HandoffReviewNote } from "./components/HandoffReviewNote";
import { getHandoffReview } from "./lib/shadowTefHandoffReview";
import { resolveQaReviewerForSave } from "./lib/qaReviewerIdentity";
import { provenanceOf } from "./lib/transitionElementProvenance";
import {
  useTefSnapshots,
  useShadowElementSnapshots,
  createTefFreeze,
  deleteTefSnapshot,
  restoreTefSnapshot,
  formatSnapshotName,
} from "./hooks/useShadowElementSnapshots";
import { useLatestRebuildRun } from "./hooks/useShadowRebuild";
import { RematchReportView } from "./components/RematchReportView";
import {
  ShadowRebuildDialog,
  ShadowRebuildBanner,
} from "./components/ShadowRebuildControls";
import {
  useShadowElements,
  updateShadowElementStatus,
  updateShadowElementComment,
  deleteAllShadowElements,
  fetchMergeCandidates,
  confirmShadowElementMerges,
  unlinkShadowElement,
  fetchRealTaxonomyOverlaps,
  rejectShadowElementsWithRecovery,
  reattachShift,
  markShiftNotACommitment,
  type ShadowElement,
  type ShadowElementStatus,
  type ShadowElementQuality,
  type MergeGroup,
  type RealTaxonomyOverlap,
  type RejectWithRecoveryResult,
  type RecoveredShiftSummary,
  type ExistingRealMatch,
} from "./hooks/useShadowElements";
import {
  findSimilarRealElements,
  getCurrentTransitionElement,
  updateTransitionElement,
  createTransitionElement,
  searchTransitionElements,
  type TransitionElement,
  type TransitionElementMatch,
  type TransitionElementSummary,
} from "./hooks/useTransitionElements";
import {
  TransitionElementEditForm,
  toFormDraft,
  formDraftToFields,
  ACTIVITY_SHIFT_CATEGORIES,
  type TransitionElementFormDraft,
} from "./components/TransitionElementEditForm";

const STATUS_STYLE: Record<ShadowElementStatus, string> = {
  preliminary: "border-purple-03/40 bg-purple-03/10 text-purple-03",
  promoted: "border-green-03/40 bg-green-03/10 text-green-03",
  rejected: "border-gray-03 bg-gray-03/40 text-gray-02",
  merged: "border-gray-03 bg-gray-03/20 text-gray-02/80",
};

const QUALITY_STYLE: Record<ShadowElementQuality, string> = {
  specific: "border-teal-03/40 bg-teal-03/10 text-teal-03",
  narrowable: "border-amber-03/40 bg-amber-03/10 text-amber-03",
  vague: "border-pink-03/40 bg-pink-03/10 text-pink-03",
};

function OriginPill() {
  const { t } = useI18n();
  return (
    <span className="inline-flex items-center rounded-full border border-orange-03/40 bg-orange-03/10 px-2 py-0.5 text-[11px] font-medium text-orange-03">
      {t("shadowTaxonomy.origin")}
    </span>
  );
}

function keepLoadedDetail(
  elements: ShadowElement[],
  overrides: Map<string, ShadowElement>,
  next: ShadowElement,
): ShadowElement {
  const loaded =
    overrides.get(next.id) ??
    elements.find((element) => element.id === next.id);
  if (!loaded?.attachments) return next;
  // Status/comment PATCH responses are raw rows without attachments —
  // keep the already-loaded detail and only overlay the fields that changed.
  return {
    ...loaded,
    status: next.status ?? loaded.status,
    comment: next.comment !== undefined ? next.comment : loaded.comment,
  };
}

/** Which real element a "broaden"/"create" edit is currently targeting --
 * 'broaden' edits an existing candidate in place, 'create' mints a new one
 * from the shadow element's own fields. Both end the same way: resolve this
 * shadow element against whichever real stableId results. */
type SimilarEditTarget =
  | { mode: "broaden"; stableId: string }
  | { mode: "create" };

/** Converts a freshly edited/created TransitionElement into the
 * TransitionElementMatch shape the candidate list renders, so Edit/Create
 * can update that list in place instead of needing a re-search. `score`
 * isn't a real similarity score here (there's nothing to compare against
 * post-edit) -- callers pass whatever's appropriate: the prior score for an
 * edit, or a neutral 1 for a freshly created element. */
function matchFromElement(
  el: TransitionElement,
  score: number,
): TransitionElementMatch {
  return {
    stableId: el.stableId,
    shortLabel: el.shortLabel,
    description: el.description,
    sectorPath: el.sectorPath,
    actsOnLabels: el.actsOnLabels,
    shiftsToLabels: el.shiftsToLabels,
    activityShiftCategory: el.activityShiftCategory,
    legacyExportType:
      el.legacyExportType as TransitionElementMatch["legacyExportType"],
    sustainabilityClass:
      el.sustainabilityClass as TransitionElementMatch["sustainabilityClass"],
    coBenefits: el.coBenefits,
    score,
    version: el.version,
    editedBy: el.editedBy,
    status: el.status,
    handoffBroadened: el.handoffBroadened,
  };
}

function ShadowElementCard({
  element,
  onChanged,
  onUnlink,
  onResolved,
}: {
  element: ShadowElement;
  onChanged: (next: ShadowElement) => void;
  onUnlink: (id: string, label: string) => void;
  /** Called after this element is resolved against a real TE (broadened or
   * newly created) -- a full list refresh, since rejectShadowElementsWithRecovery
   * returns a result summary, not the updated ShadowElement row itself (same
   * reason handleRejectOverlaps above does a full refresh rather than an
   * onChanged patch). */
  onResolved: () => void;
}) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  // Tracks WHICH action is in flight, not just whether one is -- promote,
  // reject, and restore share one save path, so a boolean can only ever
  // light up one button's spinner regardless of which button was clicked.
  const [pendingStatus, setPendingStatus] =
    useState<ShadowElementStatus | null>(null);
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentDraft, setCommentDraft] = useState(element.comment ?? "");
  const [isSavingComment, setIsSavingComment] = useState(false);
  // Per-element "find similar real TEF elements" panel -- separate from the
  // batch AI "Check against TEF" audit elsewhere in this file: this is a
  // plain similarity search the reviewer judges themselves, one element at
  // a time.
  const [similarOpen, setSimilarOpen] = useState(false);
  const [isLoadingSimilar, setIsLoadingSimilar] = useState(false);
  const [similarCandidates, setSimilarCandidates] = useState<
    TransitionElementMatch[] | null
  >(null);
  const [editTarget, setEditTarget] = useState<SimilarEditTarget | null>(null);
  const [editDraft, setEditDraft] = useState<TransitionElementFormDraft | null>(
    null,
  );
  // Only meaningful in 'create' mode -- PATCH (broaden) carries the
  // candidate's existing category over unchanged, but a brand-new element
  // has no prior row to take it from, so it's editable here, prefilled from
  // this shadow element's own category as the obvious starting guess.
  const [createCategory, setCreateCategory] = useState("");
  const [isLoadingEditTarget, setIsLoadingEditTarget] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  // Per-commitment reattach -- separate from editTarget above: this moves
  // just ONE attached shift, reusing the same similarCandidates list
  // (fetched once per card, shared by both this and the card-level panel)
  // rather than running its own search.
  const [reattachOpenShiftId, setReattachOpenShiftId] = useState<string | null>(
    null,
  );
  const [isReattaching, setIsReattaching] = useState(false);
  // shiftId -> stableId it was just reattached to -- shown in place of the
  // Reattach button/picker for that row, instead of the row either closing
  // the picker or vanishing the moment onResolved() refetches. A plain
  // (non-auto-rejecting) reattach deliberately skips that refetch below, so
  // this card and its open panels stay exactly as they were; this map is
  // what makes the one row that changed still show something instead of
  // just sitting there unchanged with no confirmation.
  const [justReattached, setJustReattached] = useState<Map<string, string>>(
    new Map(),
  );
  // Shifts just marked "not a commitment" -- same stay-in-place confirmation
  // idea as justReattached above, kept separate since the two outcomes
  // render different text on the row (no stableId to show for this one).
  const [markedNotCommitment, setMarkedNotCommitment] = useState<Set<string>>(
    new Set(),
  );
  const [isMarkingNotCommitment, setIsMarkingNotCommitment] = useState(false);
  // Manual fallback search, shown below every candidate list on this card
  // (the card-level panel and every per-attachment reattach picker) -- for
  // when none of the semantic candidates above actually fit. Plain
  // substring search against the whole live taxonomy, same endpoint
  // TaxonomyTab's own search box uses, not scoped to this shadow element at
  // all. One shared box per card rather than per-picker, since only one of
  // these is realistically open at a time.
  const [manualQuery, setManualQuery] = useState("");
  const [manualResults, setManualResults] = useState<
    TransitionElementSummary[] | null
  >(null);
  const [isSearchingManual, setIsSearchingManual] = useState(false);
  const isSaving = pendingStatus !== null || isSavingComment;
  const isMerged = element.status === "merged";
  const hasComment = Boolean(element.comment?.trim());

  // Debounced manual search -- only fires past 2 characters, since an
  // unscoped single-letter query against the whole taxonomy is noise, not
  // a useful fallback.
  useEffect(() => {
    const query = manualQuery.trim();
    if (query.length < 2) {
      setManualResults(null);
      return;
    }
    const timer = setTimeout(() => {
      setIsSearchingManual(true);
      searchTransitionElements(query)
        .then(setManualResults)
        .catch((err) =>
          toast.error(
            err instanceof Error
              ? err.message
              : t("shadowTaxonomy.similarError"),
          ),
        )
        .finally(() => setIsSearchingManual(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [manualQuery, t]);

  const setStatus = async (status: ShadowElementStatus) => {
    setPendingStatus(status);
    try {
      const updated = await updateShadowElementStatus(element.id, status);
      onChanged(updated);
      const key =
        status === "promoted"
          ? "shadowTaxonomy.promoteSuccess"
          : status === "rejected"
            ? "shadowTaxonomy.rejectSuccess"
            : "shadowTaxonomy.restoreSuccess";
      toast.success(t(key, { label: element.shortLabel }));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("shadowTaxonomy.updateError"),
      );
    } finally {
      setPendingStatus(null);
    }
  };

  const openComment = () => {
    setCommentDraft(element.comment ?? "");
    setCommentOpen((open) => !open);
  };

  const saveComment = async () => {
    setIsSavingComment(true);
    try {
      const trimmed = commentDraft.trim();
      const updated = await updateShadowElementComment(
        element.id,
        trimmed.length > 0 ? trimmed : null,
      );
      onChanged(updated);
      setCommentOpen(false);
      toast.success(
        t(
          trimmed.length > 0
            ? "shadowTaxonomy.commentSuccess"
            : "shadowTaxonomy.commentCleared",
          { label: element.shortLabel },
        ),
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("shadowTaxonomy.commentError"),
      );
    } finally {
      setIsSavingComment(false);
    }
  };

  const clearComment = async () => {
    setCommentDraft("");
    setIsSavingComment(true);
    try {
      const updated = await updateShadowElementComment(element.id, null);
      onChanged(updated);
      setCommentOpen(false);
      toast.success(
        t("shadowTaxonomy.commentCleared", { label: element.shortLabel }),
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("shadowTaxonomy.commentError"),
      );
    } finally {
      setIsSavingComment(false);
    }
  };

  // Shared by the card-level panel and every per-attachment reattach picker
  // -- fetched once per card, reused everywhere a candidate list is shown,
  // since they're all searching the same shadow element.
  const ensureSimilarCandidates = () => {
    if (similarCandidates !== null) return;
    setIsLoadingSimilar(true);
    findSimilarRealElements(element.id)
      .then(setSimilarCandidates)
      .catch((err) =>
        toast.error(
          err instanceof Error ? err.message : t("shadowTaxonomy.similarError"),
        ),
      )
      .finally(() => setIsLoadingSimilar(false));
  };

  const toggleSimilar = () => {
    const next = !similarOpen;
    setSimilarOpen(next);
    setEditTarget(null);
    if (next) ensureSimilarCandidates();
  };

  const toggleReattach = (shiftId: string) => {
    const next = reattachOpenShiftId === shiftId ? null : shiftId;
    setReattachOpenShiftId(next);
    if (next) ensureSimilarCandidates();
  };

  const handleReattach = async (shiftId: string, realStableId: string) => {
    setIsReattaching(true);
    try {
      const result = await reattachShift(shiftId, realStableId);
      setJustReattached((prev) => new Map(prev).set(shiftId, realStableId));
      // Only refetch when the shadow element's own status actually changed
      // (auto-rejected because this was its last attachment) -- a plain
      // reattach doesn't need the whole list to refresh, so skipping it here
      // is what keeps this card's open panels (similarOpen, reattachOpenShiftId,
      // isExpanded) from resetting over one shift quietly moving elsewhere.
      if (result.shadowElementAutoRejected) onResolved();

      const alreadyMatched = result.recoveredShift.existingRealMatches?.some(
        (m) => m.stableId === realStableId,
      );
      toast.success(
        t(
          result.shadowElementAutoRejected
            ? "shadowTaxonomy.reattachSuccessAutoRejected"
            : alreadyMatched
              ? "shadowTaxonomy.reattachAlreadyMatched"
              : "shadowTaxonomy.reattachSuccess",
          { label: element.shortLabel, stableId: realStableId },
        ),
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("shadowTaxonomy.reattachError"),
      );
    } finally {
      setIsReattaching(false);
    }
  };

  const handleNotACommitment = async (shiftId: string) => {
    setIsMarkingNotCommitment(true);
    try {
      const result = await markShiftNotACommitment(shiftId);
      setMarkedNotCommitment((prev) => new Set(prev).add(shiftId));
      // Same reasoning as handleReattach -- only refetch when the shadow
      // element's own status actually changed.
      if (result.shadowElementAutoRejected) onResolved();
      toast.success(
        t(
          result.shadowElementAutoRejected
            ? "shadowTaxonomy.notACommitmentSuccessAutoRejected"
            : "shadowTaxonomy.notACommitmentSuccess",
          { label: element.shortLabel },
        ),
      );
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("shadowTaxonomy.notACommitmentError"),
      );
    } finally {
      setIsMarkingNotCommitment(false);
    }
  };

  const startBroaden = async (stableId: string) => {
    setIsLoadingEditTarget(true);
    try {
      const current = await getCurrentTransitionElement(stableId);
      setEditDraft(toFormDraft(current));
      setEditTarget({ mode: "broaden", stableId });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load element",
      );
    } finally {
      setIsLoadingEditTarget(false);
    }
  };

  const startCreate = () => {
    setEditDraft(
      toFormDraft({
        shortLabel: element.shortLabel,
        description: element.description,
        sectorId: null,
        sectorPath: element.sectorPath ?? "",
        actsOnLabels: [],
        shiftsToLabels: [],
        coBenefits: [],
        sustainabilityClass: null,
      }),
    );
    setCreateCategory(element.activityShiftCategory);
    setEditTarget({ mode: "create" });
  };

  // Bulk move -- independent of editing: a candidate might already cover
  // things as-is, so this is its own always-available action per candidate
  // row, not something Save does as a side effect. Same reject-with-recovery
  // call the batch "Check against TEF" audit already uses to confirm one of
  // its own flags.
  const handleUseForAll = async (realStableId: string) => {
    setIsResolving(true);
    try {
      const [result] = await rejectShadowElementsWithRecovery([
        { shadowElementId: element.id, realStableId },
      ]);
      setEditTarget(null);
      setSimilarOpen(false);
      setSimilarCandidates(null);
      onResolved();
      // Several shifts move at once here, each with its own existing
      // matches -- unlike a single reattach, there's no one "already
      // matched" toast variant that fits; just count how many of them
      // already had this real element so the reviewer isn't left wondering
      // why some rows didn't visibly gain a new match.
      const alreadyMatchedCount =
        result?.recoveredShifts.filter((shift) =>
          shift.existingRealMatches?.some((m) => m.stableId === realStableId),
        ).length ?? 0;
      toast.success(
        t(
          alreadyMatchedCount > 0
            ? "shadowTaxonomy.useForAllSuccessWithAlreadyMatched"
            : "shadowTaxonomy.useForAllSuccess",
          {
            label: element.shortLabel,
            stableId: realStableId,
            count: alreadyMatchedCount,
          },
        ),
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("shadowTaxonomy.resolveError"),
      );
    } finally {
      setIsResolving(false);
    }
  };

  // Edit/Create only -- no shift movement. Updates similarCandidates in
  // place so the saved/created element immediately has the same Edit /
  // Use-for-all / per-attachment Reattach options as any other candidate,
  // without needing a fresh search.
  const handleSaveEdit = async () => {
    if (!editTarget || !editDraft) return;
    const editedBy = resolveQaReviewerForSave(user);
    if (!editedBy) return;
    setIsResolving(true);
    try {
      if (editTarget.mode === "broaden") {
        const priorScore =
          similarCandidates?.find((c) => c.stableId === editTarget.stableId)
            ?.score ?? 0;
        const updated = await updateTransitionElement(editTarget.stableId, {
          ...formDraftToFields(editDraft),
          editedBy,
        });
        setSimilarCandidates(
          (prev) =>
            prev?.map((c) =>
              c.stableId === updated.stableId
                ? matchFromElement(updated, priorScore)
                : c,
            ) ?? prev,
        );
        setEditTarget(null);
        toast.success(
          t("shadowTaxonomy.editSuccess", {
            stableId: updated.stableId,
            version: updated.version,
          }),
        );
      } else {
        if (!createCategory.trim()) {
          toast.error(t("shadowTaxonomy.resolveCreateCategoryRequired"));
          return;
        }
        const created = await createTransitionElement({
          ...formDraftToFields(editDraft),
          activityShiftCategory: createCategory.trim(),
          editedBy,
        });
        setSimilarCandidates((prev) => [
          matchFromElement(created, 1),
          ...(prev ?? []),
        ]);
        setEditTarget(null);
        toast.success(
          t("shadowTaxonomy.createSuccess", { stableId: created.stableId }),
        );
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("shadowTaxonomy.resolveError"),
      );
    } finally {
      setIsResolving(false);
    }
  };

  // Shared between the card-level panel and every per-attachment reattach
  // picker -- same manual-search state, different action per result (Edit +
  // Use-for-all vs. just Use-this), so the action buttons are the only
  // thing each call site supplies.
  const renderManualSearch = (
    renderActions: (summary: TransitionElementSummary) => ReactNode,
  ) => (
    <div className="space-y-1.5 pt-1.5 border-t border-gray-03/30">
      <input
        type="text"
        value={manualQuery}
        onChange={(e) => setManualQuery(e.target.value)}
        placeholder={t("shadowTaxonomy.manualSearchPlaceholder")}
        className="h-8 w-full rounded-md border border-gray-03 bg-gray-04/40 px-2.5 text-xs text-gray-01 focus:outline-none focus:border-blue-03"
      />
      {isSearchingManual ? (
        <div className="flex items-center justify-center p-2">
          <Loader2 className="w-4 h-4 text-blue-03 animate-spin" />
        </div>
      ) : manualQuery.trim().length >= 2 && manualResults?.length === 0 ? (
        <p className="text-xs text-gray-02">{t("taxonomy.noResults")}</p>
      ) : (
        manualResults?.map((summary) => {
          const provenance = provenanceOf(summary);
          return (
            <div
              key={summary.stableId}
              className="flex items-center justify-between gap-2"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-xs font-medium text-gray-01 truncate">
                    {summary.shortLabel}
                  </p>
                  <span
                    className={cn(
                      "shrink-0 inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
                      provenance.className,
                    )}
                  >
                    {t(provenance.labelKey, { version: summary.version })}
                  </span>
                </div>
                <p className="text-[11px] text-gray-02 truncate">
                  {summary.sectorPath}
                </p>
              </div>
              {renderActions(summary)}
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <div className="bg-gray-04/80 backdrop-blur-sm rounded-[20px] p-4 space-y-2">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-gray-01">{element.shortLabel}</h3>
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
                STATUS_STYLE[element.status],
              )}
            >
              {t(
                `shadowTaxonomy.status${element.status[0].toUpperCase()}${element.status.slice(1)}`,
              )}
            </span>
            <span className="inline-flex items-center rounded-full border border-blue-03/30 bg-blue-03/10 px-2 py-0.5 text-[11px] font-medium text-blue-03">
              {element.activityShiftCategory}
            </span>
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
                QUALITY_STYLE[element.qualityGrade],
              )}
              title={t(
                `shadowTaxonomy.quality${element.qualityGrade[0].toUpperCase()}${element.qualityGrade.slice(1)}Hint`,
              )}
            >
              {t(
                `shadowTaxonomy.quality${element.qualityGrade[0].toUpperCase()}${element.qualityGrade.slice(1)}`,
              )}
            </span>
            {element.mergedElements.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-gray-03 bg-gray-03/20 px-2 py-0.5 text-[11px] font-medium text-gray-02">
                <GitMerge className="h-3 w-3" />
                {t("shadowTaxonomy.mergedIntoCount", {
                  count: element.mergedElements.length,
                })}
              </span>
            )}
            <MunicipalityPill name={element.origin?.municipalityName ?? null} />
          </div>
          <p className="text-sm text-gray-02 mt-1">{element.description}</p>
          {hasComment && !commentOpen && (
            <p className="mt-2 text-xs text-orange-03/90 break-words">
              <span className="font-medium">
                {t("shadowTaxonomy.commentLabel")}:{" "}
              </span>
              “{element.comment}”
            </p>
          )}
          <div className="mt-2">
            <HandoffReviewNote review={getHandoffReview(element.id)} />
          </div>
          <button
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs text-blue-03 hover:text-blue-04 hover:underline mt-2"
          >
            {isExpanded ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
            {attachmentSummary(element, t)}
          </button>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isMerged ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onUnlink(element.id, element.shortLabel)}
              title={t("shadowTaxonomy.unlink")}
              className="text-gray-02/60 hover:text-purple-03"
            >
              <Link2Off className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <>
              {element.status !== "promoted" && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={isSaving}
                  onClick={() => void setStatus("promoted")}
                  title={t("shadowTaxonomy.promote")}
                  className="border-green-03/40 text-green-03 hover:bg-green-03/10 hover:border-green-03"
                >
                  {pendingStatus === "promoted" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                </Button>
              )}
              {element.status !== "rejected" && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={isSaving}
                  onClick={() => void setStatus("rejected")}
                  title={t("shadowTaxonomy.reject")}
                  className="border-gray-03 text-gray-02 hover:bg-gray-03/40"
                >
                  {pendingStatus === "rejected" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <X className="h-3.5 w-3.5" />
                  )}
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={isSaving}
                onClick={toggleSimilar}
                title={t("shadowTaxonomy.findSimilar")}
                className={cn(
                  similarOpen
                    ? "border-blue-03/50 bg-blue-03/10 text-blue-03 hover:bg-blue-03/15"
                    : "border-gray-03 text-gray-02 hover:bg-gray-03/40",
                )}
              >
                <Search className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={isSaving}
                onClick={openComment}
                title={t("shadowTaxonomy.comment")}
                className={cn(
                  hasComment || commentOpen
                    ? "border-orange-03/50 bg-orange-03/10 text-orange-03 hover:bg-orange-03/15"
                    : "border-gray-03 text-gray-02 hover:bg-gray-03/40",
                )}
              >
                <MessageSquare className="h-3.5 w-3.5" />
              </Button>
              {element.status !== "preliminary" && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={isSaving}
                  onClick={() => void setStatus("preliminary")}
                  title={t("shadowTaxonomy.restore")}
                  className="text-gray-02/60 hover:text-purple-03"
                >
                  {pendingStatus === "preliminary" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Undo2 className="h-3.5 w-3.5" />
                  )}
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {commentOpen && !isMerged && (
        <div className="rounded-lg border border-gray-03 bg-gray-05/60 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-gray-01">
              {t("shadowTaxonomy.commentLabel")}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-gray-02 shrink-0"
              onClick={() => setCommentOpen(false)}
              disabled={isSavingComment}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
          <textarea
            className="w-full min-h-[4.5rem] rounded border border-gray-03 bg-gray-04/40 px-2 py-1.5 text-sm text-gray-01"
            value={commentDraft}
            onChange={(e) => setCommentDraft(e.target.value)}
            placeholder={t("shadowTaxonomy.commentPlaceholder")}
            disabled={isSavingComment}
          />
          <div className="flex justify-end gap-1.5">
            {hasComment && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                disabled={isSavingComment}
                onClick={() => void clearComment()}
              >
                {t("shadowTaxonomy.commentClear")}
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              className="h-7 text-xs"
              disabled={isSavingComment}
              onClick={() => void saveComment()}
            >
              {isSavingComment ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                t("shadowTaxonomy.commentSave")
              )}
            </Button>
          </div>
        </div>
      )}

      {similarOpen && !isMerged && (
        <div className="rounded-lg border border-blue-03/30 bg-blue-03/5 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-gray-01">
              {t("shadowTaxonomy.findSimilar")}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-gray-02 shrink-0"
              onClick={() => {
                setSimilarOpen(false);
                setEditTarget(null);
              }}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>

          {editTarget ? (
            <div className="space-y-3">
              {editTarget.mode === "create" && (
                <label className="block text-sm">
                  <span className="text-gray-02">
                    {t("taxonomy.fieldActivityShiftCategory")}
                  </span>
                  <select
                    value={createCategory}
                    onChange={(e) => setCreateCategory(e.target.value)}
                    className="mt-1 w-full h-9 rounded-md border border-blue-03 bg-gray-04/40 px-2.5 text-sm text-gray-01 focus:outline-none"
                  >
                    {ACTIVITY_SHIFT_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {editDraft && (
                <TransitionElementEditForm
                  draft={editDraft}
                  onChange={setEditDraft}
                />
              )}
              <p className="text-xs text-gray-02">
                {t(
                  editTarget.mode === "broaden"
                    ? "shadowTaxonomy.editBroadenNote"
                    : "shadowTaxonomy.editCreateNote",
                )}
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 max-w-none whitespace-nowrap text-xs"
                  disabled={isResolving}
                  onClick={() => setEditTarget(null)}
                >
                  {t("taxonomy.cancel")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-7 max-w-none whitespace-nowrap text-xs"
                  disabled={isResolving}
                  onClick={() => void handleSaveEdit()}
                >
                  {isResolving ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  {t("taxonomy.save")}
                </Button>
              </div>
            </div>
          ) : isLoadingSimilar || isLoadingEditTarget ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="w-5 h-5 text-blue-03 animate-spin" />
            </div>
          ) : (
            <div className="space-y-2">
              {similarCandidates?.length === 0 && (
                <p className="text-xs text-gray-02">
                  {t("shadowTaxonomy.similarEmpty")}
                </p>
              )}
              {similarCandidates?.map((candidate) => {
                const provenance = provenanceOf(candidate);
                return (
                  <div
                    key={candidate.stableId}
                    className="rounded-lg bg-gray-03/10 p-3 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-gray-01">
                          {candidate.shortLabel}
                        </p>
                        <span className="inline-flex items-center rounded-full border border-blue-03/30 bg-blue-03/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-03">
                          {t("shadowTaxonomy.similarScore", {
                            score: candidate.score.toFixed(2),
                          })}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
                            provenance.className,
                          )}
                        >
                          {t(provenance.labelKey, {
                            version: candidate.version,
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-gray-02">
                        {candidate.description}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 max-w-none whitespace-nowrap text-xs"
                        disabled={isResolving}
                        onClick={() => void startBroaden(candidate.stableId)}
                      >
                        {t("shadowTaxonomy.editThis")}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 max-w-none whitespace-nowrap border-blue-03/40 text-xs text-blue-03 hover:bg-blue-03/10 hover:border-blue-03"
                        disabled={isResolving}
                        onClick={() => void handleUseForAll(candidate.stableId)}
                      >
                        {t("shadowTaxonomy.useForAll")}
                      </Button>
                    </div>
                  </div>
                );
              })}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 max-w-none whitespace-nowrap border-green-03/40 text-xs text-green-03 hover:bg-green-03/10 hover:border-green-03"
                onClick={startCreate}
              >
                {t("shadowTaxonomy.createNew")}
              </Button>
              {renderManualSearch((summary) => (
                <div className="flex gap-1.5 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 max-w-none whitespace-nowrap text-[11px]"
                    disabled={isResolving}
                    onClick={() => void startBroaden(summary.stableId)}
                  >
                    {t("shadowTaxonomy.editThis")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 max-w-none whitespace-nowrap border-blue-03/40 text-[11px] text-blue-03 hover:bg-blue-03/10 hover:border-blue-03"
                    disabled={isResolving}
                    onClick={() => void handleUseForAll(summary.stableId)}
                  >
                    {t("shadowTaxonomy.useForAll")}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {isExpanded && (
        <div className="border-t border-gray-03/50 pt-3 space-y-2">
          {element.mergedElements.map((m) => (
            <div
              key={m.id}
              className="rounded-lg bg-gray-03/10 p-3 flex items-start justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-01">
                  {m.shortLabel}
                </p>
                <p className="text-xs text-gray-02">{m.description}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onUnlink(m.id, m.shortLabel)}
                title={t("shadowTaxonomy.unlink")}
                className="shrink-0 text-gray-02/60 hover:text-purple-03"
              >
                <Link2Off className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          {element.attachments.map((a) => {
            const reattachedTo = justReattached.get(a.shiftId);
            const notACommitment = markedNotCommitment.has(a.shiftId);
            const settled = Boolean(reattachedTo) || notACommitment;
            return (
              <div
                key={a.shiftId}
                className="rounded-lg bg-gray-05/50 p-3 space-y-1"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 text-xs flex-wrap">
                      {a.isOrigin && <OriginPill />}
                      <span className="font-medium text-gray-01">
                        {a.municipalityName ?? "Unknown municipality"}
                      </span>
                      <span className="text-gray-02 font-mono">
                        {a.shiftFrom} → {a.shiftTo}
                      </span>
                    </div>
                    <p className="text-xs text-gray-02 italic">
                      {a.measureText}
                    </p>
                    {a.aiReviewExplanation && (
                      <p className="text-xs text-purple-03">
                        {a.aiReviewExplanation}
                      </p>
                    )}
                    {reattachedTo && (
                      <p className="text-xs font-medium text-green-03">
                        {t("shadowTaxonomy.reattachedToLabel", {
                          stableId: reattachedTo,
                        })}
                      </p>
                    )}
                    {notACommitment && (
                      <p className="text-xs font-medium text-gray-02">
                        {t("shadowTaxonomy.notACommitmentLabel")}
                      </p>
                    )}
                  </div>
                  {!isMerged && !settled && (
                    <div className="flex shrink-0 gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 max-w-none whitespace-nowrap text-[11px]"
                        onClick={() => toggleReattach(a.shiftId)}
                      >
                        {t("shadowTaxonomy.reattach")}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 max-w-none whitespace-nowrap text-[11px] text-gray-02/70 hover:text-gray-01"
                        disabled={isMarkingNotCommitment}
                        onClick={() => void handleNotACommitment(a.shiftId)}
                      >
                        {t("shadowTaxonomy.notACommitment")}
                      </Button>
                    </div>
                  )}
                </div>
                {!settled && reattachOpenShiftId === a.shiftId && (
                  <div className="rounded-md border border-blue-03/30 bg-blue-03/5 p-2 space-y-1.5">
                    {isLoadingSimilar ? (
                      <div className="flex items-center justify-center p-2">
                        <Loader2 className="w-4 h-4 text-blue-03 animate-spin" />
                      </div>
                    ) : similarCandidates?.length === 0 ? (
                      <p className="text-xs text-gray-02">
                        {t("shadowTaxonomy.similarEmpty")}
                      </p>
                    ) : (
                      similarCandidates?.map((candidate) => {
                        const provenance = provenanceOf(candidate);
                        return (
                          <div
                            key={candidate.stableId}
                            className="flex items-center justify-between gap-2"
                          >
                            <span className="flex items-center gap-1.5 min-w-0">
                              <span className="text-xs text-gray-01 truncate">
                                {candidate.shortLabel}
                              </span>
                              <span
                                className={cn(
                                  "shrink-0 inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
                                  provenance.className,
                                )}
                              >
                                {t(provenance.labelKey, {
                                  version: candidate.version,
                                })}
                              </span>
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-6 max-w-none shrink-0 whitespace-nowrap text-[11px]"
                              disabled={isReattaching}
                              onClick={() =>
                                void handleReattach(
                                  a.shiftId,
                                  candidate.stableId,
                                )
                              }
                            >
                              {t("shadowTaxonomy.useThis")}
                            </Button>
                          </div>
                        );
                      })
                    )}
                    {renderManualSearch((summary) => (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 max-w-none shrink-0 whitespace-nowrap text-[11px]"
                        disabled={isReattaching}
                        onClick={() =>
                          void handleReattach(a.shiftId, summary.stableId)
                        }
                      >
                        {t("shadowTaxonomy.useThis")}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function uniqueMunicipalityCount(element: ShadowElement): number {
  const names = element.attachments.map(
    (attachment) => attachment.municipalityName ?? "unknown",
  );
  return new Set(names).size;
}

function attachmentSummaryKey(
  measures: number,
  municipalities: number,
): string {
  const measurePart = measures === 1 ? "One" : "Many";
  const municipalityPart = municipalities === 1 ? "One" : "Many";
  return `shadowTaxonomy.attachments${measurePart}${municipalityPart}`;
}

function attachmentSummary(
  element: ShadowElement,
  translate: (key: string, params?: Record<string, string | number>) => string,
): string {
  const measures = element.attachments.length;
  const municipalities = uniqueMunicipalityCount(element);
  return translate(attachmentSummaryKey(measures, municipalities), {
    measures,
    municipalities,
  });
}

function byMostAttached(left: ShadowElement, right: ShadowElement): number {
  const attachmentDifference =
    right.attachments.length - left.attachments.length;
  if (attachmentDifference !== 0) return attachmentDifference;
  return left.shortLabel.localeCompare(right.shortLabel);
}

export type ShadowSortMode = "attached" | "newest" | "oldest";

const createdTime = (element: ShadowElement) =>
  new Date(element.createdAt).getTime();

function comparatorFor(
  sortMode: ShadowSortMode,
): (left: ShadowElement, right: ShadowElement) => number {
  if (sortMode === "newest")
    return (left, right) =>
      createdTime(right) - createdTime(left) || byMostAttached(left, right);
  if (sortMode === "oldest")
    return (left, right) =>
      createdTime(left) - createdTime(right) || byMostAttached(left, right);
  return byMostAttached;
}

/** Local calendar day (YYYY-MM-DD) an element was created -- the key the
 * date dividers group on when sorting by date. */
function createdDayKey(element: ShadowElement): string {
  const d = new Date(element.createdAt);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function visibleShadowElements(
  elements: ShadowElement[],
  overrides: Map<string, ShadowElement>,
  statusFilter: ShadowElementStatus | "",
  qualityFilter: ShadowElementQuality | "",
  municipalityFilter: string,
  // Plain substring theme search (e.g. "solar") -- lets a reviewer see
  // every shadow element touching one theme together instead of reviewing
  // them one at a time in sort order. Purely client-side, same as the other
  // three filters: `elements` is already fully loaded, so this never costs
  // a request.
  searchQuery: string,
  sortMode: ShadowSortMode,
): ShadowElement[] {
  const query = searchQuery.trim().toLowerCase();
  return (
    elements
      .map((element) => overrides.get(element.id) ?? element)
      // "All" (empty filter) deliberately excludes merged and rejected --
      // both are settled, no-longer-needs-attention states, same reasoning
      // as merged. Still reachable by explicitly picking that status in the
      // filter (e.g. for the unlink workflow, or to double check a reject).
      .filter((element) =>
        statusFilter
          ? element.status === statusFilter
          : element.status !== "merged" && element.status !== "rejected",
      )
      .filter(
        (element) => !qualityFilter || element.qualityGrade === qualityFilter,
      )
      .filter(
        (element) =>
          !municipalityFilter ||
          element.origin?.municipalityName === municipalityFilter,
      )
      .filter(
        (element) =>
          !query ||
          element.shortLabel.toLowerCase().includes(query) ||
          element.description.toLowerCase().includes(query) ||
          (element.comment?.toLowerCase().includes(query) ?? false),
      )
      .sort(comparatorFor(sortMode))
  );
}

interface GroupSelection {
  canonicalId: string;
  excludedIds: Set<string>;
}

function MergeReviewDialog({
  open,
  onOpenChange,
  groups,
  isLoading,
  isConfirming,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: MergeGroup[];
  isLoading: boolean;
  isConfirming: boolean;
  onConfirm: (groups: { canonicalId: string; mergedIds: string[] }[]) => void;
}) {
  const { t } = useI18n();
  const [selections, setSelections] = useState<GroupSelection[]>([]);

  // Reset selections whenever a fresh set of groups comes in (a new
  // fetchMergeCandidates call always returns new objects, so this only
  // fires when the dialog is reopened/reloaded, not on every render).
  useEffect(() => {
    setSelections(
      groups.map((g) => ({
        canonicalId: g.suggestedCanonicalId,
        excludedIds: new Set<string>(),
      })),
    );
  }, [groups]);

  const setCanonical = (groupIndex: number, id: string) => {
    setSelections((prev) =>
      prev.map((s, i) => (i === groupIndex ? { ...s, canonicalId: id } : s)),
    );
  };

  const toggleExcluded = (groupIndex: number, id: string) => {
    setSelections((prev) =>
      prev.map((s, i) => {
        if (i !== groupIndex) return s;
        const next = new Set(s.excludedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return { ...s, excludedIds: next };
      }),
    );
  };

  // A group with everything unchecked (or only the canonical left) just
  // drops out -- nothing to confirm there.
  const finalGroups = groups
    .map((g, i) => {
      const sel = selections[i];
      if (!sel) return null;
      const mergedIds = g.members
        .filter((m) => m.id !== sel.canonicalId && !sel.excludedIds.has(m.id))
        .map((m) => m.id);
      return mergedIds.length > 0
        ? { canonicalId: sel.canonicalId, mergedIds }
        : null;
    })
    .filter(
      (g): g is { canonicalId: string; mergedIds: string[] } => g !== null,
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("shadowTaxonomy.mergeReviewTitle")}</DialogTitle>
          <DialogDescription>
            {t("shadowTaxonomy.mergeReviewDescription")}
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-02">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t("shadowTaxonomy.mergeReviewLoading")}
          </div>
        )}
        {!isLoading && groups.length === 0 && (
          <p className="text-sm text-gray-02 py-6 text-center">
            {t("shadowTaxonomy.mergeReviewEmpty")}
          </p>
        )}
        {!isLoading && groups.length > 0 && (
          <div className="space-y-4">
            {groups.map((g, groupIndex) => {
              const sel = selections[groupIndex];
              if (!sel) return null;
              return (
                <div
                  key={groupIndex}
                  className="rounded-xl border border-gray-03 p-3 space-y-2"
                >
                  {g.members.map((m) => {
                    const isCanonical = m.id === sel.canonicalId;
                    const isExcluded = sel.excludedIds.has(m.id);
                    return (
                      <div
                        key={m.id}
                        className={cn(
                          "flex items-start gap-3 rounded-lg p-2",
                          isCanonical
                            ? "bg-green-03/10"
                            : isExcluded
                              ? "opacity-40"
                              : "bg-gray-05/50",
                        )}
                      >
                        <input
                          type="radio"
                          name={`canonical-${groupIndex}`}
                          checked={isCanonical}
                          onChange={() => setCanonical(groupIndex, m.id)}
                          className="mt-1.5"
                          aria-label="Keep as canonical"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-01">
                            {m.shortLabel}
                          </p>
                          <p className="text-xs text-gray-02">
                            {m.description}
                          </p>
                          {isCanonical && (
                            <p className="text-xs text-green-03 mt-1">
                              {t("shadowTaxonomy.mergeReviewCanonicalHint")}
                            </p>
                          )}
                        </div>
                        {!isCanonical && (
                          <input
                            type="checkbox"
                            checked={!isExcluded}
                            onChange={() => toggleExcluded(groupIndex, m.id)}
                            className="mt-1.5 shrink-0"
                            aria-label="Include in merge"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            {t("shadowTaxonomy.mergeReviewCancel")}
          </Button>
          <Button
            type="button"
            disabled={isConfirming || finalGroups.length === 0}
            onClick={() => onConfirm(finalGroups)}
          >
            {isConfirming && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t(
              finalGroups.length === 1
                ? "shadowTaxonomy.mergeReviewConfirm"
                : "shadowTaxonomy.mergeReviewConfirmPlural",
              { count: finalGroups.length },
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function otherRealMatches(
  shift: RecoveredShiftSummary,
  proposedStableId: string,
): ExistingRealMatch[] {
  const matches = shift.existingRealMatches ?? [];
  return matches.filter((match) => match.stableId !== proposedStableId);
}

function OtherTefMatchPills({ matches }: { matches: ExistingRealMatch[] }) {
  const { t } = useI18n();
  if (matches.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1 pt-0.5">
      <span className="text-[10px] font-medium uppercase tracking-wide text-gray-02">
        {t("shadowTaxonomy.realOverlapOtherMatches")}
      </span>
      {matches.map((match) => (
        <span
          key={match.stableId}
          title={match.stableId}
          className="inline-flex items-center rounded-full border border-blue-03/30 bg-blue-03/10 px-2 py-0.5 text-[10px] font-medium text-blue-03"
        >
          {match.shortLabel}
        </span>
      ))}
    </div>
  );
}

function AttachedCommitment({
  shift,
  proposedStableId,
}: {
  shift: RecoveredShiftSummary;
  proposedStableId: string;
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-gray-02 font-mono">
        {shift.municipalityName ?? "Unknown municipality"}: {shift.shiftFrom} →{" "}
        {shift.shiftTo}
      </p>
      <p className="text-xs text-gray-02 italic">"{shift.measureText}"</p>
      <OtherTefMatchPills matches={otherRealMatches(shift, proposedStableId)} />
    </div>
  );
}

function RealOverlapReviewDialog({
  open,
  onOpenChange,
  overlaps,
  isLoading,
  isConfirming,
  recoveryResults,
  onConfirm,
  onRecompute,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  overlaps: RealTaxonomyOverlap[];
  isLoading: boolean;
  isConfirming: boolean;
  // Set once confirming succeeds -- switches the dialog from the checklist
  // to a one-liner summary of what got recovered, instead of auto-closing.
  recoveryResults: RejectWithRecoveryResult[] | null;
  onConfirm: (
    items: { shadowElementId: string; realStableId: string }[],
  ) => void;
  // Forces a fresh check -- the list is otherwise cached client-side (see
  // ShadowTaxonomyTab's hasCheckedOverlaps) so reopening this dialog
  // doesn't re-spend LLM calls on a list the reviewer hasn't acted on yet.
  onRecompute: () => void;
}) {
  const { t } = useI18n();
  const [checked, setChecked] = useState<Set<string>>(new Set());

  // Nothing checked by default -- unlike the merge dialog, this check is
  // inherently fuzzier (a flag can be wrong, e.g. a narrower real entry
  // mistaken for covering a broader shadow), so it should never default to
  // "act on everything proposed."
  useEffect(() => {
    setChecked(new Set());
  }, [overlaps]);

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    const items = overlaps
      .filter((o) => checked.has(o.shadowElementId))
      .map((o) => ({
        shadowElementId: o.shadowElementId,
        realStableId: o.realStableId,
      }));
    onConfirm(items);
  };

  if (recoveryResults) {
    const totalShifts = recoveryResults.reduce(
      (sum, r) => sum + r.recoveredShifts.length,
      0,
    );
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t("shadowTaxonomy.realOverlapDoneTitle", {
                count: recoveryResults.length,
              })}
            </DialogTitle>
            <DialogDescription>
              {t("shadowTaxonomy.realOverlapDoneDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {recoveryResults.map((r) => (
              <div
                key={r.shadowElementId}
                className="rounded-xl border border-gray-03 p-3 space-y-2"
              >
                <p className="text-sm text-gray-02">
                  <span className="line-through">{r.shadowShortLabel}</span>
                  {" → "}
                  <span className="font-medium text-gray-01">
                    {r.realShortLabel}
                  </span>
                </p>
                <div className="space-y-2">
                  {r.recoveredShifts.map((shift) => (
                    <AttachedCommitment
                      key={shift.shiftId}
                      shift={shift}
                      proposedStableId={r.realStableId}
                    />
                  ))}
                </div>
              </div>
            ))}
            {totalShifts === 0 && (
              <p className="text-xs text-gray-02 italic">
                No shifts were attached to the replaced elements.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => onOpenChange(false)}>
              {t("shadowTaxonomy.realOverlapDoneClose")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t("shadowTaxonomy.realOverlapReviewTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("shadowTaxonomy.realOverlapReviewDescription")}
          </DialogDescription>
        </DialogHeader>

        {!isLoading && (
          <button
            type="button"
            onClick={onRecompute}
            className="flex items-center gap-1.5 text-xs text-blue-03 hover:text-blue-04 hover:underline self-start"
          >
            <RefreshCw className="w-3 h-3" />
            {t("shadowTaxonomy.realOverlapRecompute")}
          </button>
        )}

        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-02">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t("shadowTaxonomy.realOverlapReviewLoading")}
          </div>
        )}
        {!isLoading && overlaps.length === 0 && (
          <p className="text-sm text-gray-02 py-6 text-center">
            {t("shadowTaxonomy.realOverlapReviewEmpty")}
          </p>
        )}
        {!isLoading && overlaps.length > 0 && (
          <div className="space-y-3">
            {overlaps.map((o) => (
              <div
                key={o.shadowElementId}
                className="rounded-xl border border-gray-03 p-3 flex items-start gap-3"
              >
                <input
                  type="checkbox"
                  checked={checked.has(o.shadowElementId)}
                  onChange={() => toggle(o.shadowElementId)}
                  className="mt-1.5 shrink-0"
                  aria-label="Replace this shadow element with the real TEF match"
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <div>
                    <p className="text-sm font-medium text-gray-01">
                      {o.shadowShortLabel}
                    </p>
                    <p className="text-xs text-gray-02">
                      {o.shadowDescription}
                    </p>
                  </div>
                  <div className="rounded-lg bg-blue-03/10 border border-blue-03/30 p-2">
                    <p className="text-[11px] font-medium text-blue-03 uppercase tracking-wide">
                      {t("shadowTaxonomy.realOverlapRealLabel")}
                    </p>
                    <p className="text-sm text-gray-01">{o.realShortLabel}</p>
                    <p className="text-xs text-gray-02">{o.realDescription}</p>
                  </div>
                  <p className="text-xs text-gray-02 italic">{o.reasoning}</p>
                  {o.attachedShifts.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[11px] font-medium text-gray-02 uppercase tracking-wide">
                        {t("shadowTaxonomy.realOverlapAttachedLabel", {
                          count: o.attachedShifts.length,
                        })}
                      </p>
                      {o.attachedShifts.map((shift) => (
                        <AttachedCommitment
                          key={shift.shiftId}
                          shift={shift}
                          proposedStableId={o.realStableId}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            {t("shadowTaxonomy.realOverlapReviewCancel")}
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={isConfirming || checked.size === 0}
            onClick={handleConfirm}
          >
            {isConfirming && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t("shadowTaxonomy.realOverlapReviewConfirm", {
              count: checked.size,
            })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ShadowTaxonomyTab() {
  const { t, localeIntl } = useI18n();
  const { elements, isLoading, error, refresh } = useShadowElements();
  // Current elements and the frozen legacy snapshot can each run to
  // hundreds of rows -- side by side only once there's room for two
  // columns (same breakpoint StepResultDialog uses for its own current-vs-
  // legacy split); below that, a tab picks one at a time instead.
  const isLargeScreen = useMediaQuery("(min-width: 1024px)");
  const [shadowPane, setShadowPane] = useState<"current" | "legacy">("current");
  // "off" (default) shows just the current elements, full width, with no
  // snapshot comparison mounted at all -- "list" is the current/legacy
  // split above; "diff" classifies each live element as new/changed/same
  // against the selected snapshot instead; "report" shows where the
  // commitments that were on shadow elements in that snapshot ended up
  // (the rematch report). The last two only make sense once a snapshot
  // exists.
  const [viewMode, setViewMode] = useState<"off" | "list" | "diff" | "report">(
    "off",
  );
  // Bumped after a take/delete/rebuild so already-open snapshot views (which
  // fetch once on mount) refetch instead of showing stale data.
  const [snapshotRefreshToken, setSnapshotRefreshToken] = useState(0);
  const { snapshots: tefSnapshots, isLoading: isSnapshotListLoading } =
    useTefSnapshots(snapshotRefreshToken);
  // Which snapshot the list/diff/report views compare against. null means
  // "follow the latest" until the reviewer picks one explicitly.
  const [pickedSnapshotRunId, setPickedSnapshotRunId] = useState<string | null>(
    null,
  );
  const selectedSnapshot =
    tefSnapshots.find((s) => s.snapshotRunId === pickedSnapshotRunId) ??
    tefSnapshots[0] ??
    null;
  const selectedSnapshotRunId = selectedSnapshot?.snapshotRunId ?? null;
  const hasSnapshot = selectedSnapshot !== null;
  const [isTakingSnapshot, setIsTakingSnapshot] = useState(false);
  const [isDeleteSnapshotOpen, setIsDeleteSnapshotOpen] = useState(false);
  const [isRestoreSnapshotOpen, setIsRestoreSnapshotOpen] = useState(false);
  const [isRestoringSnapshot, setIsRestoringSnapshot] = useState(false);
  const [isDeletingSnapshot, setIsDeletingSnapshot] = useState(false);
  const [isRebuildOpen, setIsRebuildOpen] = useState(false);

  // Deleting the last snapshot while diff/report is open would otherwise
  // leave the view stuck on a comparison that no longer exists. Only steps
  // out of those two modes -- never overrides an explicit "off".
  useEffect(() => {
    if (
      (viewMode === "diff" || viewMode === "report") &&
      !isSnapshotListLoading &&
      !hasSnapshot
    )
      setViewMode("list");
  }, [hasSnapshot, isSnapshotListLoading, viewMode]);
  // Fetched here too (on top of the legacy/diff views' own fetches) purely
  // to build the municipality option list below -- otherwise a reviewer
  // with an empty or fully-filtered-out current list has no snapshot-only
  // municipalities to pick from at all.
  const { snapshots } = useShadowElementSnapshots(
    snapshotRefreshToken,
    selectedSnapshotRunId,
  );
  const [statusFilter, setStatusFilter] = useState<ShadowElementStatus | "">(
    "",
  );
  const [qualityFilter, setQualityFilter] = useState<ShadowElementQuality | "">(
    "",
  );
  // Lets a reviewer narrow to one municipality after rerunning it, to check
  // at a glance whether the same elements still originate from it -- shared
  // across Current, the legacy snapshot, and the diff view so all three
  // stay in sync with the same selection.
  const [municipalityFilter, setMunicipalityFilter] = useState("");
  // Plain theme search (e.g. "solar") -- see visibleShadowElements' own
  // comment for why this is client-side only.
  const [searchQuery, setSearchQuery] = useState("");
  // Date sorts also show "Added <day>" dividers between days.
  const [sortMode, setSortMode] = useState<ShadowSortMode>("attached");
  const [overrides, setOverrides] = useState<Map<string, ShadowElement>>(
    new Map(),
  );
  const [isRemoveAllOpen, setIsRemoveAllOpen] = useState(false);
  const [isRemovingAll, setIsRemovingAll] = useState(false);
  const [isMergeReviewOpen, setIsMergeReviewOpen] = useState(false);
  const [isLoadingMergeCandidates, setIsLoadingMergeCandidates] =
    useState(false);
  const [mergeGroups, setMergeGroups] = useState<MergeGroup[]>([]);
  const [isConfirmingMerges, setIsConfirmingMerges] = useState(false);
  const [isRealOverlapReviewOpen, setIsRealOverlapReviewOpen] = useState(false);
  const [isLoadingRealOverlaps, setIsLoadingRealOverlaps] = useState(false);
  const [realOverlaps, setRealOverlaps] = useState<RealTaxonomyOverlap[]>([]);
  // Separate from realOverlaps.length === 0 on purpose -- a legitimate
  // "nothing found" result must stay cached too, not look indistinguishable
  // from "never checked yet" and re-trigger a refetch on every reopen.
  const [hasCheckedOverlaps, setHasCheckedOverlaps] = useState(false);
  const [isRejectingOverlaps, setIsRejectingOverlaps] = useState(false);
  const [recoveryResults, setRecoveryResults] = useState<
    RejectWithRecoveryResult[] | null
  >(null);

  const rows = visibleShadowElements(
    elements,
    overrides,
    statusFilter,
    qualityFilter,
    municipalityFilter,
    searchQuery,
    sortMode,
  );

  // Built from every live element AND every snapshot row, regardless of
  // the other filters -- a live-only list would go empty (so nothing left
  // to pick from) whenever Current is empty or filtered down to nothing,
  // even though the legacy snapshot still has municipalities in it.
  const municipalityOptions = [
    ...new Set([
      ...elements
        .map((element) => element.origin?.municipalityName)
        .filter((name): name is string => Boolean(name)),
      ...snapshots
        .map((s) => s.originMunicipalityName)
        .filter((name): name is string => Boolean(name)),
    ]),
  ].sort((a, b) => a.localeCompare(b));

  const handleChanged = (next: ShadowElement) => {
    setOverrides((prev) =>
      new Map(prev).set(next.id, keepLoadedDetail(elements, prev, next)),
    );
  };

  // overrides exists only to show a status change immediately without
  // waiting on a refetch -- once a real refetch happens, its freshly loaded
  // elements are the source of truth again, so drop the overrides or a
  // promoted/rejected/restored element's attachments stay frozen at
  // whatever they were when it was last changed, even after refresh.
  const handleRefresh = () => {
    setOverrides(new Map());
    void refresh();
  };

  // A rebuild replaces the whole shadow taxonomy, so when one finishes
  // everything on this tab is stale -- the live list, the cached real-TEF
  // overlap check and every snapshot view.
  const {
    run: latestRebuild,
    isActive: isRebuildActive,
    refresh: refreshLatestRebuild,
  } = useLatestRebuildRun(() => {
    handleRefresh();
    setHasCheckedOverlaps(false);
    setSnapshotRefreshToken((n) => n + 1);
  });

  const openRematchReport = (snapshotRunId: string) => {
    setPickedSnapshotRunId(snapshotRunId);
    setViewMode("report");
  };

  const handleTakeSnapshot = async () => {
    // window.prompt returns null on Cancel, same as typing nothing and
    // hitting OK would -- check for null specifically before taking the
    // snapshot, or canceling the dialog would still freeze with no label.
    const label = window.prompt(
      'Optional label for this snapshot (e.g. "before 2026-11 shadow TEF handoff rerun")',
    );
    if (label === null) return;

    setIsTakingSnapshot(true);
    try {
      const result = await createTefFreeze(label.trim() || undefined);
      setPickedSnapshotRunId(result.snapshotRunId);
      setSnapshotRefreshToken((n) => n + 1);
      toast.success(
        `Snapshot taken: ${result.activityShiftCount} matches, ${result.shadowElementCount} shadow elements frozen.`,
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to take snapshot",
      );
    } finally {
      setIsTakingSnapshot(false);
    }
  };

  const handleDeleteSnapshot = async () => {
    if (!selectedSnapshotRunId) return;
    setIsDeletingSnapshot(true);
    try {
      await deleteTefSnapshot(selectedSnapshotRunId);
      setPickedSnapshotRunId(null);
      setSnapshotRefreshToken((n) => n + 1);
      toast.success("Snapshot deleted.");
      setIsDeleteSnapshotOpen(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete snapshot",
      );
    } finally {
      setIsDeletingSnapshot(false);
    }
  };

  const handleRestoreSnapshot = async () => {
    if (!selectedSnapshotRunId) return;
    setIsRestoringSnapshot(true);
    try {
      const result = await restoreTefSnapshot(selectedSnapshotRunId);
      handleRefresh();
      setHasCheckedOverlaps(false);
      setSnapshotRefreshToken((n) => n + 1);
      void refreshLatestRebuild();
      toast.success(
        `Snapshot restored: ${result.shadowElementsRestored} shadow elements and ${result.shiftsRestored} commitments put back` +
          (result.shiftsMissing
            ? ` (${result.shiftsMissing} commitments no longer exist).`
            : "."),
      );
      setIsRestoreSnapshotOpen(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to restore snapshot",
      );
    } finally {
      setIsRestoringSnapshot(false);
    }
  };

  const handleRemoveAll = async () => {
    setIsRemovingAll(true);
    try {
      const { deletedCount } = await deleteAllShadowElements();
      setOverrides(new Map());
      await refresh();
      setHasCheckedOverlaps(false);
      toast.success(
        t("shadowTaxonomy.removeAllSuccess", { count: deletedCount }),
      );
      setIsRemoveAllOpen(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("shadowTaxonomy.removeAllError"),
      );
    } finally {
      setIsRemovingAll(false);
    }
  };

  const handleOpenMergeReview = async () => {
    setIsMergeReviewOpen(true);
    setIsLoadingMergeCandidates(true);
    try {
      setMergeGroups(await fetchMergeCandidates());
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("shadowTaxonomy.mergeCandidatesError"),
      );
      setIsMergeReviewOpen(false);
    } finally {
      setIsLoadingMergeCandidates(false);
    }
  };

  const handleConfirmMerges = async (
    groups: { canonicalId: string; mergedIds: string[] }[],
  ) => {
    setIsConfirmingMerges(true);
    try {
      const { mergedCount } = await confirmShadowElementMerges(groups);
      setOverrides(new Map());
      await refresh();
      setHasCheckedOverlaps(false);
      toast.success(t("shadowTaxonomy.mergeSuccess", { count: mergedCount }));
      setIsMergeReviewOpen(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("shadowTaxonomy.mergeError"),
      );
    } finally {
      setIsConfirmingMerges(false);
    }
  };

  const handleUnlink = async (id: string, label: string) => {
    try {
      await unlinkShadowElement(id);
      setOverrides(new Map());
      await refresh();
      setHasCheckedOverlaps(false);
      toast.success(t("shadowTaxonomy.unlinkSuccess", { label }));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("shadowTaxonomy.unlinkError"),
      );
    }
  };

  const handleRecomputeOverlaps = async () => {
    setIsLoadingRealOverlaps(true);
    try {
      setRealOverlaps(await fetchRealTaxonomyOverlaps());
      setHasCheckedOverlaps(true);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("shadowTaxonomy.realOverlapCandidatesError"),
      );
    } finally {
      setIsLoadingRealOverlaps(false);
    }
  };

  // Only auto-fetches the first time -- reopening the dialog later shows
  // whatever's already cached in realOverlaps instead of re-spending LLM
  // calls on a list the reviewer hasn't acted on yet. "Recompute" inside
  // the dialog forces a fresh check explicitly.
  const handleOpenRealOverlapReview = async () => {
    setIsRealOverlapReviewOpen(true);
    setRecoveryResults(null);
    if (!hasCheckedOverlaps) await handleRecomputeOverlaps();
  };

  const handleRejectOverlaps = async (
    items: { shadowElementId: string; realStableId: string }[],
  ) => {
    setIsRejectingOverlaps(true);
    try {
      const results = await rejectShadowElementsWithRecovery(items);
      setOverrides(new Map());
      await refresh();
      setHasCheckedOverlaps(false);
      setRecoveryResults(results);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("shadowTaxonomy.realOverlapRejectError"),
      );
    } finally {
      setIsRejectingOverlaps(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1 min-w-[280px]">
          <h2 className="text-xl font-semibold text-gray-01">
            {t("shadowTaxonomy.title")}
          </h2>
          <p className="text-sm text-gray-02 mt-1 max-w-2xl">
            {t("shadowTaxonomy.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            aria-label={t("shadowTaxonomy.refresh")}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <div className="flex rounded-md border border-gray-03 overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode("off")}
              title="Hide the snapshot comparison entirely"
              className={cn(
                "px-3 py-1.5 text-sm",
                viewMode === "off"
                  ? "bg-gray-03/40 text-gray-01 font-medium"
                  : "text-gray-02 hover:text-gray-01",
              )}
            >
              Off
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={cn(
                "px-3 py-1.5 text-sm border-l border-gray-03",
                viewMode === "list"
                  ? "bg-blue-03/15 text-blue-03 font-medium"
                  : "text-gray-02 hover:text-gray-01",
              )}
            >
              List
            </button>
            <button
              type="button"
              onClick={() => setViewMode("diff")}
              disabled={!hasSnapshot}
              title={
                hasSnapshot
                  ? undefined
                  : "No snapshot exists yet -- take one to compare against"
              }
              className={cn(
                "px-3 py-1.5 text-sm border-l border-gray-03 disabled:opacity-40 disabled:cursor-not-allowed",
                viewMode === "diff"
                  ? "bg-purple-03/15 text-purple-03 font-medium"
                  : "text-gray-02 hover:text-gray-01",
              )}
            >
              Diff vs snapshot
            </button>
            <button
              type="button"
              onClick={() => setViewMode("report")}
              disabled={!hasSnapshot}
              title={
                hasSnapshot
                  ? "Where the commitments that were on shadow elements in this snapshot ended up"
                  : "No snapshot exists yet"
              }
              className={cn(
                "px-3 py-1.5 text-sm border-l border-gray-03 disabled:opacity-40 disabled:cursor-not-allowed",
                viewMode === "report"
                  ? "bg-green-03/15 text-green-03 font-medium"
                  : "text-gray-02 hover:text-gray-01",
              )}
            >
              Rematch report
            </button>
          </div>
          {tefSnapshots.length > 0 && (
            <label className="text-xs text-gray-02 flex items-center gap-2">
              Snapshot
              <select
                className="h-9 max-w-[18rem] rounded-md border border-gray-03 bg-gray-04/40 px-2 text-sm text-gray-01"
                value={selectedSnapshotRunId ?? ""}
                onChange={(e) => setPickedSnapshotRunId(e.target.value)}
              >
                {tefSnapshots.map((snap) => (
                  <option key={snap.snapshotRunId} value={snap.snapshotRunId}>
                    {formatSnapshotName(snap)} ({snap.shadowElementCount}{" "}
                    shadow, {snap.activityShiftCount} matches)
                  </option>
                ))}
              </select>
            </label>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleTakeSnapshot()}
            disabled={isTakingSnapshot}
            title="Freeze the current TEF matches and shadow taxonomy. Earlier snapshots are kept."
          >
            {isTakingSnapshot ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Camera className="w-4 h-4 mr-1.5" />
            )}
            Take snapshot
          </Button>
          {hasSnapshot ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteSnapshotOpen(true)}
              className="border-pink-03/40 text-pink-03 hover:bg-pink-03/10 hover:border-pink-03"
              title={
                selectedSnapshot
                  ? `Delete “${formatSnapshotName(selectedSnapshot)}”`
                  : undefined
              }
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Delete snapshot
            </Button>
          ) : null}
          {hasSnapshot ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsRestoreSnapshotOpen(true)}
              disabled={isRebuildActive}
              title={
                isRebuildActive
                  ? "Wait for the running rebuild to finish"
                  : "Put the shadow taxonomy and TEF matches back as they were in the selected snapshot"
              }
            >
              <RotateCcw className="w-4 h-4 mr-1.5" />
              Restore snapshot
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsRebuildOpen(true)}
            disabled={isRebuildActive}
            title={
              isRebuildActive
                ? "A rebuild is already running"
                : "Snapshot, delete all shadow elements and rematch their commitments against the current TEF"
            }
          >
            <Hammer className="w-4 h-4 mr-1.5" />
            Rebuild shadow taxonomy
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleOpenMergeReview()}
            disabled={elements.length === 0}
          >
            <GitMerge className="w-4 h-4 mr-1.5" />
            {t("shadowTaxonomy.mergeDuplicates")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleOpenRealOverlapReview()}
            disabled={elements.length === 0}
          >
            <ShieldCheck className="w-4 h-4 mr-1.5" />
            {t("shadowTaxonomy.checkRealTef")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsRemoveAllOpen(true)}
            disabled={elements.length === 0}
            className="border-pink-03/40 text-pink-03 hover:bg-pink-03/10 hover:border-pink-03"
          >
            <Trash2 className="w-4 h-4 mr-1.5" />
            {t("shadowTaxonomy.removeAll")}
          </Button>
        </div>
      </div>

      <ShadowRebuildBanner
        run={latestRebuild}
        onOpenReport={openRematchReport}
        onResumed={() => void refreshLatestRebuild()}
      />

      <ShadowRebuildDialog
        open={isRebuildOpen}
        onOpenChange={setIsRebuildOpen}
        onStarted={(run) => {
          setPickedSnapshotRunId(run.snapshotRunId);
          setSnapshotRefreshToken((n) => n + 1);
          void refreshLatestRebuild();
        }}
      />

      <MergeReviewDialog
        open={isMergeReviewOpen}
        onOpenChange={setIsMergeReviewOpen}
        groups={mergeGroups}
        isLoading={isLoadingMergeCandidates}
        isConfirming={isConfirmingMerges}
        onConfirm={handleConfirmMerges}
      />

      <RealOverlapReviewDialog
        open={isRealOverlapReviewOpen}
        onOpenChange={setIsRealOverlapReviewOpen}
        overlaps={realOverlaps}
        isLoading={isLoadingRealOverlaps}
        isConfirming={isRejectingOverlaps}
        recoveryResults={recoveryResults}
        onConfirm={handleRejectOverlaps}
        onRecompute={() => void handleRecomputeOverlaps()}
      />

      <ConfirmDialog
        open={isRemoveAllOpen}
        onOpenChange={setIsRemoveAllOpen}
        title={t("shadowTaxonomy.removeAllTitle")}
        description={t("shadowTaxonomy.removeAllDescription")}
        cancelLabel={t("shadowTaxonomy.removeAllCancel")}
        confirmLabel={t("shadowTaxonomy.removeAllConfirm")}
        confirmVariant="danger"
        onConfirm={handleRemoveAll}
        isLoading={isRemovingAll}
      />

      <ConfirmDialog
        open={isDeleteSnapshotOpen}
        onOpenChange={setIsDeleteSnapshotOpen}
        title="Delete snapshot?"
        description={`Removes the snapshot “${selectedSnapshot ? formatSnapshotName(selectedSnapshot) : ""}” (frozen TEF matches + shadow taxonomy) for good. Other snapshots are kept.`}
        cancelLabel="Cancel"
        confirmLabel="Delete snapshot"
        confirmVariant="danger"
        onConfirm={handleDeleteSnapshot}
        isLoading={isDeletingSnapshot}
      />

      <ConfirmDialog
        open={isRestoreSnapshotOpen}
        onOpenChange={setIsRestoreSnapshotOpen}
        title="Restore snapshot?"
        description={`Puts the shadow taxonomy and TEF matches back exactly as they were in “${selectedSnapshot ? formatSnapshotName(selectedSnapshot) : ""}”. Every current shadow element is replaced, including any promote/reject/comment work done since. Take a snapshot first if you want to keep the current state. The snapshot itself is kept, so you can restore it again.`}
        cancelLabel="Cancel"
        confirmLabel="Restore snapshot"
        confirmVariant="danger"
        onConfirm={handleRestoreSnapshot}
        isLoading={isRestoringSnapshot}
      />

      {viewMode === "report" ? (
        <RematchReportView
          snapshotRunId={selectedSnapshotRunId}
          refreshToken={
            // Refetch as the rebuild progresses, not just at the end.
            snapshotRefreshToken + (latestRebuild?.doneShifts ?? 0)
          }
          municipalityFilter={municipalityFilter}
        />
      ) : viewMode === "diff" ? (
        <ShadowTaxonomyDiffView
          elements={elements}
          refreshToken={snapshotRefreshToken}
          snapshotRunId={selectedSnapshotRunId}
          municipalityFilter={municipalityFilter}
        />
      ) : (
        (() => {
          const currentPane = (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-xs text-gray-02 flex items-center gap-2">
                  {t("shadowTaxonomy.filterStatus")}
                  <select
                    className="h-9 rounded-md border border-gray-03 bg-gray-04/40 px-2 text-sm text-gray-01"
                    value={statusFilter}
                    onChange={(e) =>
                      setStatusFilter(
                        e.target.value as ShadowElementStatus | "",
                      )
                    }
                  >
                    <option value="">{t("shadowTaxonomy.statusAll")}</option>
                    <option value="preliminary">
                      {t("shadowTaxonomy.statusPreliminary")}
                    </option>
                    <option value="promoted">
                      {t("shadowTaxonomy.statusPromoted")}
                    </option>
                    <option value="rejected">
                      {t("shadowTaxonomy.statusRejected")}
                    </option>
                    <option value="merged">
                      {t("shadowTaxonomy.statusMerged")}
                    </option>
                  </select>
                </label>
                <label className="text-xs text-gray-02 flex items-center gap-2">
                  {t("shadowTaxonomy.filterQuality")}
                  <select
                    className="h-9 rounded-md border border-gray-03 bg-gray-04/40 px-2 text-sm text-gray-01"
                    value={qualityFilter}
                    onChange={(e) =>
                      setQualityFilter(
                        e.target.value as ShadowElementQuality | "",
                      )
                    }
                  >
                    <option value="">{t("shadowTaxonomy.statusAll")}</option>
                    <option value="specific">
                      {t("shadowTaxonomy.qualitySpecific")}
                    </option>
                    <option value="narrowable">
                      {t("shadowTaxonomy.qualityNarrowable")}
                    </option>
                    <option value="vague">
                      {t("shadowTaxonomy.qualityVague")}
                    </option>
                  </select>
                </label>
                <label className="text-xs text-gray-02 flex items-center gap-2">
                  Municipality
                  <select
                    className="h-9 rounded-md border border-gray-03 bg-gray-04/40 px-2 text-sm text-gray-01"
                    value={municipalityFilter}
                    onChange={(e) => setMunicipalityFilter(e.target.value)}
                  >
                    <option value="">{t("shadowTaxonomy.statusAll")}</option>
                    {municipalityOptions.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-gray-02 flex items-center gap-2">
                  {t("shadowTaxonomy.sortBy")}
                  <select
                    className="h-9 rounded-md border border-gray-03 bg-gray-04/40 px-2 text-sm text-gray-01"
                    value={sortMode}
                    onChange={(e) =>
                      setSortMode(e.target.value as ShadowSortMode)
                    }
                  >
                    <option value="attached">
                      {t("shadowTaxonomy.sortMostAttached")}
                    </option>
                    <option value="newest">
                      {t("shadowTaxonomy.sortNewest")}
                    </option>
                    <option value="oldest">
                      {t("shadowTaxonomy.sortOldest")}
                    </option>
                  </select>
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("shadowTaxonomy.themeSearchPlaceholder")}
                  className="h-9 w-48 rounded-md border border-gray-03 bg-gray-04/40 px-2.5 text-sm text-gray-01 focus:outline-none focus:border-blue-03"
                />
                <span className="text-xs text-gray-02">
                  {t("shadowTaxonomy.count", { count: rows.length })}
                </span>
                <button
                  type="button"
                  disabled={rows.length === 0}
                  onClick={() =>
                    void copyMarkdown(
                      shadowTaxonomyMarkdown({
                        elements: rows,
                        filters: [
                          statusFilter
                            ? `status = ${statusFilter}`
                            : "status = all except merged/rejected",
                          qualityFilter && `quality = ${qualityFilter}`,
                          municipalityFilter &&
                            `origin municipality = ${municipalityFilter}`,
                          searchQuery.trim() &&
                            `search = "${searchQuery.trim()}"`,
                        ].filter((f): f is string => Boolean(f)),
                        groupByDay: sortMode !== "attached",
                        dayKey: createdDayKey,
                        formatDay: (iso) =>
                          new Date(iso).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          }),
                        formatDate: (iso) =>
                          new Date(iso).toLocaleString("sv-SE", {
                            dateStyle: "short",
                            timeStyle: "short",
                          }),
                      }),
                      "shadow-taxonomy.md",
                      "Shadow taxonomy",
                    )
                  }
                  title="Copy the shadow elements shown below, with their attached commitments, as Markdown"
                  className="inline-flex items-center gap-1.5 rounded-md border border-gray-03 px-2.5 py-1 text-xs text-gray-02 hover:text-gray-01 hover:bg-gray-04/50 disabled:opacity-50"
                >
                  <ClipboardCopy className="w-3.5 h-3.5" />
                  Copy as Markdown
                </button>
              </div>

              {isLoading && (
                <div className="flex justify-center p-8">
                  <Loader2 className="w-6 h-6 text-blue-03 animate-spin" />
                </div>
              )}
              {error && (
                <p className="text-sm text-pink-03">
                  {t("shadowTaxonomy.error", { error })}
                </p>
              )}
              {!isLoading && !error && rows.length === 0 && (
                <p className="text-sm text-gray-02">
                  {t("shadowTaxonomy.empty")}
                </p>
              )}
              {!isLoading && rows.length > 0 && (
                <div className="space-y-3">
                  {rows.map((el, index) => {
                    const showDivider =
                      sortMode !== "attached" &&
                      (index === 0 ||
                        createdDayKey(rows[index - 1]) !== createdDayKey(el));
                    return (
                      <div key={el.id} className="space-y-3">
                        {showDivider && (
                          <div className="flex items-center gap-3 pt-2 text-xs text-gray-02">
                            <div className="h-px flex-1 bg-gray-03" />
                            <span>
                              {t("shadowTaxonomy.addedOn", {
                                date: new Date(el.createdAt).toLocaleDateString(
                                  localeIntl,
                                  {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  },
                                ),
                              })}
                            </span>
                            <div className="h-px flex-1 bg-gray-03" />
                          </div>
                        )}
                        <ShadowElementCard
                          element={el}
                          onChanged={handleChanged}
                          onUnlink={(id, label) => void handleUnlink(id, label)}
                          onResolved={handleRefresh}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          );

          if (viewMode === "off") return currentPane;

          const legacyPane = (
            <ShadowTaxonomyLegacyView
              refreshToken={snapshotRefreshToken}
              snapshotRunId={selectedSnapshotRunId}
              municipalityFilter={municipalityFilter}
            />
          );

          // Current elements and the frozen snapshot can each run to
          // hundreds of rows -- side by side only once there's room for two
          // columns; below that, a tab picks one at a time instead of a
          // long, unusable scroll of current-then-legacy.
          if (isLargeScreen) {
            return (
              <div className="grid grid-cols-2 gap-4 items-start min-w-0">
                <div className="min-w-0 space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-02">
                    Current
                  </h3>
                  {currentPane}
                </div>
                <div className="min-w-0 space-y-3">
                  <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-purple-03">
                    <History className="w-3.5 h-3.5" />
                    Legacy snapshot
                  </h3>
                  {legacyPane}
                </div>
              </div>
            );
          }

          return (
            <div className="space-y-3 min-w-0">
              <div className="flex gap-2 border-b border-gray-03 pb-2">
                <button
                  type="button"
                  onClick={() => setShadowPane("current")}
                  className={cn(
                    "px-3 py-1.5 text-sm rounded-md",
                    shadowPane === "current"
                      ? "bg-blue-03/15 text-blue-03 font-medium"
                      : "text-gray-02 hover:text-gray-01",
                  )}
                >
                  Current
                </button>
                <button
                  type="button"
                  onClick={() => setShadowPane("legacy")}
                  className={cn(
                    "px-3 py-1.5 text-sm rounded-md flex items-center gap-1.5",
                    shadowPane === "legacy"
                      ? "bg-purple-03/15 text-purple-03 font-medium"
                      : "text-gray-02 hover:text-gray-01",
                  )}
                >
                  <History className="w-3.5 h-3.5" />
                  Legacy snapshot
                </button>
              </div>
              {shadowPane === "current" ? currentPane : legacyPane}
            </div>
          );
        })()
      )}
    </div>
  );
}
