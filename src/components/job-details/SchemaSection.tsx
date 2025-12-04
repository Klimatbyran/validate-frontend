import { Code } from "lucide-react";
import { QueueJob } from "@/lib/types";
import { JsonViewer } from "../ui/json-viewer";

interface SchemaSectionProps {
  job: QueueJob;
}

export function SchemaSection({ job }: SchemaSectionProps) {
  if (!job.data.schema) return null;

  return (
    <div className="bg-blue-03/10 rounded-lg p-4">
      <h3 className="text-lg font-medium text-blue-03 mb-4 flex items-center">
        <Code className="w-5 h-5 mr-2" />
        Schema
      </h3>
      <div className="bg-gray-04 rounded-lg p-3">
        <JsonViewer data={job.data.schema} />
      </div>
    </div>
  );
}
