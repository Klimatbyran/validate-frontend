import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/ui/dialog";

type ModalSize = "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "6xl" | "full";

const sizeClass: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "6xl": "max-w-6xl",
  // For content that needs real width to be useful (e.g. a commitments
  // list next to a side-by-side PDF panel) — wider than any fixed rem
  // size so it scales with the viewport instead of capping out on large
  // monitors.
  full: "max-w-[96vw]",
};

interface ModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: ModalSize;
  scrollable?: boolean;
  /**
   * Force a fixed-height flex column (like `size="full"`) so children can
   * use `flex-1` + internal scroll — e.g. review mode's sticky dock.
   */
  fillHeight?: boolean;
  /**
   * Rendered visually outside the dialog card (left/right), but still
   * inside DialogContent so focus trap / outside-click keep working.
   */
  sideNav?: {
    left?: React.ReactNode;
    right?: React.ReactNode;
  };
}

export function Modal({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  footer,
  size = "3xl",
  scrollable = false,
  fillHeight: fillHeightProp,
  sideNav,
}: ModalProps) {
  const dialogProps = open !== undefined ? { open, onOpenChange } : {};
  // "full" size is only ever used for content that needs to consume real
  // vertical space (currently just the split-view PDF panel) — a plain
  // grid with no height cap let the header's own height (which varies:
  // run timing, error text, past-run list, QA disclaimer) push the total
  // past the viewport on short screens, since there was nothing to
  // measure it against. Capping height and switching to a flex column
  // lets the header take whatever it needs and the content area fill
  // whatever's left, instead of a hardcoded height guessing where the
  // header ends.
  const fillHeight = fillHeightProp ?? size === "full";
  const hasSideNav = Boolean(sideNav?.left || sideNav?.right);
  // Side arrows sit outside the card via absolute offsets, so the shell
  // needs overflow-visible — but DialogContent defaults to `grid`, and a
  // grid + max-height + overflow-visible combination lets min-content
  // defeat the height cap (modal grows taller than the viewport, then
  // translateY(-50%) parks most of it off-screen). Force flex whenever
  // we need a capped height so the box stays 90vh and only paints arrows
  // outside.
  const cappedHeight = fillHeight || scrollable;

  return (
    <Dialog {...dialogProps}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        className={cn(
          sizeClass[size],
          // Outside arrows need a horizontal gutter for every size, not just
          // full — 6xl review/list can still fill a mid-width viewport and
          // clip the prev/next controls without this.
          hasSideNav &&
            (size === "full"
              ? "max-w-[calc(100vw-7.5rem)]"
              : "max-w-[min(72rem,calc(100vw-7.5rem))]"),
          cappedHeight && "flex min-h-0 flex-col",
          scrollable && "max-h-[90vh]",
          fillHeight && "h-[90vh]",
          // Arrows paint outside; body scroll lives on the inner wrapper.
          // Do NOT add `relative` here — DialogContent is already `fixed`,
          // and twMerge would replace `fixed` with `relative`, dropping the
          // modal out of the viewport into document flow.
          hasSideNav && cappedHeight && "overflow-visible",
          !hasSideNav && scrollable && "overflow-auto",
          !hasSideNav && fillHeight && "overflow-hidden",
        )}
      >
        {sideNav?.left ? (
          <div className="absolute top-1/2 left-0 z-[60] -translate-x-[calc(100%+0.75rem)] -translate-y-1/2">
            {sideNav.left}
          </div>
        ) : null}
        {sideNav?.right ? (
          <div className="absolute top-1/2 right-0 z-[60] translate-x-[calc(100%+0.75rem)] -translate-y-1/2">
            {sideNav.right}
          </div>
        ) : null}
        {title || description ? (
          <DialogHeader className={cn(cappedHeight && "shrink-0")}>
            {title && <DialogTitle>{title}</DialogTitle>}
            {description && (
              <DialogDescription asChild={typeof description !== "string"}>
                {typeof description === "string" ? (
                  description
                ) : (
                  <div>{description}</div>
                )}
              </DialogDescription>
            )}
          </DialogHeader>
        ) : (
          // Radix requires a DialogTitle for every DialogContent for
          // screen-reader users, even when a caller renders its own title
          // elsewhere (the split-view PDF case puts one in the left pane
          // instead, so this dialog's header doesn't push the PDF pane
          // down) — sr-only keeps it out of the way visually.
          <DialogTitle className="sr-only">Dialog</DialogTitle>
        )}
        {hasSideNav && cappedHeight ? (
          <div
            className={cn(
              "flex min-h-0 flex-1 flex-col",
              fillHeight ? "overflow-hidden" : "overflow-auto",
            )}
          >
            {children}
          </div>
        ) : fillHeight ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {children}
          </div>
        ) : (
          children
        )}
        {footer && (
          <DialogFooter className={cn(cappedHeight && "shrink-0")}>
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
