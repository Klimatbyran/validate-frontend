import { cn } from "@/lib/utils";

export interface ViewModeOption<T extends string = string> {
  value: T;
  label: string;
}

interface ViewModePillsProps<T extends string = string> {
  options: ViewModeOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  /** Optional. Applied to the pill group container. */
  className?: string;
  /** Optional. Return extra or override classes for each button. */
  getButtonClassName?: (value: T, isActive: boolean) => string;
  ariaLabel?: string;
}

const defaultContainerClass =
  "flex rounded-full overflow-hidden border border-gray-02/20 bg-gray-04/50 p-1";
const defaultActiveClass = "bg-gray-01 text-gray-05 shadow-sm";
const defaultInactiveClass = "text-gray-02 hover:text-gray-01";

export function ViewModePills<T extends string = string>({
  options,
  value,
  onValueChange,
  className,
  getButtonClassName,
  ariaLabel = "View mode",
}: ViewModePillsProps<T>) {
  return (
    <div
      className={cn(defaultContainerClass, className)}
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onValueChange(option.value)}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-full transition-all",
              isActive ? defaultActiveClass : defaultInactiveClass,
              getButtonClassName?.(option.value, isActive)
            )}
            aria-pressed={isActive}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
