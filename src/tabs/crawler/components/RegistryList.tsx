import { useI18n } from "@/contexts/I18nContext";

type RegistryListVariant = "success" | "failed";

export interface RegistryListItem {
  companyName?: string;
  reportYear?: string;
  id?: string;
  url?: string;
  wikidataId?: string | null;
  error?: string;
  message?: string;
}

interface RegistryListProps {
  items: RegistryListItem[];
  variant: RegistryListVariant;
}

const RegistryList = ({ items, variant }: RegistryListProps) => {
  const { t } = useI18n();
  const isSuccess = variant === "success";

  return (
    <ul className="list-disc list-inside text-sm text-gray-02 mt-1 space-y-2 h-auto">
      {items.map((report, index) => (
        <li
          key={`${variant}-${report.companyName ?? "unknown"}-${report.reportYear ?? index}`}
          className="flex flex-wrap items-center gap-x-4 gap-y-1 pb-2 border-b border-gray-03/60 last:border-b-0"
        >
          <span className="font-medium text-gray-01">
            {report.companyName ?? t("crawler.unknownCompany")}
          </span>

          {report.reportYear && (
            <span>
              {t("crawler.reportYear")}: {report.reportYear}
            </span>
          )}

          {isSuccess ? (
            <>
              {report.id && (
                <span>
                  {t("crawler.reportIdLabel")}: {report.id}
                </span>
              )}
              {report.wikidataId && (
                <span>
                  {t("crawler.wikidataIdLabel")}: {report.wikidataId}
                </span>
              )}
              {report.url && (
                <a
                  href={report.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-03 underline break-all"
                >
                  {t("crawler.reportLink")}
                </a>
              )}
            </>
          ) : (
            <div>
              <span>{t("crawler.registryFailureReason")}: </span>
              <span className="text-red-500">
                {report.message ??
                  (report.error === "duplicate"
                    ? t("crawler.registryDuplicateFailure")
                    : t("crawler.unknownError"))}
              </span>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
};

export default RegistryList;
