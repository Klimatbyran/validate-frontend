import { ExternalLink, FileText } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import {
  pageNumberFromSourcePageUrl,
  trustedSourcePageUrl,
} from "@/lib/trusted-source-page-url";
import { Button } from "@/ui/button";

/**
 * Shows extraction provenance and, when a trusted GCS PDF deep-link exists,
 * an inline page preview. Arbitrary URLs are never embedded.
 */
export function FindingSourcePreview({
  sourceReference,
  sourcePageUrl,
  extractionSource,
  priorComment,
}: {
  sourceReference: string | null;
  sourcePageUrl: string | null;
  extractionSource: string | null;
  priorComment: string | null;
}) {
  const { t } = useI18n();
  const trustedUrl = trustedSourcePageUrl(sourcePageUrl);
  const page = pageNumberFromSourcePageUrl(trustedUrl);

  if (!sourceReference && !trustedUrl && !extractionSource && !priorComment) {
    return (
      <div className="rounded-lg border border-dashed border-gray-03 bg-gray-05/40 px-4 py-3">
        <p className="text-xs uppercase tracking-wide text-gray-02 mb-1">
          {t("suspicious.detail.sourceTitle")}
        </p>
        <p className="text-sm text-gray-02">
          {t("suspicious.detail.sourceMissing")}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-03 bg-gray-05/60 p-4 space-y-3">
      <p className="text-xs uppercase tracking-wide text-gray-02">
        {t("suspicious.detail.sourceTitle")}
      </p>

      <dl className="grid gap-3 sm:grid-cols-2">
        {sourceReference ? (
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-gray-02">
              {t("suspicious.detail.sourceReference")}
            </dt>
            <dd className="text-sm text-gray-01 mt-0.5 break-words">
              {sourceReference}
            </dd>
          </div>
        ) : null}
        {page !== null ? (
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-gray-02">
              {t("suspicious.detail.sourcePage")}
            </dt>
            <dd className="text-sm text-gray-01 mt-0.5">{page}</dd>
          </div>
        ) : null}
        {priorComment ? (
          <div className="sm:col-span-2">
            <dt className="text-[11px] uppercase tracking-wide text-gray-02">
              {t("suspicious.detail.priorComment")}
            </dt>
            <dd className="text-sm text-gray-01 mt-0.5 whitespace-pre-wrap break-words">
              {priorComment}
            </dd>
          </div>
        ) : null}
        {extractionSource ? (
          <div className="sm:col-span-2">
            <dt className="text-[11px] uppercase tracking-wide text-gray-02">
              {t("suspicious.detail.extractionSource")}
            </dt>
            <dd className="text-sm text-gray-01 mt-0.5 break-all">
              {extractionSource}
            </dd>
          </div>
        ) : null}
      </dl>

      {trustedUrl ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild size="sm" variant="secondary" className="min-w-0">
              <a href={trustedUrl} target="_blank" rel="noopener noreferrer">
                <FileText className="w-4 h-4 mr-2" />
                {t("suspicious.detail.openSourcePage")}
              </a>
            </Button>
            <a
              href={trustedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-03 hover:text-blue-02"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              {t("suspicious.detail.openSourcePageNewTab")}
            </a>
          </div>
          <div className="overflow-hidden rounded-lg border border-gray-03 bg-gray-04">
            <iframe
              title={t("suspicious.detail.sourcePreviewTitle")}
              src={trustedUrl}
              className="h-72 w-full bg-white"
            />
          </div>
          <p className="text-xs text-gray-02">
            {t("suspicious.detail.sourcePreviewHint")}
          </p>
        </div>
      ) : null}
    </div>
  );
}
