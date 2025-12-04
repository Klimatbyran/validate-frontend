import { QueueJob } from "@/lib/types";

interface JobMetadataSectionProps {
  job: QueueJob;
}

export function JobMetadataSection({ job }: JobMetadataSectionProps) {
  const metadataFields = [
    {
      label: "ID",
      value: job.id,
      className: "font-mono",
    },
    {
      label: "Kö",
      value: job.queueId,
    },
    {
      label: "Skapad",
      value: new Date(job.timestamp).toLocaleString("sv-SE"),
    },
    {
      label: "Startad",
      value: job.processedOn
        ? new Date(job.processedOn).toLocaleString("sv-SE")
        : "-",
    },
    {
      label: "Avslutad",
      value: job.finishedOn
        ? new Date(job.finishedOn).toLocaleString("sv-SE")
        : "-",
    },
    {
      label: "Försök",
      value: job.attempts || 0,
    },
  ];

  return (
    <div className="bg-gray-03/20 rounded-lg p-4">
      <h3 className="text-lg font-medium text-gray-01 mb-4">Jobbmetadata</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        {metadataFields.map((field, index) => (
          <div key={index}>
            <div className="text-gray-02">{field.label}</div>
            <div className={`text-gray-01 ${field.className || ""}`}>
              {field.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
