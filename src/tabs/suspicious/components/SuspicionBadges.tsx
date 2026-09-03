import { useI18n } from "@/contexts/I18nContext";
import { cn } from "@/lib/utils";
import type {
  SuspicionOrigin,
  SuspicionRuleId,
  SuspicionSeverity,
} from "../types";
import {
  ORIGIN_BADGE_CLASS,
  SEVERITY_BADGE_CLASS,
  originLabelKey,
  ruleLabelKey,
  severityLabelKey,
} from "../lib/finding-display";

const badgeClass =
  "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap";

export function SeverityBadge({ severity }: { severity: SuspicionSeverity }) {
  const { t } = useI18n();
  return (
    <span className={cn(badgeClass, SEVERITY_BADGE_CLASS[severity])}>
      {t(severityLabelKey(severity))}
    </span>
  );
}

export function OriginBadge({ origin }: { origin: SuspicionOrigin }) {
  const { t } = useI18n();
  return (
    <span className={cn(badgeClass, ORIGIN_BADGE_CLASS[origin])}>
      {t(originLabelKey(origin))}
    </span>
  );
}

export function RuleBadge({ rule }: { rule: SuspicionRuleId }) {
  const { t } = useI18n();
  return (
    <span className="inline-flex items-center rounded-full border border-gray-02/20 bg-gray-03/40 px-2 py-0.5 text-[11px] text-gray-01 whitespace-nowrap">
      {t(ruleLabelKey(rule))}
    </span>
  );
}
