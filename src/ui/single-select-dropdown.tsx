/**
 * Reusable single-select dropdown: trigger button + panel with optional loading/empty
 * and a list of options. Styling aligned with search/input fields (rounded-md, neutral).
 */

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { Button } from "@/ui/button";
import { cn } from "@/lib/utils";

export interface SingleSelectDropdownProps {
  /** Option values */
  options: string[];
  /** Currently selected value (empty string = none) */
  value: string;
  /** Called when selection changes */
  onChange: (value: string) => void;
  /** Shown on trigger when value is empty or not in options */
  placeholder?: string;
  /** Optional label for listbox (accessibility) */
  ariaLabel?: string;
  /** Show loading state in the panel */
  loading?: boolean;
  /** Text shown when loading (e.g. "Loading…") */
  loadingLabel?: string;
  /** Text shown when options list is empty */
  emptyLabel?: string;
  /** Optional: custom display label per option (default: option value) */
  getOptionLabel?: (value: string) => string;
  /** Optional class for the trigger button */
  triggerClassName?: string;
  /** Optional class for the dropdown panel */
  panelClassName?: string;
  /** Min width of dropdown panel (default 220) */
  panelMinWidth?: number;
  /** Max height of dropdown panel (default 280) */
  panelMaxHeight?: number;
}

export function SingleSelectDropdown({
  options,
  value,
  onChange,
  placeholder,
  ariaLabel,
  loading = false,
  loadingLabel,
  emptyLabel,
  getOptionLabel,
  triggerClassName,
  panelClassName,
  panelMinWidth = 220,
  panelMaxHeight = 280,
}: SingleSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const select = (optionValue: string) => {
    onChange(optionValue);
    setOpen(false);
  };

  const label = (v: string) => (getOptionLabel ? getOptionLabel(v) : v);
  const hasValue = value !== "" && options.includes(value);
  const triggerDisplay = hasValue ? label(value) : placeholder ?? "Select…";

  const showOptions = options.length > 0;
  const showEmpty = !showOptions && !loading;

  return (
    <div className="relative shrink-0" ref={ref}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(!open)}
        className={cn(
          "!w-auto !min-w-0 h-9 px-4 text-sm rounded-md border border-gray-03 bg-gray-05 text-gray-01 hover:bg-gray-03/40 flex items-center gap-2",
          triggerClassName
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel ?? placeholder ?? "Select"}
      >
        <span className="whitespace-nowrap truncate max-w-[200px]">
          {triggerDisplay}
        </span>
        <ChevronDown className="w-4 h-4 shrink-0 text-gray-02" />
      </Button>
      {open && (
        <div
          className={cn(
            "absolute left-0 top-full mt-1.5 z-[100] bg-gray-04 border border-gray-03 rounded-md shadow-md p-1.5 overflow-y-auto",
            panelClassName
          )}
          style={{
            minWidth: panelMinWidth,
            maxHeight: panelMaxHeight,
          }}
          role="listbox"
          aria-label={ariaLabel ?? placeholder ?? "Select"}
        >
          {loading && (
            <div
              className="w-full text-left px-3 py-2 rounded text-sm text-gray-02 flex items-center gap-2 cursor-default"
              role="option"
              aria-disabled="true"
              aria-live="polite"
            >
              <span
                className="flex-shrink-0 w-4 h-4 rounded border border-gray-03"
                aria-hidden
              />
              <span className="truncate">{loadingLabel ?? "Loading…"}</span>
            </div>
          )}
          {showOptions &&
            options.map((optionValue) => {
              const isSelected = value === optionValue;
              return (
                <button
                  key={optionValue}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => select(optionValue)}
                  className="w-full text-left px-3 py-2 rounded text-sm transition-colors flex items-center gap-2 hover:bg-gray-03/50 text-gray-01"
                >
                  <span
                    className={cn(
                      "flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center",
                      isSelected
                        ? "bg-gray-01 border-gray-01"
                        : "border-gray-03"
                    )}
                  >
                    {isSelected && (
                      <Check className="w-3 h-3 text-gray-05" />
                    )}
                  </span>
                  <span className="truncate">{label(optionValue)}</span>
                </button>
              );
            })}
          {showEmpty && (
            <p className="px-3 py-2 text-sm text-gray-02">
              {emptyLabel ?? "No options"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
