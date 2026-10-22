import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Loader2, RefreshCw, Trash2, GitMerge, ShieldCheck, Check, X, Undo2, Link2Off } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/contexts/I18nContext";
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
import {
  useShadowElements,
  updateShadowElementStatus,
  deleteAllShadowElements,
  fetchMergeCandidates,
  confirmShadowElementMerges,
  unlinkShadowElement,
  fetchRealTaxonomyOverlaps,
  rejectShadowElementsWithRecovery,
  type ShadowElement,
  type ShadowElementStatus,
  type ShadowElementQuality,
  type MergeGroup,
  type RealTaxonomyOverlap,
  type RejectWithRecoveryResult,
} from "./hooks/useShadowElements";

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
    overrides.get(next.id) ?? elements.find((element) => element.id === next.id);
  if (!loaded?.attachments) return next;
  return { ...loaded, status: next.status };
}

function ShadowElementCard({
  element,
  onChanged,
  onUnlink,
}: {
  element: ShadowElement;
  onChanged: (next: ShadowElement) => void;
  onUnlink: (id: string, label: string) => void;
}) {
  const { t } = useI18n();
  const [isExpanded, setIsExpanded] = useState(false);
  // Tracks WHICH action is in flight, not just whether one is -- promote,
  // reject, and restore share one save path, so a boolean can only ever
  // light up one button's spinner regardless of which button was clicked.
  const [pendingStatus, setPendingStatus] = useState<ShadowElementStatus | null>(null);
  const isSaving = pendingStatus !== null;
  const isMerged = element.status === "merged";

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
              {t(`shadowTaxonomy.status${element.status[0].toUpperCase()}${element.status.slice(1)}`)}
            </span>
            <span className="inline-flex items-center rounded-full border border-blue-03/30 bg-blue-03/10 px-2 py-0.5 text-[11px] font-medium text-blue-03">
              {element.activityShiftCategory}
            </span>
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
                QUALITY_STYLE[element.qualityGrade],
              )}
              title={t(`shadowTaxonomy.quality${element.qualityGrade[0].toUpperCase()}${element.qualityGrade.slice(1)}Hint`)}
            >
              {t(`shadowTaxonomy.quality${element.qualityGrade[0].toUpperCase()}${element.qualityGrade.slice(1)}`)}
            </span>
            {element.mergedElements.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-gray-03 bg-gray-03/20 px-2 py-0.5 text-[11px] font-medium text-gray-02">
                <GitMerge className="h-3 w-3" />
                {t("shadowTaxonomy.mergedIntoCount", { count: element.mergedElements.length })}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-02 mt-1">{element.description}</p>
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

      {isExpanded && (
        <div className="border-t border-gray-03/50 pt-3 space-y-2">
          {element.mergedElements.map((m) => (
            <div
              key={m.id}
              className="rounded-lg bg-gray-03/10 p-3 flex items-start justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-01">{m.shortLabel}</p>
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
          {element.attachments.map((a) => (
            <div
              key={a.shiftId}
              className="rounded-lg bg-gray-05/50 p-3 space-y-1"
            >
              <div className="flex items-center gap-2 text-xs flex-wrap">
                {a.isOrigin && <OriginPill />}
                <span className="font-medium text-gray-01">
                  {a.municipalityName ?? "Unknown municipality"}
                </span>
                <span className="text-gray-02 font-mono">
                  {a.shiftFrom} → {a.shiftTo}
                </span>
              </div>
              <p className="text-xs text-gray-02 italic">{a.measureText}</p>
              {a.aiReviewExplanation && (
                <p className="text-xs text-purple-03">
                  {a.aiReviewExplanation}
                </p>
              )}
            </div>
          ))}
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

function attachmentSummaryKey(measures: number, municipalities: number): string {
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
  const attachmentDifference = right.attachments.length - left.attachments.length;
  if (attachmentDifference !== 0) return attachmentDifference;
  return left.shortLabel.localeCompare(right.shortLabel);
}

function visibleShadowElements(
  elements: ShadowElement[],
  overrides: Map<string, ShadowElement>,
  statusFilter: ShadowElementStatus | "",
  qualityFilter: ShadowElementQuality | "",
): ShadowElement[] {
  return elements
    .map((element) => overrides.get(element.id) ?? element)
    // "All" (empty filter) deliberately excludes merged and rejected --
    // both are settled, no-longer-needs-attention states, same reasoning
    // as merged. Still reachable by explicitly picking that status in the
    // filter (e.g. for the unlink workflow, or to double check a reject).
    .filter((element) =>
      statusFilter ? element.status === statusFilter : element.status !== "merged" && element.status !== "rejected",
    )
    .filter((element) => !qualityFilter || element.qualityGrade === qualityFilter)
    .sort(byMostAttached);
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
      groups.map((g) => ({ canonicalId: g.suggestedCanonicalId, excludedIds: new Set<string>() })),
    );
  }, [groups]);

  const setCanonical = (groupIndex: number, id: string) => {
    setSelections((prev) => prev.map((s, i) => (i === groupIndex ? { ...s, canonicalId: id } : s)));
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
      return mergedIds.length > 0 ? { canonicalId: sel.canonicalId, mergedIds } : null;
    })
    .filter((g): g is { canonicalId: string; mergedIds: string[] } => g !== null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("shadowTaxonomy.mergeReviewTitle")}</DialogTitle>
          <DialogDescription>{t("shadowTaxonomy.mergeReviewDescription")}</DialogDescription>
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
                <div key={groupIndex} className="rounded-xl border border-gray-03 p-3 space-y-2">
                  {g.members.map((m) => {
                    const isCanonical = m.id === sel.canonicalId;
                    const isExcluded = sel.excludedIds.has(m.id);
                    return (
                      <div
                        key={m.id}
                        className={cn(
                          "flex items-start gap-3 rounded-lg p-2",
                          isCanonical ? "bg-green-03/10" : isExcluded ? "opacity-40" : "bg-gray-05/50",
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
                          <p className="text-sm font-medium text-gray-01">{m.shortLabel}</p>
                          <p className="text-xs text-gray-02">{m.description}</p>
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
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
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

function RealOverlapReviewDialog({
  open,
  onOpenChange,
  overlaps,
  isLoading,
  isConfirming,
  recoveryResults,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  overlaps: RealTaxonomyOverlap[];
  isLoading: boolean;
  isConfirming: boolean;
  // Set once confirming succeeds -- switches the dialog from the checklist
  // to a one-liner summary of what got recovered, instead of auto-closing.
  recoveryResults: RejectWithRecoveryResult[] | null;
  onConfirm: (items: { shadowElementId: string; realStableId: string }[]) => void;
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
      .map((o) => ({ shadowElementId: o.shadowElementId, realStableId: o.realStableId }));
    onConfirm(items);
  };

  if (recoveryResults) {
    const totalShifts = recoveryResults.reduce((sum, r) => sum + r.recoveredShifts.length, 0);
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("shadowTaxonomy.realOverlapDoneTitle", { count: recoveryResults.length })}</DialogTitle>
            <DialogDescription>{t("shadowTaxonomy.realOverlapDoneDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {recoveryResults.map((r) => (
              <div key={r.shadowElementId} className="rounded-xl border border-gray-03 p-3 space-y-2">
                <p className="text-sm text-gray-02">
                  <span className="line-through">{r.shadowShortLabel}</span>
                  {" → "}
                  <span className="font-medium text-gray-01">{r.realShortLabel}</span>
                </p>
                <div className="space-y-1">
                  {r.recoveredShifts.map((s) => (
                    <p key={s.shiftId} className="text-xs text-gray-02 font-mono">
                      {s.municipalityName ?? "Unknown municipality"}: {s.shiftFrom} → {s.shiftTo}
                    </p>
                  ))}
                </div>
              </div>
            ))}
            {totalShifts === 0 && (
              <p className="text-xs text-gray-02 italic">No shifts were attached to the replaced elements.</p>
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
          <DialogTitle>{t("shadowTaxonomy.realOverlapReviewTitle")}</DialogTitle>
          <DialogDescription>{t("shadowTaxonomy.realOverlapReviewDescription")}</DialogDescription>
        </DialogHeader>

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
                    <p className="text-sm font-medium text-gray-01">{o.shadowShortLabel}</p>
                    <p className="text-xs text-gray-02">{o.shadowDescription}</p>
                  </div>
                  <div className="rounded-lg bg-blue-03/10 border border-blue-03/30 p-2">
                    <p className="text-[11px] font-medium text-blue-03 uppercase tracking-wide">
                      {t("shadowTaxonomy.realOverlapRealLabel")}
                    </p>
                    <p className="text-sm text-gray-01">{o.realShortLabel}</p>
                    <p className="text-xs text-gray-02">{o.realDescription}</p>
                  </div>
                  <p className="text-xs text-gray-02 italic">{o.reasoning}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {t("shadowTaxonomy.realOverlapReviewCancel")}
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={isConfirming || checked.size === 0}
            onClick={handleConfirm}
          >
            {isConfirming && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t("shadowTaxonomy.realOverlapReviewConfirm", { count: checked.size })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ShadowTaxonomyTab() {
  const { t } = useI18n();
  const { elements, isLoading, error, refresh } = useShadowElements();
  const [statusFilter, setStatusFilter] = useState<ShadowElementStatus | "">("");
  const [qualityFilter, setQualityFilter] = useState<ShadowElementQuality | "">("");
  const [overrides, setOverrides] = useState<Map<string, ShadowElement>>(
    new Map(),
  );
  const [isRemoveAllOpen, setIsRemoveAllOpen] = useState(false);
  const [isRemovingAll, setIsRemovingAll] = useState(false);
  const [isMergeReviewOpen, setIsMergeReviewOpen] = useState(false);
  const [isLoadingMergeCandidates, setIsLoadingMergeCandidates] = useState(false);
  const [mergeGroups, setMergeGroups] = useState<MergeGroup[]>([]);
  const [isConfirmingMerges, setIsConfirmingMerges] = useState(false);
  const [isRealOverlapReviewOpen, setIsRealOverlapReviewOpen] = useState(false);
  const [isLoadingRealOverlaps, setIsLoadingRealOverlaps] = useState(false);
  const [realOverlaps, setRealOverlaps] = useState<RealTaxonomyOverlap[]>([]);
  const [isRejectingOverlaps, setIsRejectingOverlaps] = useState(false);
  const [recoveryResults, setRecoveryResults] = useState<RejectWithRecoveryResult[] | null>(null);

  const rows = visibleShadowElements(elements, overrides, statusFilter, qualityFilter);

  const handleChanged = (next: ShadowElement) => {
    setOverrides((prev) => new Map(prev).set(next.id, keepLoadedDetail(elements, prev, next)));
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

  const handleRemoveAll = async () => {
    setIsRemovingAll(true);
    try {
      const { deletedCount } = await deleteAllShadowElements();
      setOverrides(new Map());
      await refresh();
      toast.success(t("shadowTaxonomy.removeAllSuccess", { count: deletedCount }));
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
        err instanceof Error ? err.message : t("shadowTaxonomy.mergeCandidatesError"),
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
      toast.success(t("shadowTaxonomy.mergeSuccess", { count: mergedCount }));
      setIsMergeReviewOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("shadowTaxonomy.mergeError"));
    } finally {
      setIsConfirmingMerges(false);
    }
  };

  const handleUnlink = async (id: string, label: string) => {
    try {
      await unlinkShadowElement(id);
      setOverrides(new Map());
      await refresh();
      toast.success(t("shadowTaxonomy.unlinkSuccess", { label }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("shadowTaxonomy.unlinkError"));
    }
  };

  const handleOpenRealOverlapReview = async () => {
    setIsRealOverlapReviewOpen(true);
    setRecoveryResults(null);
    setIsLoadingRealOverlaps(true);
    try {
      setRealOverlaps(await fetchRealTaxonomyOverlaps());
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("shadowTaxonomy.realOverlapCandidatesError"),
      );
      setIsRealOverlapReviewOpen(false);
    } finally {
      setIsLoadingRealOverlaps(false);
    }
  };

  const handleRejectOverlaps = async (
    items: { shadowElementId: string; realStableId: string }[],
  ) => {
    setIsRejectingOverlaps(true);
    try {
      const results = await rejectShadowElementsWithRecovery(items);
      setOverrides(new Map());
      await refresh();
      setRecoveryResults(results);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("shadowTaxonomy.realOverlapRejectError"),
      );
    } finally {
      setIsRejectingOverlaps(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-01">
            {t("shadowTaxonomy.title")}
          </h2>
          <p className="text-sm text-gray-02 mt-1 max-w-2xl">
            {t("shadowTaxonomy.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            aria-label={t("shadowTaxonomy.refresh")}
          >
            <RefreshCw className="w-4 h-4" />
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

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-xs text-gray-02 flex items-center gap-2">
          {t("shadowTaxonomy.filterStatus")}
          <select
            className="h-9 rounded-md border border-gray-03 bg-gray-04/40 px-2 text-sm text-gray-01"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as ShadowElementStatus | "")
            }
          >
            <option value="">{t("shadowTaxonomy.statusAll")}</option>
            <option value="preliminary">
              {t("shadowTaxonomy.statusPreliminary")}
            </option>
            <option value="promoted">{t("shadowTaxonomy.statusPromoted")}</option>
            <option value="rejected">{t("shadowTaxonomy.statusRejected")}</option>
            <option value="merged">{t("shadowTaxonomy.statusMerged")}</option>
          </select>
        </label>
        <label className="text-xs text-gray-02 flex items-center gap-2">
          {t("shadowTaxonomy.filterQuality")}
          <select
            className="h-9 rounded-md border border-gray-03 bg-gray-04/40 px-2 text-sm text-gray-01"
            value={qualityFilter}
            onChange={(e) =>
              setQualityFilter(e.target.value as ShadowElementQuality | "")
            }
          >
            <option value="">{t("shadowTaxonomy.statusAll")}</option>
            <option value="specific">{t("shadowTaxonomy.qualitySpecific")}</option>
            <option value="narrowable">{t("shadowTaxonomy.qualityNarrowable")}</option>
            <option value="vague">{t("shadowTaxonomy.qualityVague")}</option>
          </select>
        </label>
        <span className="text-xs text-gray-02">
          {t("shadowTaxonomy.count", { count: rows.length })}
        </span>
      </div>

      {isLoading && (
        <div className="flex justify-center p-8">
          <Loader2 className="w-6 h-6 text-blue-03 animate-spin" />
        </div>
      )}
      {error && <p className="text-sm text-pink-03">{t("shadowTaxonomy.error", { error })}</p>}
      {!isLoading && !error && rows.length === 0 && (
        <p className="text-sm text-gray-02">{t("shadowTaxonomy.empty")}</p>
      )}
      {!isLoading && rows.length > 0 && (
        <div className="space-y-3">
          {rows.map((el) => (
            <ShadowElementCard key={el.id} element={el} onChanged={handleChanged} onUnlink={(id, label) => void handleUnlink(id, label)} />
          ))}
        </div>
      )}
    </div>
  );
}
