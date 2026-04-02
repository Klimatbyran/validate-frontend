import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const variantClass = {
  sm: "h-8 w-8 [&_svg]:size-4",
  md: "h-9 w-9 [&_svg]:size-5",
} as const;

export type IconActionButtonVariant = keyof typeof variantClass;

/** Round icon-only control for dense editors (verify, undo, etc.). */
export function IconActionButton({
  variant = "sm",
  disabled,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: IconActionButtonVariant;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        "shrink-0 inline-flex items-center justify-center rounded-full",
        "hover:bg-gray-03/40",
        disabled && "cursor-default opacity-30 hover:bg-transparent",
        variantClass[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
