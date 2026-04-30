/**
 * Human-readable approximate time until Redis purge, for Jobbstatus job details copy.
 * Uses the same thresholds as the previous numeric formatter; strings come from i18n.
 */
export function formatRedisRetentionApproxDuration(
  ms: number,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  const days = ms / (24 * 60 * 60 * 1000);
  if (days >= 2) {
    return t("jobstatus.jobdetails.redisRetentionApproxDays", {
      count: Math.round(days),
    });
  }
  if (days >= 1) {
    return t("jobstatus.jobdetails.redisRetentionApproxAboutOneDay");
  }
  const hours = ms / (60 * 60 * 1000);
  if (hours >= 2) {
    return t("jobstatus.jobdetails.redisRetentionApproxHours", {
      count: Math.round(hours),
    });
  }
  if (hours >= 1) {
    return t("jobstatus.jobdetails.redisRetentionApproxAboutOneHour");
  }
  const mins = Math.max(1, Math.round(ms / (60 * 1000)));
  return t("jobstatus.jobdetails.redisRetentionApproxMinutes", { count: mins });
}
