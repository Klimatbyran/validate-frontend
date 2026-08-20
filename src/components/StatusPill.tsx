import { getCompactStyles, getStatusIcon } from "@/lib/status-config";
import type { SwimlaneStatusType } from "@/lib/types";

export interface StatusPillProps {
  label: string;
  status: SwimlaneStatusType;
  /** Currently running right now (adds pulse ring + spin icon). */
  isActive?: boolean;
  /** False renders the subdued "never ran" style regardless of status. */
  jobExists?: boolean;
  /** Orange corner flag — this step has run more than once. */
  isRerun?: boolean;
  onClick?: () => void;
}

/**
 * The compact step/queue pill used throughout the swimlane views. Shared by
 * Jobbstatus's YearStepGrid and the Climate Pipeline tab so both stay
 * visually identical — same STATUS_CONFIG colors/icons from status-config.
 */
export function StatusPill({
  label,
  status,
  isActive,
  jobExists,
  isRerun,
  onClick,
}: StatusPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        relative px-2 py-1 rounded border text-[10px] font-medium
        hover:shadow-sm hover:scale-105 transition-all
        ${getCompactStyles(status, isActive, jobExists)}
      `}
    >
      {isRerun && (
        <span className="pointer-events-none absolute top-0 right-0 w-0 h-0 border-t-[10px] border-t-orange-03 border-l-[10px] border-l-transparent" />
      )}
      <span className="flex items-center gap-1">
        <span className={isActive ? "inline-block animate-spin-slow" : ""}>
          {getStatusIcon(status, "compact", isActive)}
        </span>
        <span>{label}</span>
      </span>
    </button>
  );
}
