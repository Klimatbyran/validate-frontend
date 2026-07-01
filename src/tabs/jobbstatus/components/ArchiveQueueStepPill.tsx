import type { SwimlaneStatusType } from "@/lib/types";
import { getStatusIcon } from "@/lib/status-config";
import { cn } from "@/lib/utils";

const pillClass =
  "relative px-2 py-1 rounded border text-[10px] font-medium hover:shadow-sm hover:scale-105 transition-all";

type ArchiveQueueStepPillProps = {
  swim: SwimlaneStatusType;
  fieldName: string;
  compactStyleClass: string;
  multiAttempt: boolean;
  titleHint?: string;
  ariaLabel: string;
  onOpenAttempts: () => void;
};

export function ArchiveQueueStepPill({
  swim,
  fieldName,
  compactStyleClass,
  multiAttempt,
  titleHint,
  ariaLabel,
  onOpenAttempts,
}: ArchiveQueueStepPillProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpenAttempts();
      }}
      className={cn(pillClass, compactStyleClass)}
      title={titleHint}
      aria-label={ariaLabel}
    >
      {multiAttempt ? (
        <span className="pointer-events-none absolute top-0 right-0 w-0 h-0 border-t-[10px] border-t-orange-03 border-l-[10px] border-l-transparent" />
      ) : null}
      <span className="flex items-center gap-1">
        <span>{getStatusIcon(swim, "compact", false)}</span>
        <span>{fieldName}</span>
      </span>
    </button>
  );
}
