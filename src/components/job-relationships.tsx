import { GitBranch, ArrowUpRight } from "lucide-react";
import { QueueJob } from "@/lib/types";

interface JobRelationshipsProps {
  job: QueueJob;
}

export function JobRelationships({ job }: JobRelationshipsProps) {
  if (!job.parent) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-blue-03/10 to-blue-04/10 rounded-xl p-6 border border-blue-03/20">
      <h3 className="text-xl font-semibold text-blue-03 mb-4 flex items-center">
        <GitBranch className="w-5 h-5 mr-3" />
        Jobbrelationer
      </h3>
      <div className="space-y-3">
        <div className="flex items-center space-x-3 text-blue-03">
          <ArrowUpRight className="w-4 h-4" />
          <span className="text-sm font-medium">Förälder:</span>
          <code className="bg-blue-03/20 px-3 py-1 rounded-lg text-sm font-mono">
            {job.parent.queue}:{job.parent.id}
          </code>
        </div>
      </div>
    </div>
  );
}
