import { ArrowUpRight, GitBranch } from "lucide-react";
import { QueueJob } from "@/lib/types";

interface JobRelationshipsSectionProps {
  job: QueueJob;
}

export function JobRelationshipsSection({ job }: JobRelationshipsSectionProps) {
  const hasParent = !!job.parent;

  if (!hasParent || !job.parent) return null;

  return (
    <div className="bg-blue-03/10 rounded-lg p-4">
      <h3 className="text-lg font-medium text-blue-03 mb-4 flex items-center">
        <GitBranch className="w-5 h-5 mr-2" />
        Jobbrelationer
      </h3>
      <div className="space-y-3">
        <div className="flex items-center space-x-2 text-blue-03">
          <ArrowUpRight className="w-5 h-4" />
          <span className="text-sm">Förälder:</span>
          <code className="bg-blue-03/20 px-2 py-1 rounded text-sm">
            {job.parent.queue}:{job.parent.id}
          </code>
        </div>
      </div>
    </div>
  );
}
