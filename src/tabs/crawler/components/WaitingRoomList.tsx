import { useI18n } from "@/contexts/I18nContext";

type WaitingRoomListVariant = "success" | "failed";

export interface WaitingRoomListItem {
  companyName?: string;
  reportYear?: string;
  id?: string;
  url?: string;
  wikidataId?: string | null;
  error?: string;
  message?: string;
}

interface WaitingRoomListProps {
  items: WaitingRoomListItem[];
  variant: WaitingRoomListVariant;
}

const WaitingRoomList = ({ items, variant }: WaitingRoomListProps) => {
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
            {report.companyName ?? t("upload.unknownCompany")}
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
                  {t("jobstatus.metadata.id")}: {report.id}
                </span>
              )}
              {report.wikidataId && (
                <span>
                  {t("jobstatus.jobdetails.wikidataIdLabel")}:{" "}
                  {report.wikidataId}
                </span>
              )}
              {report.url && (
                <a
                  href={report.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-03 underline break-all"
                >
                  {t("jobstatus.jobdetails.reportLink")}
                </a>
              )}
            </>
          ) : (
            <div>
              <span>{t("crawler.waitingRoomFailureReason")}: </span>
              <span className="text-red-500">
                {report.message ??
                  (report.error === "duplicate"
                    ? t("crawler.waitingRoomDuplicateFailure")
                    : t("upload.unknownError"))}
              </span>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
};

export default WaitingRoomList;
