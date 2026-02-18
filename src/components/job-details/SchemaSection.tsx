import { Code } from "lucide-react";
import { QueueJob } from "@/lib/types";
import { JsonViewer } from "../ui/json-viewer";

interface SchemaSectionProps {
  job: QueueJob;
}

export function SchemaSection({ job }: SchemaSectionProps) {
  if (!job.data.schema) return null;

  return (
    <div className="bg-gray-04/50 rounded-lg p-4 border border-gray-03">
      <h3 className="text-lg font-medium text-blue-03 mb-4 flex items-center">
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-03/20 mr-2">
          <Code className="w-4 h-4 text-blue-03" />
        </span>
        Schema
      </h3>
      <div className="bg-gray-04 rounded-lg p-3 border border-gray-03">
        <JsonViewer data={job.data.schema} />
      </div>
    </div>
  );
}
