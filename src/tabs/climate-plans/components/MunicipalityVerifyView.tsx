import { useMemo, useState } from "react";
import { Check, X, MessageSquarePlus, Save, Target } from "lucide-react";
import type { MeasureType, MunicipalityClimatePlan } from "../lib/types";
import { useI18n } from "@/contexts/I18nContext";
import { cn } from "@/lib/utils";
import { MultiProgressBar } from "@/ui/multi-progress-bar";
import { CollapsibleSection } from "@/ui/collapsible-section";
import { useMunicipalityVerificationDraft } from "../hooks/useVerificationState";
import type { VerificationRecord, VerificationStatus } from "../lib/verification-types";
import { Button } from "@/ui/button";
import { SingleSelectDropdown } from "@/ui/single-select-dropdown";

interface MunicipalityVerifyViewProps {
  municipality: MunicipalityClimatePlan;
}

type VerifiableItem =
  | {
      id: "plan_period";
      kind: "plan_period";
      title: string;
      quote?: string;
      meta?: string;
      currentPlanPeriodStart?: string;
      currentPlanPeriodEnd?: string;
      classificationReasoning?: string;
      classificationNote?: string;
    }
  | {
      id: "primary_target";
      kind: "primary_target";
      title: string;
      quote?: string;
      meta?: string;
      classificationReasoning?: string;
      classificationNote?: string;
    }
  | {
      id: `measure:${number}` | `own_commitment:${number}`;
      kind: "measure" | "own_commitment";
      title: string;
      quote?: string;
      meta?: string;
      measureType?: MeasureType;
      classificationReasoning?: string;
      classificationNote?: string;
      currentClimateRelevance?: string;
      currentSector?: string;
      currentInstrumentType?: string;
      currentActivityShiftType?: string;
    };

function toVerifiableItems(
  m: MunicipalityClimatePlan,
  locale: "en" | "sv",
): VerifiableItem[] {
  const items: VerifiableItem[] = [];
  const et = m.emissionTargets;
  const measures = m.measures ?? et?.measures ?? [];

  const ts = m.planScope?.temporal_scope;
  if (ts?.plan_period_start && ts.plan_period_end) {
    const title = `${ts.plan_period_start}–${ts.plan_period_end}`;
    const quote =
      (ts.source_quotes ?? []).filter(Boolean).join("\n\n").trim() || undefined;
    items.push({
      id: "plan_period",
      kind: "plan_period",
      title,
      quote,
      meta: undefined,
      currentPlanPeriodStart: ts.plan_period_start,
      currentPlanPeriodEnd: ts.plan_period_end,
    });
  }

  if (et?.primary_target?.exists) {
    const pt = et.primary_target;
    const titleParts: string[] = [];
    if (pt.reduction_percentage) titleParts.push(`${pt.reduction_percentage}% reduction`);
    if (pt.target_year) titleParts.push(`by ${pt.target_year}`);
    const title = titleParts.length > 0 ? titleParts.join(" ") : "Primary target";
    const meta = pt.scope ? `Scope: ${pt.scope.replace(/_/g, " ")}` : undefined;
    items.push({
      id: "primary_target",
      kind: "primary_target",
      title,
      quote: pt.source_quote || undefined,
      meta,
    });
  }

  if (measures.length > 0) {
    measures.forEach((m, idx) => {
      const metaParts: string[] = [];
      if (m.climate_relevance) metaParts.push(m.climate_relevance);
      if (m.sector) metaParts.push(m.sector.replace(/_/g, " "));
      if (m.instrument_type) metaParts.push(m.instrument_type.replace(/_/g, " "));
      const swedishText = m.measure_text;
      const englishText = (m.measure_text_english ?? "").trim();
      const title =
        locale === "en" ? (englishText ? englishText : swedishText) : swedishText;
      // "Exact quote": when showing English as main text, keep the Swedish as the expandable quote.
      const quote =
        locale === "en" && englishText && swedishText ? swedishText : undefined;
      items.push({
        id: `measure:${idx}`,
        kind: "measure",
        title,
        quote,
        meta: metaParts.length > 0 ? metaParts.join(" · ") : undefined,
        measureType: m.measure_type,
        classificationReasoning: (m.measure_type_reasoning ?? "").trim() || undefined,
        classificationNote: (m.classification_note ?? "").trim() || undefined,
        currentClimateRelevance: m.climate_relevance,
        currentSector: m.sector,
        currentInstrumentType: m.instrument_type,
        currentActivityShiftType: m.activity_shift_type,
      });
    });
  } else {
    (et?.own_commitments ?? []).forEach((c, idx) => {
      const metaParts: string[] = [];
      if (c.goal_type) metaParts.push(c.goal_type.replace(/_/g, " "));
      if (c.target_year) metaParts.push(`target ${c.target_year}`);
      if (c.baseline_year) metaParts.push(`baseline ${c.baseline_year}`);
      if (c.reduction_percentage) metaParts.push(`${c.reduction_percentage}%`);
      items.push({
        id: `own_commitment:${idx}`,
        kind: "own_commitment",
        title: c.goal_description,
        quote: c.source_quote || undefined,
        meta: metaParts.length > 0 ? metaParts.join(" · ") : undefined,
      });
    });
  }

  return items;
}

