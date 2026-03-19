import { useI18n } from "@/contexts/I18nContext";
import type { GarboCompanyDetail } from "../lib/types";
import { MetadataHint } from "./MetadataHint";

export function EmissionsDataTab({ company }: { company: GarboCompanyDetail }) {
  const { t } = useI18n();
  return (
    <section className="rounded-lg border border-gray-03 bg-gray-04/80 p-4">
      <h3 className="text-sm font-semibold text-gray-01 mb-4">
        {t("editor.singleCompanyView.tabs.emissionsData")}
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
              {rp.reportURL && (
                <a
                  href={rp.reportURL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-03 hover:underline text-xs block mt-1"
                >
                  {t("editor.companies.reportUrl")}
                </a>
              )}
              <div className="mt-2 text-gray-02 text-xs space-y-1">
                {rp.emissions?.scope1?.total != null && (
                  <div>
                    Scope 1:{" "}
                    {Number(rp.emissions.scope1.total).toLocaleString()}
                    <MetadataHint
                      metadata={
                        (rp.emissions as { scope1?: { metadata?: unknown } })
                          ?.scope1?.metadata as any
                      }
                    />
                  </div>
                )}
                {rp.emissions?.scope2 && (
                  <div>
                    Scope 2: MB/LB/Unk
                    <MetadataHint
                      metadata={
                        (rp.emissions as { scope2?: { metadata?: unknown } })
                          ?.scope2?.metadata as any
                      }
                    />
                  </div>
                )}
              </div>
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

