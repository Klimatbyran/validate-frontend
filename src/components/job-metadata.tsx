import { QueueJob } from "@/lib/types";

interface JobMetadataProps {
  job: QueueJob;
}

export function JobMetadata({ job }: JobMetadataProps) {
  return (
    <div className="bg-gray-03/20 rounded-lg p-4">
      <h3 className="text-lg font-medium text-gray-01 mb-4">Jobbmetadata</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-gray-02">ID</div>
          <div className="font-mono text-gray-01">{job.id}</div>
        </div>
        <div>
          <div className="text-gray-02">Kö</div>
          <div className="text-gray-01">{job.queueId}</div>
        </div>
        <div>
          <div className="text-gray-02">Skapad</div>
          <div className="text-gray-01">
            {new Date(job.timestamp).toLocaleString("sv-SE")}
          </div>
        </div>
        <div>
          <div className="text-gray-02">Startad</div>
          <div className="text-gray-01">
            {job.processedOn
              ? new Date(job.processedOn).toLocaleString("sv-SE")
              : "-"}
          </div>
        </div>
        <div>
          <div className="text-gray-02">Avslutad</div>
          <div className="text-gray-01">
            {job.finishedOn
              ? new Date(job.finishedOn).toLocaleString("sv-SE")
              : "-"}
          </div>
        </div>
        <div>
          <div className="text-gray-02">Försök</div>
          <div className="text-gray-01">{String(job.attemptsMade)}</div>
        </div>
      </div>
    </div>
  );
}
