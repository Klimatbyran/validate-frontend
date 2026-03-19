import { useI18n } from "@/contexts/I18nContext";
import type { GarboCompanyDetail } from "../lib/types";
import { MetadataHint } from "./MetadataHint";

export function EconomyDataTab({ company }: { company: GarboCompanyDetail }) {
  const { t } = useI18n();
  return (
    <section className="rounded-lg border border-gray-03 bg-gray-04/80 p-4">
      <h3 className="text-sm font-semibold text-gray-01 mb-4">
        {t("editor.singleCompanyView.tabs.economyData")}
      </h3>
      {company.reportingPeriods?.length ? (
        <ul className="space-y-4">
          {company.reportingPeriods.map((rp) => (
            <li
              key={rp.id ?? rp.startDate}
              className="text-sm border-b border-gray-03/50 pb-4 last:border-0"
            >
              <div className="font-medium text-gray-01">
                {rp.startDate} – {rp.endDate}
              </div>
              {rp.economy ? (
                <div className="mt-2 text-gray-02 text-xs">
                  Economy
                  <MetadataHint
                    metadata={(rp.economy as { metadata?: unknown })?.metadata as any}
                  />
                </div>
              ) : (
                <p className="text-xs text-gray-03 mt-1">—</p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-02">
          {t("editor.singleCompanyView.noReportingPeriods")}
        </p>
      )}
      <p className="text-xs text-gray-03 mt-2">
        {t("editor.singleCompanyView.reportingPeriodsHint")}
      </p>
    </section>
  );
}

