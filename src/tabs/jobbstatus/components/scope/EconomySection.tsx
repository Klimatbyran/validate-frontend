import React from "react";
import { motion } from "framer-motion";
import { Banknote, Users, CheckCircle2 } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { useCompanyReferenceByYears } from "../../lib/company-reference-api";
import { JsonRawDataBlock } from "./JsonRawDataBlock";
import { YearBadge } from "./YearBadge";
import { DataCard } from "./DataCard";
import { CollapsibleSection } from "@/ui/collapsible-section";

interface EconomyEntry {
  year: number;
  economy: {
    turnover?: {
      value: number | null;
      currency: string | null;
    } | null;
    employees?: {
      value: number | null;
      unit: string | null;
    } | null;
  } | null;
}

interface EconomyDisplayData {
  economy: EconomyEntry[];
}

interface EconomySectionProps {
  data: EconomyDisplayData;
  wikidataId?: string;
}

export type EconomyReferenceSnapshot = {
  turnover?: { value: number | null; currency: string | null } | null;
  employees?: { value: number | null; unit: string | null } | null;
} | null;

function formatCurrency(
  formatNumber: (v: number | null | undefined) => string,
  value: number | null | undefined,
  currency: string | null | undefined
): string {
  if (value == null) return "—";
  const formatted = formatNumber(value);
  return currency ? `${formatted} ${currency}` : formatted;
}

function buildReferenceSnapshotFromPeriod(
  period: any
): EconomyReferenceSnapshot {
  if (!period?.economy) return null;
  const eco = period.economy;
  return {
    turnover: eco.turnover
      ? { value: eco.turnover.value ?? null, currency: eco.turnover.currency ?? null }
      : null,
    employees: eco.employees
      ? {
          value: eco.employees.value ?? null,
          unit: eco.employees.unit ?? null,
        }
      : null,
  };
}

const REF_PANEL_CLASS =
  "bg-gray-04/80 border border-gray-03 rounded-xl p-4 mb-4 border-l-4 border-l-green-03";

interface EconomyReferencePanelProps {
  wikidataId: string | undefined;
  latestYear: EconomyEntry | undefined;
  referenceByYear: Record<number, EconomyReferenceSnapshot>;
  isLoading: boolean;
  error: string | null;
}

