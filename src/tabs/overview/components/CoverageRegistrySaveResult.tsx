import { useI18n } from "@/contexts/I18nContext";
import RegistryList from "@/tabs/crawler/components/RegistryList";
import type { SaveReportsListResponse } from "@/tabs/crawler/lib/crawler-types";
import {
  registrySaveResponseStatusClassName,
  registrySaveResponseType,
} from "@/tabs/overview/lib/registry-save-response-status";

type CoverageRegistrySaveResultProps = {
  response: SaveReportsListResponse;
  /** When there are zero successes and zero failures (crawl “none saved”). */
  emptySuccessLabel?: string;
  showEmptySuccessMessage?: boolean;
};

export function CoverageRegistrySaveResult({
  response,
  emptySuccessLabel,
  showEmptySuccessMessage = false,
}: CoverageRegistrySaveResultProps) {
  const { t } = useI18n();
  const responseType = registrySaveResponseType(response);
  const statusClassName = registrySaveResponseStatusClassName(responseType);

  const statusLabel =
    responseType === "success"
      ? t("crawler.successful")
      : responseType === "partial"
        ? t("crawler.partiallySuccessful")
        : responseType === "failed"
          ? t("crawler.failed")
          : (emptySuccessLabel ?? t("overview.coverage.crawlReportsNoneSaved"));

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-02">
        {t("crawler.registryStatus")}:{" "}
        <span className={statusClassName}>{statusLabel}</span>
      </p>
      {response.successes.length > 0 ? (
        <div>
          <p className="mb-2 text-sm font-medium text-gray-01">
            {t("crawler.successful")}:
          </p>
          <RegistryList variant="success" items={response.successes} />
        </div>
      ) : showEmptySuccessMessage ? (
        <p className="text-sm text-gray-02">
          {emptySuccessLabel ?? t("overview.coverage.crawlReportsNoneSaved")}
        </p>
      ) : null}
      {response.failed.length > 0 ? (
        <div>
          <p className="mb-2 text-sm font-medium text-gray-01">
            {t("crawler.failed")}:
          </p>
          <RegistryList variant="failed" items={response.failed} />
        </div>
      ) : null}
    </div>
  );
}
