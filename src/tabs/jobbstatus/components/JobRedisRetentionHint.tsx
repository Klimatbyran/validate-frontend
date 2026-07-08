import { Clock } from "lucide-react";
import type { QueueJob } from "@/lib/types";
import { Callout } from "@/ui/callout";
import { useI18n } from "@/contexts/I18nContext";
import {
  PIPELINE_REDIS_RUNS_PER_COMPANY,
  isPipelineJobLikelyInRedisLiveState,
} from "@/lib/pipeline-job-redis-ttl";

interface JobRedisRetentionHintProps {
  job: QueueJob;
}

/**
 * Explains count-based Redis retention for live Jobbstatus jobs.
 * Not shown for archive-only views.
 */
export function JobRedisRetentionHint({ job }: JobRedisRetentionHintProps) {
  const { t } = useI18n();

  if (isPipelineJobLikelyInRedisLiveState(job)) {
    return (
      <Callout
        variant="info"
        title={t("jobstatus.jobdetails.redisRetentionLiveTitle")}
        description={t("jobstatus.jobdetails.redisRetentionLiveBody", {
          count: PIPELINE_REDIS_RUNS_PER_COMPANY,
        })}
        icon={<Clock className="w-5 h-5" />}
      />
    );
  }

  return (
    <Callout
      variant="info"
      title={t("jobstatus.jobdetails.redisRetentionTerminalTitle")}
      description={t("jobstatus.jobdetails.redisRetentionTerminalBody", {
        count: PIPELINE_REDIS_RUNS_PER_COMPANY,
      })}
      icon={<Clock className="w-5 h-5" />}
    />
  );
}
