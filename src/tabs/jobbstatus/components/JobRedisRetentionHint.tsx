import { Clock } from "lucide-react";
import type { QueueJob } from "@/lib/types";
import { Callout } from "@/ui/callout";
import { useI18n } from "@/contexts/I18nContext";
import {
  getEstimatedRedisPurgeRemainingMs,
  isPipelineJobLikelyInRedisLiveState,
} from "@/lib/pipeline-job-redis-ttl";
import { formatRedisRetentionApproxDuration } from "../lib/format-redis-retention-approx-duration";

interface JobRedisRetentionHintProps {
  job: QueueJob;
}

/**
 * Explains approximate rolling Redis retention (~7d) for live Jobbstatus jobs.
 * Not shown for archive-only views.
 */
export function JobRedisRetentionHint({ job }: JobRedisRetentionHintProps) {
  const { t } = useI18n();

  if (isPipelineJobLikelyInRedisLiveState(job)) {
    return (
      <Callout
        variant="info"
        title={t("jobstatus.jobdetails.redisRetentionLiveTitle")}
        description={t("jobstatus.jobdetails.redisRetentionLiveBody")}
        icon={<Clock className="w-5 h-5" />}
      />
    );
  }

  const remaining = getEstimatedRedisPurgeRemainingMs(job);
  if (remaining === null) return null;

  if (remaining === 0) {
    return (
      <Callout
        variant="info"
        title={t("jobstatus.jobdetails.redisRetentionPastTitle")}
        description={t("jobstatus.jobdetails.redisRetentionPastBody")}
        icon={<Clock className="w-5 h-5" />}
      />
    );
  }

  return (
    <Callout
      variant="info"
      title={t("jobstatus.jobdetails.redisRetentionRemainingTitle")}
      description={t("jobstatus.jobdetails.redisRetentionRemainingBody", {
        duration: formatRedisRetentionApproxDuration(remaining, t),
      })}
      icon={<Clock className="w-5 h-5" />}
    />
  );
}
