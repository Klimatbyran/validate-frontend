import { Info, ExternalLink, FileText } from "lucide-react";
import { useMemo } from "react";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import { Modal } from "@/ui/modal";
import type {
  GarboFieldMetadata,
  GarboMetadataHistory,
} from "../lib/types";

function hasAnyMetadata(metadata: GarboFieldMetadata | null | undefined) {
  if (!metadata) return false;
  return Boolean(
    metadata.source?.trim() ||
      metadata.sourceReference?.trim() ||
      metadata.sourcePageUrl?.trim() ||
      metadata.comment?.trim() ||
      metadata.verifiedBy?.name?.trim() ||
      metadata.verifiedBy ||
      metadata.updatedAt ||
      metadata.createdAt ||
      metadata.user?.name,
  );
}

function hasHistory(history: GarboMetadataHistory | null | undefined) {
  return Boolean(history && history.length > 0);
}

/** Only linkify internal storage PDF deep links — never arbitrary hrefs. */
function trustedSourcePageUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:") return null;
    if (!url.hostname.toLowerCase().endsWith("storage.googleapis.com")) {
      return null;
    }
    return trimmed;
  } catch {
    return null;
  }
}

function formatPreviousValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function MetadataDetailsDialog({
  metadata,
  metadataHistory,
  fieldLabel,
  triggerAriaLabel,
}: {
  metadata?: GarboFieldMetadata | null;
  /** Full append-only history chain (newest first). Falls back to [metadata]. */
  metadataHistory?: GarboMetadataHistory | null;
  fieldLabel: string;
  triggerAriaLabel?: string;
}) {
  const { t, localeIntl } = useI18n();

  const formatDate = (value: unknown): string | null => {
    if (typeof value !== "string" || !value.trim()) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return new Intl.DateTimeFormat(localeIntl, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  };

  const historyEntries = useMemo(() => {
    if (hasHistory(metadataHistory)) return metadataHistory!;
    if (hasAnyMetadata(metadata)) return [metadata!];
    return [];
  }, [metadata, metadataHistory]);

  const openable = historyEntries.length > 0;
  const latest = historyEntries[0] ?? metadata;
  const source = latest?.source?.trim() || null;
  const sourceReference = latest?.sourceReference?.trim() || null;
  const sourcePageUrl = trustedSourcePageUrl(latest?.sourcePageUrl);
  const comment = latest?.comment?.trim() || null;
  const verifiedBy =
    latest?.verifiedBy?.name?.trim() ||
    (latest?.verifiedBy ? t("editor.metadataDetails.verifiedYes") : null);
  const updatedAt =
    formatDate(latest?.updatedAt) ?? formatDate(latest?.createdAt) ?? null;

  if (!openable) return null;

  return (
    <span className="inline-flex items-center gap-0.5">
      {sourcePageUrl && (
        <a
          href={sourcePageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-full text-blue-03 hover:bg-gray-03/40 h-6 w-6"
          aria-label={t("editor.metadataDetails.openSourcePage")}
          title={t("editor.metadataDetails.openSourcePage")}
        >
          <FileText className="w-3.5 h-3.5" />
        </a>
      )}
      <Modal
        trigger={
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full text-blue-03 hover:bg-gray-03/40 h-6 w-6"
            aria-label={
              triggerAriaLabel ??
              t("editor.metadataDetails.openFieldMetadata", {
                field: fieldLabel,
              })
            }
            title={t("editor.metadataDetails.viewDetails")}
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        }
        size="xl"
        title={t("editor.metadataDetails.titleWithField", {
          field: fieldLabel,
        })}
        description={t("editor.metadataDetails.description")}
      >
        <div className="grid gap-4 max-h-[70vh] overflow-auto pr-1">
          {(updatedAt || verifiedBy) && (
            <section className="rounded-lg bg-gray-05 p-3">
              <div className="text-xs font-medium text-gray-02 mb-2">
                {t("editor.metadataDetails.sectionDetails")}
              </div>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {updatedAt && (
                  <div>
                    <dt className="text-xs text-gray-03">
                      {t("editor.metadataDetails.updated")}
                    </dt>
                    <dd className="text-sm text-gray-01 break-words">
                      {updatedAt}
                    </dd>
                  </div>
                )}
                {verifiedBy && (
                  <div>
                    <dt className="text-xs text-gray-03">
                      {t("editor.metadataDetails.verifiedBy")}
                    </dt>
                    <dd className="text-sm text-gray-01 break-words">
                      {verifiedBy}
                    </dd>
                  </div>
                )}
              </dl>
            </section>
          )}

          {(sourceReference || sourcePageUrl) && (
            <section className="rounded-lg bg-gray-05 p-3">
              <div className="text-xs font-medium text-gray-02 mb-2">
                {t("editor.metadataDetails.sourcePage")}
              </div>
              <dl className="grid gap-3">
                {sourceReference && (
                  <div>
                    <dt className="text-xs text-gray-03">
                      {t("editor.metadataDetails.sourceReference")}
                    </dt>
                    <dd className="text-sm text-gray-01 break-words">
                      {sourceReference}
                    </dd>
                  </div>
                )}
                {sourcePageUrl && (
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={sourcePageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-02 underline break-all"
                      >
                        {sourcePageUrl}
                      </a>
                      <Button
                        asChild
                        size="sm"
                        variant="secondary"
                        className="min-w-0"
                      >
                        <a
                          href={sourcePageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          {t("editor.metadataDetails.openSourcePage")}
                        </a>
                      </Button>
                    </div>
                  </div>
                )}
              </dl>
            </section>
          )}

          {source && (
            <section className="rounded-lg bg-gray-05 p-3">
              <div className="text-xs font-medium text-gray-02 mb-1">
                {t("editor.metadataDetails.source")}
              </div>
              <a
                href={source}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-02 underline break-all"
              >
                {source}
              </a>
            </section>
          )}

          {comment && (
            <section className="rounded-lg bg-gray-05 p-3">
              <div className="text-xs font-medium text-gray-02 mb-1">
                {t("editor.metadataDetails.comment")}
              </div>
              <p className="text-sm text-gray-01 whitespace-pre-wrap break-words">
                {comment}
              </p>
            </section>
          )}

          {historyEntries.length > 0 && (
            <section className="rounded-lg bg-gray-05 p-3">
              <div className="text-xs font-medium text-gray-02 mb-3">
                {t("editor.metadataDetails.history")}
              </div>
              <ol className="grid gap-3">
                {historyEntries.map((entry, index) => {
                  const when =
                    formatDate(entry.createdAt) ??
                    formatDate(entry.updatedAt) ??
                    "—";
                  const who =
                    entry.user?.name?.trim() ||
                    t("editor.metadataDetails.unknownUser");
                  const botLabel = entry.user?.bot
                    ? ` (${t("editor.metadataDetails.bot")})`
                    : "";
                  const prev = formatPreviousValue(entry.previousValue);
                  const entryVerified =
                    entry.verifiedBy?.name?.trim() || null;
                  const entryComment = entry.comment?.trim() || null;
                  const entrySource = entry.source?.trim() || null;

                  return (
                    <li
                      key={entry.id ?? `${when}-${index}`}
                      className="rounded-md border border-gray-04 bg-white/60 p-3"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-01">
                          {who}
                          {botLabel}
                        </span>
                        <span className="text-xs text-gray-03">{when}</span>
                      </div>
                      <dl className="grid gap-1 text-sm">
                        {prev !== null && (
                          <div>
                            <dt className="inline text-xs text-gray-03 mr-1">
                              {t("editor.metadataDetails.previousValue")}:
                            </dt>
                            <dd className="inline text-gray-01 break-all font-mono text-xs">
                              {prev}
                            </dd>
                          </div>
                        )}
                        {entryVerified && (
                          <div>
                            <dt className="inline text-xs text-gray-03 mr-1">
                              {t("editor.metadataDetails.verifiedBy")}:
                            </dt>
                            <dd className="inline text-gray-01">
                              {entryVerified}
                            </dd>
                          </div>
                        )}
                        {entrySource && (
                          <div className="text-xs text-gray-02 break-all">
                            {entrySource}
                          </div>
                        )}
                        {entryComment && (
                          <div className="text-xs text-gray-01 whitespace-pre-wrap">
                            {entryComment}
                          </div>
                        )}
                      </dl>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}
        </div>
      </Modal>
    </span>
  );
}
