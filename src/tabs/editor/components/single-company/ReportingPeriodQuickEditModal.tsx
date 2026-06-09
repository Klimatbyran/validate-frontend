import { useEffect, useMemo, useState } from "react";
import { Undo2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import { inputClassName } from "../../lib/company-edit-utils";
import { getCompany, updateReportingPeriods } from "../../lib/companies-api";
import type {
  GarboCompanyDetail,
  GarboCompanyListItem,
  GarboReportingPeriodSummary,
} from "../../lib/types";
import {
  assignNullableStringKey,
  formatDateStamp,
  getPeriodYear,
  toNumberOrNull,
} from "../../lib/reporting-period-ui";
import {
  buildReportingPeriodQuickEditPatch,
  hasAnyQuickEditEdits,
  type ReportingPeriodQuickEditEdited,
} from "../../lib/reporting-period-quick-edit";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import { ReviewerMetaFooter } from "./quick-edit/ReviewerMetaFooter";
import { ReportUrlSection } from "./quick-edit/ReportUrlSection";
import { EconomySection } from "./quick-edit/EconomySection";
import { EmissionsSection } from "./quick-edit/EmissionsSection";

function normDateKey(iso: string) {
  return iso.slice(0, 10);
}

export function ReportingPeriodQuickEditModal({
  open,
  onOpenChange,
  company,
  year,
  periodMatch,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: GarboCompanyListItem;
  year: string;
  /** When set (e.g. after creating a period), find this exact period instead of the first with the same calendar year. */
  periodMatch?: { startDate: string; endDate: string };
  onSaved?: () => void;
}) {
  const { t } = useI18n();
  const dash = t("common.placeholderDash");
  const [detailCompany, setDetailCompany] = useState<GarboCompanyDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoadingDetail(true);
    getCompany(company.id, controller.signal)
      .then((c) => setDetailCompany(c))
      .catch(() => setDetailCompany(null))
      .finally(() => setLoadingDetail(false));
    return () => controller.abort();
  }, [open, company.id]);

  const period: GarboReportingPeriodSummary | null = useMemo(() => {
    const periods = detailCompany?.reportingPeriods ?? company.reportingPeriods ?? [];
    if (periodMatch) {
      const a = normDateKey(periodMatch.startDate);
      const b = normDateKey(periodMatch.endDate);
      const byDates = periods.find(
        (p) => normDateKey(p.startDate) === a && normDateKey(p.endDate) === b
      );
      if (byDates) return byDates;
    }
    const match = periods.find((p) => getPeriodYear(p) === year);
    return match ?? null;
  }, [company.reportingPeriods, detailCompany?.reportingPeriods, year, periodMatch]);

  const [edited, setEdited] = useState<ReportingPeriodQuickEditEdited>({});
  const [comment, setComment] = useState("");
  const [source, setSource] = useState("");
  const [saving, setSaving] = useState(false);
  const [showAllScope3Categories, setShowAllScope3Categories] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDetailCompany(null);
    setLoadingDetail(false);
    setEdited({});
    setComment("");
    setSource("");
    setSaving(false);
    setShowAllScope3Categories(false);
  }, [open, company.id, year, periodMatch?.startDate, periodMatch?.endDate]);

  const setNullableEdit = (
    key: keyof ReportingPeriodQuickEditEdited,
    value: string,
    hadOriginalValue: boolean
  ) => {
    setEdited((prev) =>
      assignNullableStringKey(
        { ...prev },
        String(key),
        value,
        hadOriginalValue
      ) as ReportingPeriodQuickEditEdited
    );
  };

  const resetAll = () => setEdited({});

  if (!period) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{t("editor.reportingPeriodQuickEdit.notFoundTitle", { year })}</DialogTitle>
            <DialogDescription>
              {loadingDetail
                ? t("editor.periodEditor.loadingEllipsis")
                : t("editor.reportingPeriodQuickEdit.notFoundDescription")}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  const scope3Categories = period.emissions?.scope3?.categories ?? [];
  const scope3CategoryTotalsForPatch = scope3Categories.map((c) => ({
    category: c.category,
    total: c.total ?? null,
  }));

  const handleSave = async () => {
    if (!hasAnyQuickEditEdits(edited) && !comment.trim() && !source.trim()) {
      onOpenChange(false);
      return;
    }

    setSaving(true);
    try {
      await updateReportingPeriods(
        company.id,
        buildReportingPeriodQuickEditPatch({
          period,
          edited,
          comment,
          source,
          originalScope3Categories: scope3CategoryTotalsForPatch,
          toNumberOrNull,
        })
      );
      toast.success(t("editor.reportingPeriodQuickEdit.updatedToast"));
      onSaved?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden p-4 sm:p-6">
        <div className="flex flex-col max-h-[80vh]">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-gray-01">
              {company.name} · {year}
            </DialogTitle>
            <DialogDescription>
              {t("editor.reportingPeriodQuickEdit.description")}
            </DialogDescription>
          </DialogHeader>

          <div className="shrink-0 mt-3 flex items-center justify-between gap-3">
            <div className="text-xs text-gray-02">
              {t("editor.reportingPeriodQuickEdit.periodLabel")}{" "}
              {formatDateStamp(period.startDate, dash)}{" "}
              {t("editor.reportingPeriodQuickEdit.periodRangeSeparator")}{" "}
              {formatDateStamp(period.endDate, dash)}
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={resetAll}
              disabled={!hasAnyQuickEditEdits(edited)}
              className="min-w-0 px-3"
            >
              <Undo2 className="w-4 h-4 mr-2" />
              {t("editor.periodEditor.reset")}
            </Button>
          </div>

          <ReportUrlSection
            period={period}
            edited={edited}
            setEdited={setEdited}
            setNullableEdit={setNullableEdit}
          />

          <div className="mt-4 flex-1 min-h-0 overflow-y-auto px-1 space-y-6">
            <EconomySection
              period={period}
              edited={edited}
              setEdited={setEdited}
              setNullableEdit={setNullableEdit}
            />

            <EmissionsSection
              period={period}
              edited={edited}
              setEdited={setEdited}
              setNullableEdit={setNullableEdit}
              showAllScope3Categories={showAllScope3Categories}
              setShowAllScope3Categories={setShowAllScope3Categories}
            />
          </div>

          <ReviewerMetaFooter
            commentLabel={t("editor.reviewerDialog.comment")}
            sourceLabel={t("editor.reviewerDialog.source")}
            optionalLabel={t("editor.reviewerDialog.optional")}
            comment={comment}
            onCommentChange={setComment}
            source={source}
            onSourceChange={setSource}
            sourcePlaceholder={t("editor.reviewerDialog.sourcePlaceholder")}
            inputClassName={inputClassName}
            onSave={handleSave}
            saving={saving}
            savingLabel={t("editor.periodEditor.saving")}
            saveLabel={t("editor.reportingPeriodQuickEdit.save")}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

