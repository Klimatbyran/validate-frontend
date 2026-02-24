import { ArrowUpRight, GitBranch } from "lucide-react";
import { Callout } from "@/ui/callout";
import { useI18n } from "@/contexts/I18nContext";
import { QueueJob } from "@/lib/types";

interface JobRelationshipsSectionProps {
  job: QueueJob;
}

export function JobRelationshipsSection({ job }: JobRelationshipsSectionProps) {
  const { t } = useI18n();
  if (!job.parent) return null;

  return (
    <Callout variant="info" title={t("jobstatus.jobdetails.jobRelationships")} icon={<GitBranch className="w-5 h-5" />}>
      <div className="space-y-3">
        <div className="flex items-center space-x-2 text-blue-03">
          <ArrowUpRight className="w-5 h-4" />
          <span className="text-sm">{t("jobstatus.jobdetails.parent")}:</span>
          <code className="bg-blue-03/20 px-2 py-1 rounded text-sm">
            {job.parent.queue}:{job.parent.id}
          </code>
        </div>
      </div>
    </Callout>
  );
}
