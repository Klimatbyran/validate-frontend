import {
  AlertTriangle,
  ExternalLink,
  Link2,
  Loader2,
  Save,
} from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { reportHrefLinkPillClassName } from "@/lib/report-url-link-pill";
import { Button } from "@/ui/button";
import { inputClassName } from "../../lib/company-edit-utils";
import {
  isUnlinkedCompanyReportRow,
  pickReportLink,
  pickS3Link,
  registryYearMismatch,
  type CompanyReportOverviewRow,
} from "../../lib/company-report-overview";
import { editorPrimaryActionButtonClass } from "../../lib/editor-button-classes";
import { editorSecondaryIdTextClass } from "../../lib/reporting-period-ui";

function RegistryLinkCell({
  row,
  onLinkRegistry,
}: {
  row: CompanyReportOverviewRow;
  onLinkRegistry: () => void;
}) {
  const { t } = useI18n();
  const linkLabel = row.registryReportId
    ? t("editor.singleCompanyView.companyReports.changeRegistryLink")
    : t("editor.singleCompanyView.companyReports.linkRegistry");

  return (
    <div className="space-y-2">
      {row.registryReportId ? (
        <>
          <div className={editorSecondaryIdTextClass}>
            {row.registryReportId}
          </div>
          {row.registryReport?.reportYear ? (
            <div className="text-xs text-gray-02">
              {t("editor.companies.reportYear")}:{" "}
              {row.registryReport.reportYear}
            </div>
          ) : (
            <div className="text-xs text-gray-02">
              {t("editor.singleCompanyView.noReportYear")}
            </div>
          )}
        </>
      ) : (
        <span className="text-sm text-gray-02">
          {t("editor.singleCompanyView.companyReports.notLinkedToRegistry")}
        </span>
      )}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={onLinkRegistry}
      >
        <Link2 className="w-3.5 h-3.5" />
        <span className="ml-1.5">{linkLabel}</span>
      </Button>
    </div>
  );
}

function ReportLinksCell({
  row,
  dash,
}: {
  row: CompanyReportOverviewRow;
  dash: string;
}) {
  const { t } = useI18n();
  const reportLink = pickReportLink(row);
  const s3Link = pickS3Link(row);

  if (!reportLink && !s3Link) {
    return <span className="text-sm text-gray-02">{dash}</span>;
  }

  return (
    <div className="flex flex-col gap-1.5 items-start">
      {reportLink ? (
        <a
          href={reportLink}
          target="_blank"
          rel="noopener noreferrer"
          className={reportHrefLinkPillClassName}
        >
          <ExternalLink className="w-3.5 h-3.5" />
          {t("editor.singleCompanyView.companyReports.reportLink")}
        </a>
      ) : null}
      {s3Link ? (
        <a
          href={s3Link}
          target="_blank"
          rel="noopener noreferrer"
          className={reportHrefLinkPillClassName}
        >
          <ExternalLink className="w-3.5 h-3.5" />
          {t("editor.singleCompanyView.companyReports.s3Link")}
        </a>
      ) : null}
    </div>
  );
}

export function CompanyReportOverviewTableRow({
  row,
  displayYear,
  isYearDirty,
  savingYear,
  onYearChange,
  onSaveYear,
  onLinkRegistry,
}: {
  row: CompanyReportOverviewRow;
  displayYear: string;
  isYearDirty: boolean;
  savingYear: boolean;
  onYearChange: (value: string) => void;
  onSaveYear: () => void;
  onLinkRegistry: () => void;
}) {
  const { t } = useI18n();
  const dash = t("common.placeholderDash");
  const unlinked = isUnlinkedCompanyReportRow(row);
  const mismatch = registryYearMismatch(row);

  return (
    <tr>
      <td className="align-top min-w-[140px]">
        {unlinked ? (
          <span className="text-sm text-gray-02">{dash}</span>
        ) : (
          <div className="flex flex-col gap-2">
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              className={`${inputClassName} max-w-[7rem] !py-1.5 !text-sm`}
              value={displayYear}
              onChange={(e) => onYearChange(e.target.value)}
              aria-label={t(
                "editor.singleCompanyView.companyReports.columns.reportYear",
              )}
            />
            {isYearDirty ? (
              <Button
                type="button"
                size="sm"
                className={editorPrimaryActionButtonClass}
                disabled={savingYear}
                onClick={onSaveYear}
              >
                {savingYear ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span className="ml-1.5">
                  {t("editor.singleCompanyView.companyReports.saveYear")}
                </span>
              </Button>
            ) : null}
            {mismatch ? (
              <div className="flex items-start gap-1.5 text-xs text-orange-03">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>
                  {t(
                    "editor.singleCompanyView.companyReports.registryYearMismatch",
                    {
                      companyYear: row.reportYear,
                      registryYear: row.registryReport?.reportYear ?? dash,
                    },
                  )}
                </span>
              </div>
            ) : null}
          </div>
        )}
      </td>
      <td className="align-top">
        {unlinked ? (
          <span className="text-sm text-gray-02">
            {t("editor.periodEditor.unlinkedReportShell")}
          </span>
        ) : (
          <span className={editorSecondaryIdTextClass}>
            {row.companyReportId}
          </span>
        )}
      </td>
      <td className="align-top min-w-[180px]">
        {unlinked ? (
          <span className="text-sm text-gray-02">{dash}</span>
        ) : (
          <RegistryLinkCell row={row} onLinkRegistry={onLinkRegistry} />
        )}
      </td>
      <td className="align-top text-sm text-gray-01">
        {row.periodDataYears.length ? row.periodDataYears.join(", ") : dash}
      </td>
      <td className="align-top text-sm text-gray-01">{row.periodCount}</td>
      <td className="align-top">
        <ReportLinksCell row={row} dash={dash} />
      </td>
    </tr>
  );
}
