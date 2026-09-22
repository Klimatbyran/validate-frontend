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
  const fillHeight = size === "full";

  return (
    <Dialog {...dialogProps}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        className={cn(
          sizeClass[size],
          scrollable && "max-h-[90vh] overflow-auto",
          // h-[90vh], not max-h — max-height only caps a flex column, it
          // doesn't make it grow to fill available space in the first
          // place. Without a real height here, the flex-1 children below
          // (the split view, and the PDF panel inside it) had nothing to
          // distribute and just shrank to their content's natural size.
          fillHeight && "flex h-[90vh] flex-col overflow-hidden",
        )}
      >
        {title || description ? (
          <DialogHeader className={cn(fillHeight && "shrink-0")}>
            {title && <DialogTitle>{title}</DialogTitle>}
            {description && (
              <DialogDescription>{description}</DialogDescription>
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
        {fillHeight ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {children}
          </div>
        ) : (
          children
        )}
        {footer && (
          <DialogFooter className={cn(fillHeight && "shrink-0")}>
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
