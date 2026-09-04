import { ExternalLink, FileText, PencilLine } from "lucide-react";
import { Link } from "react-router-dom";
import { useI18n } from "@/contexts/I18nContext";
import { getKlimatkollenCompanyPath } from "@/lib/company-routing";
import { Modal } from "@/ui/modal";
import type { SuspicionFinding } from "../types";
import {
  basisLabelKey,
  formatMessageParams,
  ruleBasis,
  ruleDescriptionKey,
  ruleLabelKey,
} from "../lib/finding-display";
import { OriginBadge, SeverityBadge } from "./SuspicionBadges";

const linkClass =
  "inline-flex items-center gap-1.5 text-sm text-blue-03 hover:text-blue-02 transition-colors";

export function SuspiciousFindingDialog({
  finding,
  onClose,
}: {
  finding: SuspicionFinding | null;
  onClose: () => void;
}) {
  const { t, formatNumber } = useI18n();

  if (!finding) return null;

  const message = t(
    finding.messageKey,
    formatMessageParams(finding.messageParams, formatNumber),
  );

  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      size="2xl"
      scrollable
      title={finding.companyName}
      description={t("suspicious.detail.subtitle", {
        dataPoint: finding.dataPointLabel,
        year: finding.dataYear,
      })}
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <SeverityBadge severity={finding.severity} />
          <OriginBadge origin={finding.origin} />
          <span className="text-xs text-gray-02">
            {t(ruleLabelKey(finding.rule))} ·{" "}
            {t(basisLabelKey(ruleBasis(finding.rule)))}
          </span>
        </div>

        <div className="rounded-lg border border-gray-03 bg-gray-05/60 p-4">
          <p className="text-sm text-gray-01">{message}</p>
          <p className="text-xs text-gray-02 mt-2">
            {t(ruleDescriptionKey(finding.rule))}
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-gray-02 mb-2">
            {t("suspicious.detail.comparison")}
          </p>
          <dl className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-pink-03/30 bg-pink-03/5 px-3 py-2">
              <dt className="text-[11px] uppercase tracking-wide text-gray-02">
                {t("suspicious.detail.flaggedValue")}
              </dt>
              <dd className="text-lg font-semibold text-gray-01">
                {formatNumber(finding.value)}
              </dd>
            </div>
            {finding.comparisons.map((comparison) => (
              <div
                key={comparison.labelKey}
                className="rounded-lg border border-gray-03 bg-gray-05/70 px-3 py-2"
              >
                <dt className="text-[11px] uppercase tracking-wide text-gray-02">
                  {t(comparison.labelKey, comparison.labelParams)}
                </dt>
                <dd className="text-lg font-semibold text-gray-01">
                  {comparison.display ?? formatNumber(comparison.value)}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            {
              labelKey: "yearLabels.dataYear",
              value: String(finding.dataYear),
            },
            {
              labelKey: "yearLabels.companyReportYearShort",
              value: finding.reportYear ? String(finding.reportYear) : null,
            },
            {
              labelKey: "suspicious.table.verifiedBy",
              value: finding.verifiedByName,
            },
            { labelKey: "companyLink.wikidata", value: finding.wikidataId },
          ].map((field) => (
            <div key={field.labelKey}>
              <dt className="text-[11px] uppercase tracking-wide text-gray-02">
                {t(field.labelKey)}
              </dt>
              <dd className="text-sm text-gray-01 mt-0.5">
                {field.value ?? t("common.placeholderDash")}
              </dd>
            </div>
          ))}
        </dl>

        <div className="flex flex-wrap items-center gap-4 border-t border-gray-03/50 pt-4">
          <Link
            to={`/editor/company/${finding.companyId}`}
            className={linkClass}
            onClick={onClose}
          >
            <PencilLine className="w-4 h-4" />
            {t("suspicious.detail.openInEditor")}
          </Link>
          {finding.reportUrl ? (
            <a
              href={finding.reportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClass}
            >
              <FileText className="w-4 h-4" />
              {t("suspicious.detail.openReport")}
            </a>
          ) : null}
          <a
            href={getKlimatkollenCompanyPath({
              id: finding.companyId,
              wikidataId: finding.wikidataId,
            })}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            <ExternalLink className="w-4 h-4" />
            {t("suspicious.detail.openPublicPage")}
          </a>
        </div>
      </div>
    </Modal>
  );
}