function EconomyReferencePanel({
  wikidataId,
  latestYear,
  referenceByYear,
  isLoading,
  error,
}: EconomyReferencePanelProps) {
  const { t, formatNumber } = useI18n();
  if (!wikidataId) return null;
  const latest = latestYear?.year;
  if (!latest) return null;
  const snapshot = referenceByYear[latest];
    if (!snapshot)
    return (
      <div className={REF_PANEL_CLASS}>
        {isLoading && <div className="text-sm text-gray-02">{t("scope.fetching")}</div>}
        {!isLoading && error && (
          <div className="text-sm text-gray-02">{error}</div>
        )}
      </div>
    );

  const ourEconomy = latestYear.economy;
  const ourTurnover = ourEconomy?.turnover?.value ?? null;
  const ourEmployees = ourEconomy?.employees?.value ?? null;
  const prodTurnover = snapshot.turnover?.value ?? null;
  const prodEmployees = snapshot.employees?.value ?? null;
  const turnoverMatch =
    ourTurnover != null && prodTurnover != null ? ourTurnover === prodTurnover : null;
  const employeesMatch =
    ourEmployees != null && prodEmployees != null
      ? ourEmployees === prodEmployees
      : null;

  if (turnoverMatch == null && employeesMatch == null) return null;

  return (
    <div className={REF_PANEL_CLASS}>
      <div className="flex items-center gap-2 mb-2">
        <CheckCircle2 className="w-4 h-4 text-green-03" />
        <span className="text-sm font-medium text-gray-01">
          {t("scope.referenceValuesFromApi", { year: latest })}
        </span>
      </div>
      {isLoading && <div className="text-sm text-gray-02">{t("scope.fetching")}</div>}
      {!isLoading && error && <div className="text-sm text-gray-02">{error}</div>}
      {!isLoading && !error && (
        <div className="divide-y divide-gray-03">
          {ourTurnover != null && (
            <div className="flex items-center justify-between py-1.5">
              <span className="text-sm text-gray-02">{t("scope.revenue")}</span>
              <span className="text-sm font-semibold text-gray-01 flex items-center gap-2">
                {formatCurrency(formatNumber, prodTurnover, snapshot.turnover?.currency)}
                {turnoverMatch != null &&
                  (turnoverMatch ? (
                    <span className="text-green-03">✓</span>
                  ) : (
                    <span className="text-pink-03">✗</span>
                  ))}
              </span>
            </div>
          )}
          {ourEmployees != null && (
            <div className="flex items-center justify-between py-1.5">
              <span className="text-sm text-gray-02">{t("scope.employees")}</span>
              <span className="text-sm font-semibold text-gray-01 flex items-center gap-2">
                {formatNumber(prodEmployees)}{" "}
                {snapshot.employees?.unit ?? ""}
                {employeesMatch != null &&
                  (employeesMatch ? (
                    <span className="text-green-03">✓</span>
                  ) : (
                    <span className="text-pink-03">✗</span>
                  ))}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function employeeUnitLabel(t: (key: string) => string, unit: string | null | undefined): string {
  if (unit === "AVG") return t("scope.averageCount");
  if (unit === "FTE") return t("scope.fte");
  if (unit === "EOY") return t("scope.endOfYear");
  return t("scope.employeeCount");
}

export function EconomySection({ data, wikidataId }: EconomySectionProps) {
  const { t, formatNumber } = useI18n();
  if (
    !data.economy ||
    !Array.isArray(data.economy) ||
    data.economy.length === 0
  ) {
    return null;
  }

  const sortedData = [...data.economy].sort((a, b) => b.year - a.year);
  const latestYear = sortedData[0];
  const years = React.useMemo(
    () => Array.from(new Set(sortedData.map((e) => e.year))),
    [sortedData]
  );

  const { referenceByYear, isLoading, error } = useCompanyReferenceByYears(
    wikidataId,
    years,
    buildReferenceSnapshotFromPeriod
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-04/50 rounded-lg border border-gray-03"
    >
      <CollapsibleSection
        defaultOpen
        title={t("scope.economy")}
        icon={<Banknote className="w-5 h-5 text-green-03" />}
        accentIconBg="bg-green-03/20"
        accentTextColor="text-green-03"
      >
        <EconomyReferencePanel
          wikidataId={wikidataId}
          latestYear={latestYear}
          referenceByYear={referenceByYear}
          isLoading={isLoading}
          error={error}
        />

        <div className="space-y-6">
          {sortedData.map((entry, idx) => {
            const economy = entry.economy;
            if (!economy) return null;

            return (
              <div key={entry.year} className="mb-14">
                <YearBadge year={entry.year} isLatest={idx === 0} accent="green" />
                  <div className="flex flex-col md:flex-row md:items-stretch justify-center gap-4 md:gap-0 mt-2 relative max-w-2xl mx-auto">
                    {economy.turnover && economy.turnover.value != null && (
                      <DataCard
                        icon={<Banknote className="w-5 h-5 text-green-03" />}
                        title={t("scope.revenue")}
                        className="mr-0 md:mr-2"
                      >
                        <div className="font-extrabold text-gray-01 text-2xl mb-1">
                          {formatCurrency(
                            formatNumber,
                            economy.turnover.value,
                            economy.turnover.currency
                          )}
                        </div>
                        <div className="text-sm text-gray-02 mt-2">
                          {t("scope.netRevenue")}
                        </div>
                      </DataCard>
                    )}
                    {economy.turnover &&
                      economy.turnover.value != null &&
                      economy.employees &&
                      economy.employees.value != null && (
                        <div
                          className="hidden md:block w-0.5 bg-gray-03 mx-2 rounded-full"
                          style={{ minHeight: 140 }}
                        />
                      )}
                    {economy.employees && economy.employees.value != null && (
                      <DataCard
                        icon={<Users className="w-5 h-5 text-pink-03" />}
                        title={t("scope.employees")}
                        className="ml-0 md:ml-2"
                      >
                        <div className="font-extrabold text-gray-01 text-4xl mb-1">
                          {formatNumber(economy.employees.value)}
                        </div>
                        <div className="text-base text-gray-02">
                          {economy.employees.unit || ""}
                        </div>
                        <div className="text-sm text-gray-02 mt-2">
                          {employeeUnitLabel(t, economy.employees.unit)}
                        </div>
                      </DataCard>
                    )}
                  </div>
                </div>
              );
            })}
        </div>

        <JsonRawDataBlock data={data} />
      </CollapsibleSection>
    </motion.div>
  );
}
