import { useEffect, useMemo, useState } from "react";
import { Loader2, Trash2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import { MultiSelectDropdown } from "@/ui/multi-select-dropdown";
import type { GarboCompanyDetail } from "../lib/types";
import { updateReportingPeriods } from "../lib/companies-api";
import { inputClassName } from "../lib/company-edit-utils";
import { ReviewerMetadataDialog } from "./ReviewerMetadataDialog";
import { AddReportingPeriodFlow } from "./AddReportingPeriodFlow";

type EditedPeriod = {
  startDate?: string;
  endDate?: string;
  reportURL?: string;
};

function formatDateStamp(isoLike?: string | null) {
  if (!isoLike) return "—";
  return isoLike.slice(0, 10);
}

function getPeriodYear(period: { startDate?: string; endDate?: string }): string | null {
  const y = period.endDate?.slice(0, 4) ?? period.startDate?.slice(0, 4);
  return y || null;
}

/** Preserve time / timezone suffix when replacing the calendar day part. */
function mergeYmdIntoOriginal(ymd: string, originalIso: string): string {
  const i = originalIso.indexOf("T");
  if (i !== -1) return ymd + originalIso.slice(i);
  if (/^\d{4}-\d{2}-\d{2}$/.test(originalIso.trim())) return ymd;
  return ymd;
}

export function ReportingPeriodsDataTab({
  company,
  onSaved,
}: {
  company: GarboCompanyDetail;
  onSaved?: () => void;
}) {
  const { t } = useI18n();

  const periods = useMemo(
    () =>
      (company.reportingPeriods ?? []).filter(
        (rp) => rp.startDate && rp.endDate && rp.id
      ),
    [company.reportingPeriods]
  );

  const [edited, setEdited] = useState<Record<string, EditedPeriod>>({});
  const [comment, setComment] = useState("");
  const [source, setSource] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [showAllYears, setShowAllYears] = useState(true);
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  useEffect(() => {
    setEdited({});
    setComment("");
    setSource("");
    setSaving(false);
    setSaveDialogOpen(false);
    setShowAllYears(true);
    setSelectedYears([]);
    setSortOrder("desc");
    setDeleteModalOpen(false);
  }, [company.wikidataId]);

  const sortedPeriods = useMemo(() => {
    const key = (p: { endDate?: string; startDate?: string }) =>
      p.endDate ?? p.startDate ?? "";
    const sorted = [...periods].sort((a, b) => key(b).localeCompare(key(a)));
    return sortOrder === "desc" ? sorted : sorted.slice().reverse();
  }, [periods, sortOrder]);

  const years = useMemo(() => {
    const set = new Set<string>();
    sortedPeriods.forEach((p) => {
      const y = getPeriodYear(p);
      if (y) set.add(y);
    });
    const arr = Array.from(set).sort((a, b) => b.localeCompare(a));
    return sortOrder === "desc" ? arr : arr.slice().reverse();
  }, [sortedPeriods, sortOrder]);

  const visiblePeriods = useMemo(() => {
    const base = sortedPeriods;
    if (showAllYears) return base;
    if (!selectedYears.length) return base;
    return base.filter((p) => {
      const y = getPeriodYear(p);
      return y ? selectedYears.includes(y) : false;
    });
  }, [sortedPeriods, selectedYears, showAllYears]);

  const setPatch = (rpId: string, patch: Partial<EditedPeriod>) => {
    setEdited((prev) => ({
      ...prev,
      [rpId]: { ...(prev[rpId] ?? {}), ...patch },
    }));
  };

  const setUrl = (rpId: string, value: string, hadOriginal: boolean) => {
    setEdited((prev) => {
      const current = prev[rpId] ?? {};
      const next: EditedPeriod = { ...current };
      if (value.trim() === "" && !hadOriginal) {
        delete next.reportURL;
      } else {
        next.reportURL = value.trim() === "" ? "" : value;
      }
      const keys = Object.keys(next);
      if (!keys.length) {
        const out = { ...prev };
        delete out[rpId];
        return out;
      }
      return { ...prev, [rpId]: next };
    });
  };

  const resetPeriod = (rpId: string) => {
    setEdited((prev) => {
      const next = { ...prev };
      delete next[rpId];
      return next;
    });
  };

  const resetAll = () => setEdited({});

  const handleSave = async (meta?: { comment?: string; source?: string }) => {
    const payloadPeriods = visiblePeriods
      .map((rp) => {
        const e = edited[rp.id];
        if (!e) return null;

        const startYmd =
          e.startDate !== undefined ? e.startDate : formatDateStamp(rp.startDate);
        const endYmd = e.endDate !== undefined ? e.endDate : formatDateStamp(rp.endDate);
        if (!startYmd || startYmd === "—" || !endYmd || endYmd === "—") return null;

        const startDate = mergeYmdIntoOriginal(startYmd, rp.startDate);
        const endDate = mergeYmdIntoOriginal(endYmd, rp.endDate);
        const reportURL =
          e.reportURL !== undefined
            ? e.reportURL.trim() || undefined
            : (rp.reportURL ?? undefined) || undefined;

        const startChanged = startDate !== rp.startDate;
        const endChanged = endDate !== rp.endDate;
        const urlChanged =
          e.reportURL !== undefined &&
          (e.reportURL.trim() || "") !== (rp.reportURL ?? "").trim();

        if (!startChanged && !endChanged && !urlChanged) return null;

        return { startDate, endDate, reportURL };
      })
      .filter(Boolean) as Array<{
      startDate: string;
      endDate: string;
      reportURL?: string;
    }>;

    if (!payloadPeriods.length) {
      toast.message("Nothing to save.");
      return;
    }

    setSaving(true);
    try {
      await updateReportingPeriods(company.wikidataId, {
        reportingPeriods: payloadPeriods,
        metadata:
          meta?.source?.trim() || meta?.comment?.trim()
            ? { source: meta.source?.trim() || undefined, comment: meta.comment?.trim() || undefined }
            : undefined,
      });
      toast.success(t("editor.tagOptions.updated"));
      setEdited({});
      onSaved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-lg bg-gray-05 p-4 w-full min-w-0 max-w-full">
      <div className="border-b border-gray-03/60 pb-6 mb-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
          <div className="min-w-0 max-w-2xl">
            <h2 className="text-lg font-semibold text-gray-01 tracking-tight">
              {t("editor.singleCompanyView.tabs.reportingPeriods")}
            </h2>
            <p className="text-xs text-gray-02 mt-2 leading-relaxed">
              {t("editor.singleCompanyView.reportingPeriodsDataHint")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3 shrink-0 lg:pt-0.5">
            <AddReportingPeriodFlow company={company} onSaved={onSaved} />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setSortOrder((o) => (o === "desc" ? "asc" : "desc"))}
              className="min-w-0 max-w-none px-3 text-xs h-8"
            >
              {sortOrder === "desc" ? "Newest → Oldest" : "Oldest → Newest"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={resetAll}
              disabled={Object.keys(edited).length === 0}
              className="min-w-0 max-w-none px-3 text-xs h-8"
              title="Reset all changes"
            >
              <Undo2 className="w-3.5 h-3.5 mr-1.5" />
              Reset all
            </Button>
            <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-01">
              <input
                type="checkbox"
                checked={showAllYears}
                onChange={(e) => setShowAllYears(e.target.checked)}
                className="rounded border-gray-03"
              />
              Show all years
            </label>
            {years.length > 0 && (
              <MultiSelectDropdown
                options={years}
                selectedIds={showAllYears ? [] : selectedYears}
                onChange={(ids) => {
                  setSelectedYears(ids);
                  if (ids.length > 0) setShowAllYears(false);
                }}
                triggerLabel="Years"
                emptyLabel="All years"
                triggerClassName="min-w-[130px] !h-8 !text-xs px-3"
              />
            )}
          </div>
        </div>
      </div>

      {visiblePeriods.length ? (
        <div className="space-y-3 w-full min-w-0">
          {visiblePeriods.map((rp) => {
            const rpEdits = edited[rp.id] ?? {};
            const periodYear = getPeriodYear(rp) ?? "—";
            const startVal = rpEdits.startDate ?? formatDateStamp(rp.startDate);
            const endVal = rpEdits.endDate ?? formatDateStamp(rp.endDate);
            const urlVal = rpEdits.reportURL ?? (rp.reportURL ?? "");
            const startDirty = rpEdits.startDate != null;
            const endDirty = rpEdits.endDate != null;
            const urlDirty = rpEdits.reportURL != null;
            const anyDirty = startDirty || endDirty || urlDirty;

            return (
              <div
                key={rp.id}
                className="rounded-lg bg-gray-04 p-3 w-full min-w-0 max-w-full"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 min-w-0">
                  <div>
                    <div className="text-sm font-semibold text-gray-01">{periodYear}</div>
                    <div className="text-xs text-gray-02 mt-0.5">
                      {formatDateStamp(rp.startDate)} – {formatDateStamp(rp.endDate)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => resetPeriod(rp.id)}
                      disabled={!anyDirty}
                      className="min-w-0 max-w-none px-3 text-xs h-8"
                    >
                      <Undo2 className="w-3.5 h-3.5 mr-1.5" />
                      Reset
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteModalOpen(true)}
                      className="h-8 w-8 shrink-0 text-pink-03 hover:text-pink-02 hover:bg-pink-05/20 rounded-full"
                      aria-label={t("editor.singleCompanyView.deleteReportingPeriod.trashAriaLabel")}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 w-full min-w-0">
                  <div>
                    <label className="block text-xs font-medium text-gray-01 mb-1">
                      {t("editor.singleCompanyView.reportingPeriodStart")}
                    </label>
                    <input
                      type="date"
                      value={startVal === "—" ? "" : startVal}
                      onChange={(e) => setPatch(rp.id, { startDate: e.target.value })}
                      className={
                        inputClassName +
                        " bg-gray-04 w-full min-w-0 !max-w-none " +
                        (startDirty ? " border-orange-03" : "")
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-01 mb-1">
                      {t("editor.singleCompanyView.reportingPeriodEnd")}
                    </label>
                    <input
                      type="date"
                      value={endVal === "—" ? "" : endVal}
                      onChange={(e) => setPatch(rp.id, { endDate: e.target.value })}
                      className={
                        inputClassName +
                        " bg-gray-04 w-full min-w-0 !max-w-none " +
                        (endDirty ? " border-orange-03" : "")
                      }
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-01 mb-1">
                      {t("editor.companies.reportUrl")}
                    </label>
                    <input
                      type="url"
                      value={urlVal}
                      onChange={(e) =>
                        setUrl(rp.id, e.target.value, Boolean((rp.reportURL ?? "").trim()))
                      }
                      className={
                        inputClassName +
                        " bg-gray-04 w-full min-w-0 !max-w-none " +
                        (urlDirty ? " border-orange-03" : "")
                      }
                      placeholder={t("editor.fieldEdit.sourcePlaceholder")}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-gray-02 mt-3">
          {t("editor.singleCompanyView.noReportingPeriods")}
        </p>
      )}

      <div className="mt-4 flex justify-end">
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={() => setSaveDialogOpen(true)}
          disabled={saving}
        >
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {t("editor.fieldEdit.save")}
        </Button>
      </div>

      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-gray-01">
              {t("editor.singleCompanyView.deleteReportingPeriod.title")}
            </DialogTitle>
            <DialogDescription>
              {t("editor.singleCompanyView.deleteReportingPeriod.comingSoon")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="primary" size="sm" onClick={() => setDeleteModalOpen(false)}>
              {t("editor.singleCompanyView.deleteReportingPeriod.ok")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReviewerMetadataDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        saving={saving}
        title="Reviewer details"
        confirmLabel={t("editor.fieldEdit.save")}
        initialComment={comment}
        initialSource={source}
        onConfirm={(m) => {
          setComment(m.comment);
          setSource(m.source);
          return handleSave(m);
        }}
      />
    </section>
  );
}
