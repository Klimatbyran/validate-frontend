import { useEffect, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/ui/button";
import { cn } from "@/lib/utils";

interface StepReviewModeProps {
  prompt: string;
  itemCount: number;
  index: number;
  onIndexChange: (index: number) => void;
  children: ReactNode;
  /** Sticky bottom action bar (approve / flag / suggest). */
  footer?: ReactNode;
  /** Compact context above the prompt, e.g. theme name. */
  contextLabel?: string;
  /** Optional within-item progress, e.g. "2 of 5 in this theme". */
  subProgress?: string;
  emptyMessage?: string;
  className?: string;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

export function StepReviewMode({
  prompt,
  itemCount,
  index,
  onIndexChange,
  children,
  footer,
  contextLabel,
  subProgress,
  emptyMessage = "No items match this filter.",
  className,
}: StepReviewModeProps) {
  const hasItems = itemCount > 0;
  const safeIndex = hasItems ? Math.min(Math.max(index, 0), itemCount - 1) : 0;
  const canGoBack = hasItems && safeIndex > 0;
  const canGoNext = hasItems && safeIndex < itemCount - 1;

  useEffect(() => {
    if (!hasItems) return;
    if (index !== safeIndex) onIndexChange(safeIndex);
  }, [hasItems, index, safeIndex, onIndexChange]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      if (event.altKey || event.metaKey || event.ctrlKey) return;
      if (event.key === "ArrowLeft" && canGoBack) {
        event.preventDefault();
        onIndexChange(safeIndex - 1);
      } else if (event.key === "ArrowRight" && canGoNext) {
        event.preventDefault();
        onIndexChange(safeIndex + 1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canGoBack, canGoNext, onIndexChange, safeIndex]);

  if (!hasItems) {
    return (
      <div
        className={cn(
          "flex min-h-[20rem] flex-col rounded-xl border border-gray-03/60 bg-gray-04/40",
          className,
        )}
      >
        <div className="space-y-2 border-b border-gray-03/50 px-4 py-3">
          <p className="text-sm text-blue-03">{prompt}</p>
          <p className="text-sm text-gray-02">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-03/70 bg-gray-04/30",
        className,
      )}
    >
      <header className="shrink-0 border-b border-gray-03/60 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            {contextLabel ? (
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-03">
                {contextLabel}
              </p>
            ) : null}
            <p className="text-sm font-medium leading-snug text-gray-01">
              {prompt}
            </p>
            {subProgress ? (
              <p className="text-xs text-gray-02">{subProgress}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0"
              disabled={!canGoBack}
              aria-label="Previous item"
              onClick={() => onIndexChange(safeIndex - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[4.5rem] text-center text-xs tabular-nums text-gray-02">
              {safeIndex + 1} / {itemCount}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0"
              disabled={!canGoNext}
              aria-label="Next item"
              onClick={() => onIndexChange(safeIndex + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>

      {footer ? (
        <footer className="shrink-0 border-t border-gray-03/70 bg-gray-04/95 px-3 py-3 backdrop-blur">
          {footer}
        </footer>
      ) : null}
    </div>
  );
}
