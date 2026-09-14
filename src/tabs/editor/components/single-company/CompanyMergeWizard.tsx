import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import { Modal } from "@/ui/modal";
import { toast } from "sonner";
import { searchCoverageCompanies } from "@/tabs/overview/lib/coverage-api";
import type { CoverageCompanySearchHit } from "@/tabs/overview/lib/coverage-types";
import {
  applyCompanyMerge,
  previewCompanyMerge,
  type CompanyMergeFieldKey,
  type CompanyMergePreview,
} from "../../lib/companies-api";

type Step = "pick-source" | "review" | "confirm";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  survivorCompanyId: string;
  survivorCompanyName: string;
  onMerged: (survivorCompanyId: string) => void;
};

function formatValue(value: string | number | null): string {
  if (value == null || value === "") return "—";
  return String(value);
}

export function CompanyMergeWizard({
  open,
  onOpenChange,
  survivorCompanyId,
  survivorCompanyName,
  onMerged,
}: Props) {
  const { t } = useI18n();
  const [step, setStep] = useState<Step>("pick-source");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchHits, setSearchHits] = useState<CoverageCompanySearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedSource, setSelectedSource] =
    useState<CoverageCompanySearchHit | null>(null);
  const [preview, setPreview] = useState<CompanyMergePreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [fieldChoices, setFieldChoices] = useState<
    Partial<Record<CompanyMergeFieldKey, "survivor" | "source">>
  >({});
  const [periodResolutions, setPeriodResolutions] = useState<
    Record<string, "keep-survivor" | "keep-source">
  >({});
  const [merging, setMerging] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep("pick-source");
      setSearchQuery("");
      setSearchHits([]);
      setSelectedSource(null);
      setPreview(null);
      setFieldChoices({});
      setPeriodResolutions({});
      setMerging(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchHits([]);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setSearching(true);
      searchCoverageCompanies(q)
        .then((hits) => {
          if (cancelled) return;
          setSearchHits(
            hits.filter((hit) => hit.id !== survivorCompanyId).slice(0, 12),
          );
        })
        .catch(() => {
          if (!cancelled) setSearchHits([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, searchQuery, survivorCompanyId]);

  const differingFields = useMemo(
    () => (preview?.fieldDiffs ?? []).filter((diff) => diff.differs),
    [preview],
  );

  const unresolvedConflicts = useMemo(() => {
    if (!preview) return [];
    return preview.periodYearConflicts.filter(
      (conflict) => !periodResolutions[conflict.conflictId],
    );
  }, [preview, periodResolutions]);

  const canContinueFromReview =
    Boolean(preview) &&
    unresolvedConflicts.length === 0 &&
    (preview?.blockers.length ?? 0) === 0;

  const loadPreview = async (sourceId: string) => {
    setLoadingPreview(true);
    try {
      const next = await previewCompanyMerge({
        survivorCompanyId,
        sourceCompanyIds: [sourceId],
      });
      setPreview(next);
      const defaults: Partial<
        Record<CompanyMergeFieldKey, "survivor" | "source">
      > = {};
      for (const diff of next.fieldDiffs) {
        defaults[diff.field] = diff.defaultChoice;
      }
      setFieldChoices(defaults);
      setPeriodResolutions({});
      setStep("review");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("editor.singleCompanyView.mergeCompany.previewFailed"),
      );
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleMerge = async () => {
    if (!preview || !selectedSource) return;
    setMerging(true);
    try {
      const result = await applyCompanyMerge({
        survivorCompanyId,
        sourceCompanyIds: [selectedSource.id],
        fieldChoices,
        periodYearResolutions: periodResolutions,
      });
      toast.success(t("editor.singleCompanyView.mergeCompany.success"));
      onOpenChange(false);
      onMerged(result.survivorCompanyId);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("editor.singleCompanyView.mergeCompany.failed"),
      );
    } finally {
      setMerging(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="2xl"
      title={t("editor.singleCompanyView.mergeCompany.title")}
      description={t("editor.singleCompanyView.mergeCompany.description", {
        name: survivorCompanyName,
      })}
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={merging}
          >
            {t("editor.singleCompanyView.mergeCompany.cancel")}
          </Button>
          {step === "review" ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={!canContinueFromReview || merging}
              onClick={() => setStep("confirm")}
            >
              {t("editor.singleCompanyView.mergeCompany.continue")}
            </Button>
          ) : null}
          {step === "confirm" ? (
            <>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={merging}
                onClick={() => setStep("review")}
              >
                {t("editor.singleCompanyView.mergeCompany.back")}
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={merging}
                onClick={() => void handleMerge()}
              >
                {merging ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {merging
                  ? t("editor.singleCompanyView.mergeCompany.merging")
                  : t("editor.singleCompanyView.mergeCompany.confirm")}
              </Button>
            </>
          ) : null}
        </>
      }
    >
      <div className="space-y-4 text-sm text-gray-01">
        {step === "pick-source" ? (
          <div className="space-y-3">
            <p className="text-gray-02">
              {t("editor.singleCompanyView.mergeCompany.pickSourceHint")}
            </p>
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t(
                "editor.singleCompanyView.mergeCompany.searchPlaceholder",
              )}
              className="w-full rounded-lg border border-gray-03 bg-gray-05 px-3 py-2 text-sm text-gray-01 placeholder:text-gray-03 focus:outline-none focus:ring-2 focus:ring-blue-03"
            />
            {searching ? (
              <div className="flex items-center gap-2 text-gray-02">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("common.loading")}
              </div>
            ) : null}
            <ul className="max-h-64 space-y-1 overflow-auto">
              {searchHits.map((hit) => (
                <li key={hit.id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-md border border-gray-03/60 px-3 py-2 text-left hover:bg-gray-04/60"
                    disabled={loadingPreview}
                    onClick={() => {
                      setSelectedSource(hit);
                      void loadPreview(hit.id);
                    }}
                  >
                    <span className="font-medium">{hit.name}</span>
                    <span className="text-xs text-gray-02">
                      {hit.wikidataId ?? hit.id.slice(0, 8)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {loadingPreview ? (
              <div className="flex items-center gap-2 text-gray-02">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("editor.singleCompanyView.mergeCompany.loadingPreview")}
              </div>
            ) : null}
          </div>
        ) : null}

        {step === "review" && preview ? (
          <div className="space-y-5">
            <div className="rounded-md border border-gray-03/70 bg-gray-05/40 p-3">
              <p>
                <span className="text-gray-02">
                  {t("editor.singleCompanyView.mergeCompany.survivor")}:
                </span>{" "}
                <span className="font-medium">{preview.survivor.name}</span>
              </p>
              <p>
                <span className="text-gray-02">
                  {t("editor.singleCompanyView.mergeCompany.source")}:
                </span>{" "}
                <span className="font-medium">
                  {preview.sources[0]?.name ?? "—"}
                </span>
              </p>
              <p className="mt-2 text-xs text-gray-02">
                {t("editor.singleCompanyView.mergeCompany.keepBothReportsHint")}
              </p>
            </div>

            {differingFields.length > 0 ? (
              <div className="space-y-2">
                <h4 className="font-medium">
                  {t("editor.singleCompanyView.mergeCompany.fieldPicks")}
                </h4>
                {differingFields.map((diff) => (
                  <div
                    key={diff.field}
                    className="grid gap-2 rounded-md border border-gray-03/60 p-3 md:grid-cols-[8rem_1fr_1fr]"
                  >
                    <div className="text-xs font-medium uppercase tracking-wide text-gray-02">
                      {t(
                        `editor.singleCompanyView.mergeCompany.fields.${diff.field}`,
                      )}
                    </div>
                    <label className="flex cursor-pointer items-start gap-2">
                      <input
                        type="radio"
                        name={`field-${diff.field}`}
                        checked={
                          (fieldChoices[diff.field] ?? "survivor") ===
                          "survivor"
                        }
                        onChange={() =>
                          setFieldChoices((prev) => ({
                            ...prev,
                            [diff.field]: "survivor",
                          }))
                        }
                      />
                      <span>
                        <span className="block text-xs text-gray-02">
                          {t(
                            "editor.singleCompanyView.mergeCompany.keepSurvivor",
                          )}
                        </span>
                        {formatValue(diff.survivorValue)}
                      </span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-2">
                      <input
                        type="radio"
                        name={`field-${diff.field}`}
                        checked={fieldChoices[diff.field] === "source"}
                        onChange={() =>
                          setFieldChoices((prev) => ({
                            ...prev,
                            [diff.field]: "source",
                          }))
                        }
                      />
                      <span>
                        <span className="block text-xs text-gray-02">
                          {t(
                            "editor.singleCompanyView.mergeCompany.keepSource",
                          )}
                        </span>
                        {formatValue(diff.sourceValue)}
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-02">
                {t("editor.singleCompanyView.mergeCompany.noFieldDiffs")}
              </p>
            )}

            {preview.periodYearConflicts.length > 0 ? (
              <div className="space-y-2">
                <h4 className="font-medium">
                  {t("editor.singleCompanyView.mergeCompany.periodConflicts")}
                </h4>
                <p className="text-xs text-gray-02">
                  {t(
                    "editor.singleCompanyView.mergeCompany.periodConflictsHint",
                  )}
                </p>
                {preview.periodYearConflicts.map((conflict) => (
                  <div
                    key={conflict.conflictId}
                    className="space-y-2 rounded-md border border-orange-03/40 bg-orange-03/5 p-3"
                  >
                    <p className="font-medium">
                      {conflict.year} · {conflict.registryReportId.slice(0, 12)}
                      …
                    </p>
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={conflict.conflictId}
                          checked={
                            periodResolutions[conflict.conflictId] ===
                            "keep-survivor"
                          }
                          onChange={() =>
                            setPeriodResolutions((prev) => ({
                              ...prev,
                              [conflict.conflictId]: "keep-survivor",
                            }))
                          }
                        />
                        {t(
                          "editor.singleCompanyView.mergeCompany.keepSurvivorPeriod",
                        )}
                        {conflict.survivorPeriod.hasEmissions
                          ? ` · ${t("editor.singleCompanyView.mergeCompany.hasEmissions")}`
                          : ""}
                        {conflict.survivorPeriod.hasEconomy
                          ? ` · ${t("editor.singleCompanyView.mergeCompany.hasEconomy")}`
                          : ""}
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={conflict.conflictId}
                          checked={
                            periodResolutions[conflict.conflictId] ===
                            "keep-source"
                          }
                          onChange={() =>
                            setPeriodResolutions((prev) => ({
                              ...prev,
                              [conflict.conflictId]: "keep-source",
                            }))
                          }
                        />
                        {t(
                          "editor.singleCompanyView.mergeCompany.keepSourcePeriod",
                        )}
                        {conflict.sourcePeriod.hasEmissions
                          ? ` · ${t("editor.singleCompanyView.mergeCompany.hasEmissions")}`
                          : ""}
                        {conflict.sourcePeriod.hasEconomy
                          ? ` · ${t("editor.singleCompanyView.mergeCompany.hasEconomy")}`
                          : ""}
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="rounded-md border border-gray-03/60 p-3 text-xs text-gray-02">
              <p>
                {t("editor.singleCompanyView.mergeCompany.movableReports", {
                  count: preview.movableReports.length,
                })}
              </p>
              <p>
                {t("editor.singleCompanyView.mergeCompany.resultingTags", {
                  tags: preview.resultingTags.join(", ") || "—",
                })}
              </p>
            </div>
          </div>
        ) : null}

        {step === "confirm" && preview ? (
          <div className="space-y-3">
            <p>
              {t("editor.singleCompanyView.mergeCompany.confirmBody", {
                source: preview.sources[0]?.name ?? "",
                survivor: preview.survivor.name,
              })}
            </p>
            <p className="text-orange-03">
              {t("editor.singleCompanyView.mergeCompany.confirmWarning")}
            </p>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
