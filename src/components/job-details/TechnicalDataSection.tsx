import { QueueJob } from "@/lib/types";
import { ValueRenderer } from "@/ui/value-renderer";

interface TechnicalDataSectionProps {
  job: QueueJob;
}

export function TechnicalDataSection({ job }: TechnicalDataSectionProps) {
  return (
    <div className="bg-gray-03/20 rounded-lg p-4">
      <h3 className="text-lg font-medium text-gray-01 mb-4">Teknisk data</h3>
      <div className="grid grid-cols-1 gap-4">
        {Object.entries(job.data).map(([key, value]) => {
          if (
            key === "companyName" ||
            key === "description" ||
            key === "schema"
          )
            return null;

          return (
            <div key={key} className="bg-gray-04 rounded-lg p-3">
              <div className="text-sm text-gray-02 mb-1">{key}</div>
              <div className="text-gray-01 break-words">
                <ValueRenderer value={value} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
