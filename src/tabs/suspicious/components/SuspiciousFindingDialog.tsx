import { useState, type ReactNode } from "react";
import { ExternalLink, FileText, PencilLine } from "lucide-react";
import { Link } from "react-router-dom";
import { getUnearthTarget } from "@/config/api-env";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/contexts/I18nContext";
import { getKlimatkollenCompanyPath } from "@/lib/company-routing";
import { Button } from "@/ui/button";
import { Modal } from "@/ui/modal";
import type { Company } from "@/tabs/errors/types";
import type { SuspicionFinding } from "../types";
import {
  basisLabelKey,
  formatMessageParams,
  ruleBasis,
  ruleDescriptionKey,
  ruleLabelKey,
} from "../lib/finding-display";
import {
  sourceLabelKey,
  type SuspiciousDataSource,
} from "../lib/pipeline-source";
import { updateReportingPeriodsForSource } from "../lib/write-api";
import {
  buildReportingPeriodWriteBody,
  findPeriodForFinding,
  isWritableDataPoint,
  parseInputNumber,
} from "../lib/write-value";
import { OriginBadge, SeverityBadge } from "./SuspicionBadges";

const linkClass =
  "inline-flex items-center gap-1.5 text-sm text-blue-03 hover:text-blue-02 transition-colors";

const inputClass =
  "h-10 w-full rounded-lg border border-gray-03 bg-gray-05 px-3 text-sm text-gray-01 outline-none placeholder:text-gray-02 transition-colors hover:border-gray-02 focus-visible:border-blue-03";

type SaveStatus = "idle" | "confirming" | "saving" | "saved";

export function SuspiciousFindingDialog({
  finding,
  source,
  companies,
  onSaved,
  onClose,
}: {
  finding: SuspicionFinding | null;
  source: SuspiciousDataSource;
  companies: Company[];
  onSaved: () => void | Promise<void>;
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

        <CorrectionForm
          key={finding.id}
          finding={finding}
          source={source}
          companies={companies}
          onSaved={onSaved}
        />

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

function CorrectionForm({
  finding,
  source,
  companies,
  onSaved,
}: {
  finding: SuspicionFinding;
  source: SuspiciousDataSource;
  companies: Company[];
  onSaved: () => void | Promise<void>;
}) {
  const { t } = useI18n();
  const { isAuthenticated } = useAuth();
  const [value, setValue] = useState(
    finding.value === null ? "" : String(finding.value),
  );
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const authTarget = getUnearthTarget();
  const sourceLabel = t(sourceLabelKey(source));

  if (!isWritableDataPoint(finding.dataPointId)) {
    return <FormShell>{t("suspicious.detail.notWritable")}</FormShell>;
  }

  const period = findPeriodForFinding(companies, finding);
  if (!period) {
    return <FormShell>{t("suspicious.detail.periodMissing")}</FormShell>;
  }

  if (!isAuthenticated) {
    return <FormShell>{t("suspicious.detail.loginRequired")}</FormShell>;
  }

  if (authTarget !== source) {
    return (
      <FormShell>
        {t("suspicious.detail.sourceMismatch", {
          auth: t(sourceLabelKey(authTarget)),
          source: sourceLabel,
        })}
      </FormShell>
    );
  }

  const validate = (): { parsed: number; note: string } | null => {
    const parsed = parseInputNumber(value);
    if (parsed === null) {
      setError(t("suspicious.detail.invalidValue"));
      return null;
    }
    if (parsed === finding.value) {
      setError(t("suspicious.detail.unchanged"));
      return null;
    }
    const note = comment.trim();
    if (!note) {
      setError(t("suspicious.detail.commentRequired"));
      return null;
    }
    return { parsed, note };
  };

  const handleSubmit = () => {
    setError(null);
    if (!validate()) return;
    setStatus("confirming");
  };

  const handleConfirm = async () => {
    setError(null);
    const valid = validate();
    if (!valid) {
      setStatus("idle");
      return;
    }

    const body = buildReportingPeriodWriteBody(
      period,
      finding.dataPointId,
      valid.parsed,
      valid.note,
    );
    if (!body) {
      setStatus("idle");
      setError(t("suspicious.detail.periodMissing"));
      return;
    }

    setStatus("saving");
    try {
      await updateReportingPeriodsForSource(source, finding.companyId, body);
      setStatus("saved");
      await onSaved();
    } catch (saveError) {
      setStatus("idle");
      setError(
        saveError instanceof Error
          ? saveError.message
          : t("suspicious.detail.saveFailed"),
      );
    }
  };

  return (
    <div className="rounded-lg border border-gray-03 bg-gray-05/60 p-4 space-y-3">
      <p className="text-xs uppercase tracking-wide text-gray-02">
        {t("suspicious.detail.correctValue")}
      </p>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,14rem)_1fr]">
        <label className="block">
          <span className="text-xs text-gray-02">
            {t("suspicious.detail.newValue")}
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={value}
            disabled={status === "saving" || status === "saved"}
            onChange={(event) => {
              setValue(event.target.value);
              setStatus("idle");
              setError(null);
            }}
            placeholder={t("suspicious.detail.newValuePlaceholder")}
            className={`mt-1 ${inputClass}`}
          />
        </label>
        <label className="block">
          <span className="text-xs text-gray-02">
            {t("suspicious.detail.comment")}
          </span>
          <input
            type="text"
            value={comment}
            disabled={status === "saving" || status === "saved"}
            onChange={(event) => {
              setComment(event.target.value);
              setStatus("idle");
              setError(null);
            }}
            placeholder={t("suspicious.detail.commentPlaceholder")}
            className={`mt-1 ${inputClass}`}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {status === "confirming" ? (
          <>
            <p className="text-sm text-amber-200">
              {t("suspicious.detail.confirmPrompt", {
                value: value.trim(),
                source: sourceLabel,
                company: finding.companyName,
              })}
            </p>
            <Button size="sm" onClick={handleConfirm}>
              {t("suspicious.detail.confirmSave")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setStatus("idle")}
            >
              {t("suspicious.detail.cancel")}
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={status === "saving" || status === "saved"}
          >
            {status === "saving"
              ? t("suspicious.detail.saving")
              : t("suspicious.detail.save")}
          </Button>
        )}
        <span className="text-xs text-gray-02">
          {t("suspicious.detail.verifiedHint")}
        </span>
      </div>

      {error ? <p className="text-sm text-pink-03">{error}</p> : null}
      {status === "saved" ? (
        <p className="text-sm text-green-400">{t("suspicious.detail.saved")}</p>
      ) : null}
    </div>
  );
}

function FormShell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="rounded-lg border border-gray-03 bg-gray-05/60 p-4">
      <p className="text-xs uppercase tracking-wide text-gray-02">
        {t("suspicious.detail.correctValue")}
      </p>
      <p className="mt-2 text-sm text-gray-02">{children}</p>
    </div>
  );
}
