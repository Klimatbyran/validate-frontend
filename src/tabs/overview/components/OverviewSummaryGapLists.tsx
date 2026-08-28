import { useNavigate } from "react-router-dom";
import { useI18n } from "@/contexts/I18nContext";
import { editorCompanyPath } from "@/tabs/editor/lib/editor-routes";
import type { OverviewSummaryCompanyRef } from "../lib/overview-types";
import {
  SUMMARY_GAP_TABLE_MAX_HEIGHT_PX,
  SummarySection,
} from "./OverviewSummaryShared";

function GapCompanyList({
  title,
  description,
  totalMatching,
  companies,
  emptyLabel,
}: {
  title: string;
  description: string;
  totalMatching: number;
  companies: OverviewSummaryCompanyRef[];
  emptyLabel: string;
}) {
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <div className="rounded-lg border border-gray-03 bg-gray-05/40 p-4 space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-blue-03">{title}</h4>
          <p className="text-xs text-gray-02 mt-1">{description}</p>
        </div>
        <p className="text-xs text-gray-02">
          {t("overview.summary.showingOf", {
            shown: companies.length,
            total: totalMatching,
          })}
        </p>
      </div>

      {companies.length === 0 ? (
        <p className="text-sm text-gray-02">{emptyLabel}</p>
      ) : (
        <div
          className="overflow-auto rounded-lg border border-gray-03"
          style={{ maxHeight: SUMMARY_GAP_TABLE_MAX_HEIGHT_PX }}
        >
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 z-10 bg-gray-05 text-left text-xs uppercase tracking-wide text-gray-02 shadow-[inset_0_-1px_0_0] shadow-gray-03">
              <tr>
                <th className="px-3 py-2 font-medium">
                  {t("overview.summary.columns.company")}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t("overview.summary.columns.emissionsYears")}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t("overview.summary.columns.reports")}
                </th>
                <th className="px-3 py-2 font-medium">
                  {t("overview.summary.columns.tags")}
                </th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company) => (
                <tr
                  key={company.companyId}
                  className="border-t border-gray-03/80"
                >
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="text-left text-gray-01 hover:text-blue-03"
                      onClick={() =>
                        navigate(editorCompanyPath(company.companyId))
                      }
                    >
                      {company.name}
                    </button>
                    {company.wikidataId ? (
                      <p className="text-[11px] text-gray-02 font-mono mt-0.5">
                        {company.wikidataId}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-gray-01">
                    {company.emissionsYearCount === 0
                      ? t("overview.summary.none")
                      : company.emissionsYears.join(", ")}
                  </td>
                  <td className="px-3 py-2 text-gray-01">
                    {company.companyReportCount}
                  </td>
                  <td className="px-3 py-2 text-gray-02">
                    {company.tags.length > 0
                      ? company.tags.join(", ")
                      : t("overview.summary.none")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

type Props = {
  gaps: {
    fewEmissionsYears: {
      maxYears: number;
      totalMatching: number;
      companies: OverviewSummaryCompanyRef[];
    };
    reportsWithoutEmissions: {
      totalMatching: number;
      companies: OverviewSummaryCompanyRef[];
    };
    missingLatestYear: {
      year: string;
      totalMatching: number;
      companies: OverviewSummaryCompanyRef[];
    };
    untagged: {
      totalMatching: number;
      companies: OverviewSummaryCompanyRef[];
    };
  };
};

export function OverviewSummaryGapLists({ gaps }: Props) {
  const { t } = useI18n();

  return (
    <SummarySection
      title={t("overview.summary.sections.gaps")}
      description={t("overview.summary.sections.gapsHint")}
    >
      <div className="space-y-4">
        <GapCompanyList
          title={t("overview.summary.gaps.fewEmissionsYears", {
            max: gaps.fewEmissionsYears.maxYears,
          })}
          description={t("overview.summary.gaps.fewEmissionsYearsHint")}
          totalMatching={gaps.fewEmissionsYears.totalMatching}
          companies={gaps.fewEmissionsYears.companies}
          emptyLabel={t("overview.summary.gaps.empty")}
        />
        <GapCompanyList
          title={t("overview.summary.gaps.reportsWithoutEmissions")}
          description={t("overview.summary.gaps.reportsWithoutEmissionsHint")}
          totalMatching={gaps.reportsWithoutEmissions.totalMatching}
          companies={gaps.reportsWithoutEmissions.companies}
          emptyLabel={t("overview.summary.gaps.empty")}
        />
        <GapCompanyList
          title={t("overview.summary.gaps.missingLatestYear", {
            year: gaps.missingLatestYear.year,
          })}
          description={t("overview.summary.gaps.missingLatestYearHint")}
          totalMatching={gaps.missingLatestYear.totalMatching}
          companies={gaps.missingLatestYear.companies}
          emptyLabel={t("overview.summary.gaps.empty")}
        />
        <GapCompanyList
          title={t("overview.summary.gaps.untagged")}
          description={t("overview.summary.gaps.untaggedHint")}
          totalMatching={gaps.untagged.totalMatching}
          companies={gaps.untagged.companies}
          emptyLabel={t("overview.summary.gaps.empty")}
        />
      </div>
    </SummarySection>
  );
}
