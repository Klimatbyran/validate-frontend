import { QueueJob } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useI18n } from "@/contexts/I18nContext";

interface JobMetadataSectionProps {
  job: QueueJob;
}

export function JobMetadataSection({ job }: JobMetadataSectionProps) {
  const { t, formatDate, formatNumber } = useI18n();
  const metadataFields = [
    {
      label: t("jobstatus.metadata.id"),
      value: job.id,
      className: "font-mono",
    },
    {
      label: t("jobstatus.metadata.queue"),
      value: job.queueId && t(`jobstatus.queues.${job.queueId}`) !== `jobstatus.queues.${job.queueId}` ? t(`jobstatus.queues.${job.queueId}`) : job.queueId,
    },
    {
      label: t("jobstatus.metadata.created"),
      value: formatDate(job.timestamp),
    },
    {
      label: t("jobstatus.metadata.started"),
      value: job.processedOn ? formatDate(job.processedOn) : "-",
    },
    {
      label: t("jobstatus.metadata.finished"),
      value: job.finishedOn ? formatDate(job.finishedOn) : "-",
    },
    {
      label: t("jobstatus.metadata.attempts"),
      value: formatNumber(job.attempts ?? 0),
    },
  ];

  return (
    <div className="bg-gray-03/20 rounded-lg p-4">
      <h3 className="text-lg font-medium text-gray-01 mb-4">{t("jobstatus.metadata.title")}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        {metadataFields.map((field, index) => (
          <div key={index}>
            <div className="text-gray-02">{field.label}</div>
            <div className={cn("text-gray-01", field.className)}>
              {field.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