function statusButtonClasses(active: boolean, kind: "correct" | "incorrect") {
  if (kind === "correct") {
    return active
      ? "bg-green-03/25 text-green-03 border-green-03/60"
      : "bg-gray-03/30 text-gray-02 border-gray-03 hover:bg-green-03/15 hover:text-green-03";
  }
  return active
    ? "bg-pink-03/20 text-pink-03 border-pink-03/60"
    : "bg-gray-03/30 text-gray-02 border-gray-03 hover:bg-pink-03/10 hover:text-pink-03";
}

function toggleStatus(prev: VerificationStatus, next: VerificationStatus) {
  return prev === next ? "unreviewed" : next;
}

function uniqueNonEmpty(values: Array<string | null | undefined>) {
  const set = new Set<string>();
  for (const v of values) {
    const s = (v ?? "").trim();
    if (s) set.add(s);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

function StatementCard({
  item,
  record,
  onChange,
  correctionOptions,
}: {
  item: VerifiableItem;
  record: VerificationRecord;
  onChange: (r: VerificationRecord) => void;
  correctionOptions: {
    measureTypes: MeasureType[];
    outcomeTypes: Array<"overall" | "sectorial">;
    activityShiftTypeOptions: string[];
    climateRelevanceOptions: string[];
    sectorOptions: string[];
    instrumentTypeOptions: string[];
  };
}) {
  const { t } = useI18n();
  const [showComment, setShowComment] = useState(false);
  const [showQuote, setShowQuote] = useState(false);
  const [showClassification, setShowClassification] = useState(false);

  const hasClassification =
    Boolean(item.classificationReasoning) || Boolean(item.classificationNote);

  return (
    <div
      className={cn(
        "rounded-lg border p-4 transition-colors",
        record.status === "correct"
          ? "border-green-03/40 bg-green-03/5"
          : record.status === "incorrect"
            ? "border-pink-03/40 bg-pink-03/5"
            : "border-gray-03/40 bg-gray-03/10",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-medium text-gray-01 break-words">
            {item.title}
          </div>
          {item.meta && <div className="text-xs text-gray-02 mt-1">{item.meta}</div>}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() =>
              onChange({ ...record, status: toggleStatus(record.status, "correct") })
            }
            className={cn(
              "inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors",
              statusButtonClasses(record.status === "correct", "correct"),
            )}
          >
            <Check size={14} />
            {t("common.correct")}
          </button>
          <button
            onClick={() => {
              const nextStatus = toggleStatus(record.status, "incorrect");
              if (nextStatus !== "incorrect") {
                onChange({ ...record, status: nextStatus });
                return;
              }

              onChange({
                ...record,
                status: nextStatus,
                // Prepopulate corrections from current extraction when entering incorrect state.
                correctedMeasureType:
                  record.correctedMeasureType ??
                  (item.kind === "measure" ? item.measureType : undefined),
                correctedActivityShiftType:
                  record.correctedActivityShiftType ??
                  (item.kind === "measure" ? item.currentActivityShiftType : undefined),
                correctedClimateRelevance:
                  record.correctedClimateRelevance ??
                  (item.kind === "measure" ? item.currentClimateRelevance : undefined),
                correctedSector:
                  record.correctedSector ??
                  (item.kind === "measure" ? item.currentSector : undefined),
                correctedInstrumentType:
                  record.correctedInstrumentType ??
                  (item.kind === "measure" ? item.currentInstrumentType : undefined),
                correctedPlanPeriodStart:
                  record.correctedPlanPeriodStart ??
                  (item.kind === "plan_period"
                    ? item.currentPlanPeriodStart
                    : undefined),
                correctedPlanPeriodEnd:
                  record.correctedPlanPeriodEnd ??
                  (item.kind === "plan_period"
                    ? item.currentPlanPeriodEnd
                    : undefined),
              });
            }}
            className={cn(
              "inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors",
              statusButtonClasses(record.status === "incorrect", "incorrect"),
            )}
          >
            <X size={14} />
            {t("common.incorrect")}
          </button>

          <button
            onClick={() => setShowComment((s) => !s)}
            className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-gray-03 bg-gray-03/30 text-gray-02 hover:bg-gray-03/50 transition-colors"
            title={t("common.addNote")}
          >
            <MessageSquarePlus size={16} />
          </button>
        </div>
      </div>

      {record.status === "incorrect" &&
        (item.kind === "measure" || item.kind === "own_commitment") && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-02">{t("climate.verify.correctTo")}</span>
          <SingleSelectDropdown
            options={correctionOptions.measureTypes}
            value={(record.correctedMeasureType ?? "") as string}
            onChange={(v) =>
              onChange({
                ...record,
                correctedMeasureType: v,
                // Clear subtype fields when switching corrected type
                correctedOutcomeType: v === "outcome" ? record.correctedOutcomeType : undefined,
                correctedActivityShiftType:
                  v === "activity_shift" ? record.correctedActivityShiftType : undefined,
              })
            }
            placeholder={t("climate.verify.fields.measureType")}
            ariaLabel={t("climate.verify.fields.measureType")}
            getOptionLabel={(v) => t(`climate.verify.measureTypes.${v}`)}
            triggerClassName="h-9"
            panelMinWidth={240}
          />

          {/* Lovable behavior: outcome gets subtype, activity_shift gets subtype, intervention gets none */}
          {record.correctedMeasureType === "outcome" && (
            <SingleSelectDropdown
              options={correctionOptions.outcomeTypes}
              value={(record.correctedOutcomeType ?? "") as string}
              onChange={(v) =>
                onChange({
                  ...record,
                  correctedOutcomeType: v as "overall" | "sectorial",
                })
              }
              placeholder={t("climate.verify.fields.outcomeType")}
              ariaLabel={t("climate.verify.fields.outcomeType")}
              getOptionLabel={(v) => t(`climate.verify.outcomeTypes.${v}`)}
              triggerClassName="h-9"
              panelMinWidth={200}
            />
          )}
          {record.correctedMeasureType === "activity_shift" &&
            correctionOptions.activityShiftTypeOptions.length > 0 && (
              <SingleSelectDropdown
                options={["", ...correctionOptions.activityShiftTypeOptions]}
                value={(record.correctedActivityShiftType ?? "") as string}
                onChange={(v) =>
                  onChange({
                    ...record,
                    correctedActivityShiftType: v ? v : undefined,
                  })
                }
                placeholder={t("climate.verify.fields.activityShiftType")}
                ariaLabel={t("climate.verify.fields.activityShiftType")}
                getOptionLabel={(v) => (v ? v.replace(/_/g, " ") : "—")}
                triggerClassName="h-9"
                panelMinWidth={240}
              />
            )}
        </div>
      )}

      {record.status === "incorrect" && item.kind === "plan_period" && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-02">{t("climate.verify.correctTo")}</span>
          <input
            type="text"
            value={record.correctedPlanPeriodStart ?? ""}
            onChange={(e) =>
              onChange({
                ...record,
                correctedPlanPeriodStart: e.target.value.trim() ? e.target.value : undefined,
              })
            }
            placeholder={t("climate.verify.fields.planPeriodStart")}
            className="h-9 w-[140px] bg-gray-05 border border-gray-03 rounded-lg px-3 text-sm text-gray-01 placeholder:text-gray-02 focus:outline-none focus:ring-1 focus:ring-gray-02"
            inputMode="numeric"
          />
          <span className="text-xs text-gray-02">–</span>
          <input
            type="text"
            value={record.correctedPlanPeriodEnd ?? ""}
            onChange={(e) =>
              onChange({
                ...record,
                correctedPlanPeriodEnd: e.target.value.trim() ? e.target.value : undefined,
              })
            }
            placeholder={t("climate.verify.fields.planPeriodEnd")}
            className="h-9 w-[140px] bg-gray-05 border border-gray-03 rounded-lg px-3 text-sm text-gray-01 placeholder:text-gray-02 focus:outline-none focus:ring-1 focus:ring-gray-02"
            inputMode="numeric"
          />
          <button
            type="button"
            onClick={() =>
              onChange({
                ...record,
                correctedPlanPeriodStart: undefined,
                correctedPlanPeriodEnd: undefined,
              })
            }
            className="h-9 px-3 rounded-lg border border-gray-03 bg-gray-03/30 text-xs text-gray-02 hover:bg-gray-03/50 transition-colors"
          >
            —
          </button>
          <span className="text-xs text-gray-02">{t("common.optional")}</span>
        </div>
      )}

      {record.status === "incorrect" &&
        (item.kind === "measure" || item.kind === "own_commitment") && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-02">{t("common.optional")}</span>
            {correctionOptions.climateRelevanceOptions.length > 0 && (
              <SingleSelectDropdown
                options={["", ...correctionOptions.climateRelevanceOptions]}
                value={(record.correctedClimateRelevance ?? "") as string}
                onChange={(v) =>
                  onChange({
                    ...record,
                    correctedClimateRelevance: v ? v : undefined,
                  })
                }
                placeholder={t("climate.verify.fields.climateRelevance")}
                ariaLabel={t("climate.verify.fields.climateRelevance")}
                triggerClassName="h-9"
                panelMinWidth={240}
                getOptionLabel={(v) => (v ? v : "—")}
              />
            )}
            {correctionOptions.sectorOptions.length > 0 && (
              <SingleSelectDropdown
                options={["", ...correctionOptions.sectorOptions]}
                value={(record.correctedSector ?? "") as string}
                onChange={(v) =>
                  onChange({
                    ...record,
                    correctedSector: v ? v : undefined,
                  })
                }
                placeholder={t("climate.verify.fields.sector")}
                ariaLabel={t("climate.verify.fields.sector")}
                triggerClassName="h-9"
                panelMinWidth={240}
                getOptionLabel={(v) => (v ? v.replace(/_/g, " ") : "—")}
              />
            )}
            {correctionOptions.instrumentTypeOptions.length > 0 && (
              <SingleSelectDropdown
                options={["", ...correctionOptions.instrumentTypeOptions]}
                value={(record.correctedInstrumentType ?? "") as string}
                onChange={(v) =>
                  onChange({
                    ...record,
                    correctedInstrumentType: v ? v : undefined,
                  })
                }
                placeholder={t("climate.verify.fields.instrumentType")}
                ariaLabel={t("climate.verify.fields.instrumentType")}
                triggerClassName="h-9"
                panelMinWidth={260}
                getOptionLabel={(v) => (v ? v.replace(/_/g, " ") : "—")}
              />
            )}
          </div>
        )}

      {showComment && (
        <div className="mt-3">
          <input
            type="text"
            value={record.comment ?? ""}
            onChange={(e) => onChange({ ...record, comment: e.target.value })}
            placeholder={t("common.addNotePlaceholder")}
            className="w-full bg-gray-05 border border-gray-03 rounded-lg px-3 py-2 text-sm text-gray-01 placeholder:text-gray-02 focus:outline-none focus:ring-1 focus:ring-gray-02"
          />
        </div>
      )}

      {item.quote && (
        <div className="mt-3">
          <button
            onClick={() => setShowQuote((s) => !s)}
            className="text-xs text-gray-02 hover:text-gray-01 transition-colors underline decoration-dotted"
          >
            {showQuote ? t("common.hideQuote") : t("common.showQuote")}
          </button>
          {showQuote && (
            <blockquote className="mt-2 border-l-2 border-gray-03 pl-3 py-1 text-xs text-gray-02 italic">
              {item.quote}
            </blockquote>
          )}
        </div>
      )}

      {hasClassification && (
        <div className="mt-2">
          <button
            onClick={() => setShowClassification((s) => !s)}
            className="text-xs text-gray-02 hover:text-gray-01 transition-colors underline decoration-dotted"
          >
            {showClassification
              ? t("climate.verify.hideClassification")
              : t("climate.verify.showClassification")}
          </button>
          {showClassification && (
            <div className="mt-2 space-y-2">
              {item.classificationReasoning && (
                <div className="text-xs text-gray-02">
                  <span className="font-medium text-gray-01">
                    {t("climate.verify.measureTypeReasoning")}
                  </span>
                  <div className="mt-1">{item.classificationReasoning}</div>
                </div>
              )}
              {item.classificationNote && (
                <div className="text-xs text-gray-02">
                  <span className="font-medium text-gray-01">
                    {t("climate.verify.classificationNote")}
                  </span>
                  <div className="mt-1">{item.classificationNote}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function MunicipalityVerifyView({ municipality }: MunicipalityVerifyViewProps) {
  const { t, locale } = useI18n();
  const [hideReviewed, setHideReviewed] = useState(false);

  const items = useMemo(() => toVerifiableItems(municipality, locale), [municipality, locale]);
  const draft = useMunicipalityVerificationDraft(municipality);
  const correctionOptions = useMemo(() => {
    const measures = municipality.measures ?? municipality.emissionTargets?.measures ?? [];
    const commitments = municipality.emissionTargets?.own_commitments ?? [];
    return {
      measureTypes: ["outcome", "activity_shift", "intervention"] as MeasureType[],
      outcomeTypes: ["overall", "sectorial"] as Array<"overall" | "sectorial">,
      activityShiftTypeOptions: uniqueNonEmpty(
        measures
          .map((m) => m.activity_shift_type)
          .filter((v) => v && v !== "not_applicable"),
      ),
      climateRelevanceOptions: uniqueNonEmpty(measures.map((m) => m.climate_relevance)),
      sectorOptions: uniqueNonEmpty([
        ...measures.map((m) => m.sector),
        ...commitments.map((c) => c.sector),
      ]),
      instrumentTypeOptions: uniqueNonEmpty(measures.map((m) => m.instrument_type)),
    };
  }, [municipality]);

  const remaining = Math.max(0, draft.total - draft.reviewed);

  const visibleItems = hideReviewed
    ? items.filter((it) => draft.getRecord(it.id).status === "unreviewed")
    : items;

  return (
    <div className="space-y-6">
      {/* Progress banner */}
      <div className="bg-gray-04/80 backdrop-blur-sm rounded-lg p-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-gray-01">
              <Target size={18} />
              <div className="text-lg font-medium">
                {t("climate.verify.queueTitle")}
              </div>
            </div>
            <div className="text-sm text-gray-02 mt-1">
              {t("climate.verify.queueSubtitle")}
            </div>
          </div>

          <div className="text-right">
            <div className="text-3xl font-semibold text-gray-01">
              {draft.reviewed}/{draft.total}
            </div>
            <div className="text-xs text-gray-02 uppercase tracking-wider font-medium">
              {t("climate.verify.totalVerified")}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <MultiProgressBar
            total={draft.total}
            segments={[
              {
                value: draft.correct,
                color: "bg-green-03",
                label: "correct",
                title: `${draft.correct} correct`,
              },
              {
                value: draft.incorrect,
                color: "bg-pink-03",
                label: "incorrect",
                title: `${draft.incorrect} incorrect`,
              },
              {
                value: remaining,
                color: "bg-gray-02",
                label: "remaining",
                title: `${remaining} remaining`,
              },
            ]}
            height="md"
            className="bg-gray-03/30"
          />

          <div className="flex items-center justify-between mt-3">
            <div className="text-xs text-gray-02">
              {t("climate.verify.queueInstruction")}
            </div>
            <label className="flex items-center gap-2 text-xs text-gray-02 select-none cursor-pointer">
              <input
                type="checkbox"
                checked={hideReviewed}
                onChange={(e) => setHideReviewed(e.target.checked)}
                className="w-4 h-4 rounded border-gray-03 accent-green-03"
              />
              {t("common.hideReviewed")}
            </label>
          </div>
        </div>
      </div>

      {/* Save banner */}
      {draft.changedCount > 0 && (
        <div className="sticky top-4 z-10">
          <div className="bg-green-03/10 border border-green-03/30 rounded-lg px-4 py-3 flex items-center justify-between gap-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-green-03">
              <Save size={16} />
              <div className="text-sm font-medium">
                {draft.changedCount}{" "}
                {draft.changedCount === 1
                  ? t("common.unsavedChange")
                  : t("common.unsavedChanges")}
              </div>
            </div>
            <Button variant="primary" size="sm" onClick={draft.save}>
              {t("common.saveChanges")}
            </Button>
          </div>
        </div>
      )}

      {/* Items */}
      <div className="space-y-4">
        <CollapsibleSection
          title={t("climate.detail.planPeriod")}
          icon={<Target />}
          accentIconBg="bg-gray-03/40"
          accentTextColor="text-gray-01"
          defaultOpen
        >
          <div className="space-y-3">
            {visibleItems
              .filter((it) => it.kind === "plan_period")
              .map((it) => (
                <StatementCard
                  key={it.id}
                  item={it}
                  record={draft.getRecord(it.id)}
                  onChange={(r) => draft.setRecord(it.id, r)}
                  correctionOptions={correctionOptions}
                />
              ))}
            {items.filter((it) => it.kind === "plan_period").length === 0 && (
              <div className="text-sm text-gray-02">{t("climate.compare.none")}</div>
            )}
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title={t("climate.detail.primaryTarget")}
          icon={<Target />}
          accentIconBg="bg-green-03/20"
          accentTextColor="text-green-03"
          defaultOpen
        >
          <div className="space-y-3">
            {visibleItems
              .filter((it) => it.kind === "primary_target")
              .map((it) => (
                <StatementCard
                  key={it.id}
                  item={it}
                  record={draft.getRecord(it.id)}
                  onChange={(r) => draft.setRecord(it.id, r)}
                  correctionOptions={correctionOptions}
                />
              ))}
            {items.filter((it) => it.kind === "primary_target").length === 0 && (
              <div className="text-sm text-gray-02">{t("climate.compare.none")}</div>
            )}
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title={`${t("climate.verify.categories.outcomes")} (${items.filter((it) => it.kind === "measure" && it.measureType === "outcome").length})`}
          icon={<Target />}
          accentIconBg="bg-blue-03/20"
          accentTextColor="text-blue-03"
          defaultOpen
        >
          <div className="space-y-3">
            {visibleItems
              .filter((it) => it.kind === "measure" && it.measureType === "outcome")
              .map((it) => (
                <StatementCard
                  key={it.id}
                  item={it}
                  record={draft.getRecord(it.id)}
                  onChange={(r) => draft.setRecord(it.id, r)}
                  correctionOptions={correctionOptions}
                />
              ))}
            {items.filter((it) => it.kind === "measure" && it.measureType === "outcome").length === 0 && (
              <div className="text-sm text-gray-02">{t("climate.compare.none")}</div>
            )}
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title={`${t("climate.verify.categories.activityShifts")} (${items.filter((it) => it.kind === "measure" && it.measureType === "activity_shift").length})`}
          icon={<Target />}
          accentIconBg="bg-green-03/20"
          accentTextColor="text-green-03"
          defaultOpen={false}
        >
          <div className="space-y-3">
            {visibleItems
              .filter((it) => it.kind === "measure" && it.measureType === "activity_shift")
              .map((it) => (
                <StatementCard
                  key={it.id}
                  item={it}
                  record={draft.getRecord(it.id)}
                  onChange={(r) => draft.setRecord(it.id, r)}
                  correctionOptions={correctionOptions}
                />
              ))}
            {items.filter((it) => it.kind === "measure" && it.measureType === "activity_shift").length === 0 && (
              <div className="text-sm text-gray-02">{t("climate.compare.none")}</div>
            )}
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title={`${t("climate.verify.categories.interventions")} (${items.filter((it) => it.kind === "measure" && it.measureType === "intervention").length})`}
          icon={<Target />}
          accentIconBg="bg-pink-03/20"
          accentTextColor="text-pink-03"
          defaultOpen={false}
        >
          <div className="space-y-3">
            {visibleItems
              .filter((it) => it.kind === "measure" && it.measureType === "intervention")
              .map((it) => (
                <StatementCard
                  key={it.id}
                  item={it}
                  record={draft.getRecord(it.id)}
                  onChange={(r) => draft.setRecord(it.id, r)}
                  correctionOptions={correctionOptions}
                />
              ))}
            {items.filter((it) => it.kind === "measure" && it.measureType === "intervention").length === 0 && (
              <div className="text-sm text-gray-02">{t("climate.compare.none")}</div>
            )}
          </div>
        </CollapsibleSection>

        {/* Backward-compatible fallback if measures aren't present yet */}
        {items.some((it) => it.kind === "own_commitment") && (
          <CollapsibleSection
            title={`${t("climate.detail.ownCommitments")} (${items.filter((it) => it.kind === "own_commitment").length})`}
            icon={<Target />}
            accentIconBg="bg-blue-03/20"
            accentTextColor="text-blue-03"
            defaultOpen
          >
            <div className="space-y-3">
              {visibleItems
                .filter((it) => it.kind === "own_commitment")
                .map((it) => (
                  <StatementCard
                    key={it.id}
                    item={it}
                    record={draft.getRecord(it.id)}
                    onChange={(r) => draft.setRecord(it.id, r)}
                    correctionOptions={correctionOptions}
                  />
                ))}
              {items.filter((it) => it.kind === "own_commitment").length === 0 && (
                <div className="text-sm text-gray-02">{t("climate.compare.none")}</div>
              )}
            </div>
          </CollapsibleSection>
        )}
      </div>
    </div>
  );
}

