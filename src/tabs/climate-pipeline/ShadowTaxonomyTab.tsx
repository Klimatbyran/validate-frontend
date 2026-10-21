import { useState } from "react";
import { ChevronDown, ChevronUp, Loader2, RefreshCw, Trash2, Check, X, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import { ConfirmDialog } from "@/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import {
  useShadowElements,
  updateShadowElementStatus,
  deleteAllShadowElements,
  type ShadowElement,
  type ShadowElementStatus,
  type ShadowElementQuality,
} from "./hooks/useShadowElements";

const STATUS_STYLE: Record<ShadowElementStatus, string> = {
  preliminary: "border-purple-03/40 bg-purple-03/10 text-purple-03",
  promoted: "border-green-03/40 bg-green-03/10 text-green-03",
  rejected: "border-gray-03 bg-gray-03/40 text-gray-02",
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
}: {
  element: ShadowElement;
  onChanged: (next: ShadowElement) => void;
}) {
  const { t } = useI18n();
  const [isExpanded, setIsExpanded] = useState(false);
  // Tracks WHICH action is in flight, not just whether one is -- promote,
  // reject, and restore share one save path, so a boolean can only ever
  // light up one button's spinner regardless of which button was clicked.
  const [pendingStatus, setPendingStatus] = useState<ShadowElementStatus | null>(null);
  const isSaving = pendingStatus !== null;

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
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-03/50 pt-3 space-y-2">
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
    .filter((element) => !statusFilter || element.status === statusFilter)
    .filter((element) => !qualityFilter || element.qualityGrade === qualityFilter)
    .sort(byMostAttached);
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
            onClick={() => setIsRemoveAllOpen(true)}
            disabled={elements.length === 0}
            className="border-pink-03/40 text-pink-03 hover:bg-pink-03/10 hover:border-pink-03"
          >
            <Trash2 className="w-4 h-4 mr-1.5" />
            {t("shadowTaxonomy.removeAll")}
          </Button>
        </div>
      </div>

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
            <ShadowElementCard key={el.id} element={el} onChanged={handleChanged} />
          ))}
        </div>
      )}
    </div>
  );
}
