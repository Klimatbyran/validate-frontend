import { QueueJob } from "@/lib/types";
import { JsonViewer } from "../ui/json-viewer";
import { isJsonString } from "@/lib/utils";

interface ReturnValueSectionProps {
  job: QueueJob | null;
}

export function ReturnValueSection({ job }: ReturnValueSectionProps) {
  if (!job) return null;

  // Check both returnValue (camelCase) and returnvalue (lowercase)
  const returnValue = job.returnValue ?? (job as any).returnvalue;

  if (returnValue === null || returnValue === undefined) {
    return null;
  }

  return (
    <div className="bg-gray-03/20 rounded-lg p-4">
      <h3 className="text-lg font-medium text-gray-01 mb-4">Return Value</h3>
      <div className="bg-gray-04 rounded-lg p-3">
        <div className="text-gray-01 break-words">
          {typeof returnValue === "string" && isJsonString(returnValue) ? (
            <JsonViewer data={returnValue} />
          ) : typeof returnValue === "object" ? (
            <JsonViewer data={returnValue} />
          ) : (
            String(returnValue)
          )}
        </div>
      </div>
    </div>
  );
}
