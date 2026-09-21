import {
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

const DEFAULT_RIGHT_PERCENT = 46;
const MIN_RIGHT_PERCENT = 28;
const MAX_RIGHT_PERCENT = 72;

function clampRightPercent(percent: number): number {
  return Math.min(MAX_RIGHT_PERCENT, Math.max(MIN_RIGHT_PERCENT, percent));
}

/** Side-by-side panes with a draggable vertical divider. `rightPercent` is
 * the right pane's share of the row (commitments | PDF). */
export function ResizableSplitView({
  left,
  right,
  defaultRightPercent = DEFAULT_RIGHT_PERCENT,
  className,
}: {
  left: ReactNode;
  right: ReactNode;
  defaultRightPercent?: number;
  className?: string;
}) {
  const [rightPercent, setRightPercent] = useState(() =>
    clampRightPercent(defaultRightPercent),
  );
  const [isDragging, setIsDragging] = useState(false);
  const splitRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ clientX: number; rightPercent: number } | null>(
    null,
  );

  function beginDrag(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    dragStartRef.current = {
      clientX: event.clientX,
      rightPercent,
    };
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const dragStart = dragStartRef.current;
    const split = splitRef.current;
    if (!dragStart || !split) return;

    const width = split.getBoundingClientRect().width;
    if (width <= 0) return;

    // Handle moves right → right pane shrinks; left → right pane grows.
    const deltaPercent = ((event.clientX - dragStart.clientX) / width) * 100;
    setRightPercent(clampRightPercent(dragStart.rightPercent - deltaPercent));
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    dragStartRef.current = null;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function nudgeFromKeyboard(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setRightPercent((percent) => clampRightPercent(percent + 2));
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      setRightPercent((percent) => clampRightPercent(percent - 2));
    }
  }

  return (
    <div
      ref={splitRef}
      className={cn("flex min-h-0", isDragging && "select-none", className)}
    >
      <div
        className="min-w-0 overflow-x-hidden overflow-y-auto lg:pr-1"
        style={{ width: `${100 - rightPercent}%` }}
      >
        {left}
      </div>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize PDF panel"
        aria-valuenow={Math.round(rightPercent)}
        aria-valuemin={MIN_RIGHT_PERCENT}
        aria-valuemax={MAX_RIGHT_PERCENT}
        tabIndex={0}
        onPointerDown={beginDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={nudgeFromKeyboard}
        title="Drag to resize"
        className={cn(
          "group relative w-3 shrink-0 cursor-col-resize touch-none",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-03",
        )}
      >
        <div
          className={cn(
            "absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-gray-03 transition-colors",
            "group-hover:bg-blue-03 group-focus-visible:bg-blue-03",
            isDragging && "bg-blue-03",
          )}
        />
      </div>

      <div
        className="flex h-full min-h-0 min-w-0 shrink-0 flex-col overflow-hidden border-l border-gray-03 pl-2"
        style={{ width: `${rightPercent}%` }}
      >
        {right}
      </div>
    </div>
  );
}
