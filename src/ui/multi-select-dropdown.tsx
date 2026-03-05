/**
 * Reusable multi-select dropdown: trigger button + panel with optional loading/empty
 * and a list of options with checkbox-style selection.
 * Options are string IDs; display label is the option value unless getOptionLabel is provided.
 */

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { Button } from "@/ui/button";
import { cn } from "@/lib/utils";

export interface MultiSelectDropdownProps {
  /** Option IDs (and default display labels) */
  options: string[];
  /** Currently selected option IDs */
  selectedIds: string[];
  /** Called when selection changes */
  onChange: (ids: string[]) => void;
  /** Label on the trigger button */
  triggerLabel: string;
  /** Optional label for listbox (accessibility) */
  ariaLabel?: string;
  /** Show loading state in the panel */
  loading?: boolean;
  /** Text shown when loading (e.g. "Loading…") */
  loadingLabel?: string;
  /** Text shown when options list is empty */
  emptyLabel?: string;
  /** Optional: custom display label per option (default: option id) */
  getOptionLabel?: (optionId: string) => string;
  /** Optional class for the trigger button */
  triggerClassName?: string;
  /** Optional class for the dropdown panel */
  panelClassName?: string;
  /** Min width of dropdown panel (default 220) */
  panelMinWidth?: number;
  /** Max height of dropdown panel (default 280) */
  panelMaxHeight?: number;
}

export function MultiSelectDropdown({
  options,
  selectedIds,
  onChange,
  triggerLabel,
  ariaLabel,
  loading = false,
  loadingLabel,
  emptyLabel,
  getOptionLabel,
  triggerClassName,
  panelClassName,
  panelMinWidth = 220,
  panelMaxHeight = 280,
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!ref.current?.contains(document.activeElement)) return;
      const panel = panelRef.current;
      const buttons = panel
        ? Array.from(panel.querySelectorAll<HTMLButtonElement>('button[role="option"]'))
        : [];
      const currentIndex = buttons.indexOf(document.activeElement as HTMLButtonElement);

      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = currentIndex < 0 ? 0 : Math.min(currentIndex + 1, buttons.length - 1);
        buttons[next]?.focus();
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = currentIndex <= 0 ? buttons.length - 1 : currentIndex - 1;
        buttons[prev]?.focus();
        return;
      }
      if (e.key === "Enter" && currentIndex >= 0 && buttons[currentIndex]) {
        e.preventDefault();
        buttons[currentIndex].click();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const toggle = (optionId: string) => {
    const next = selectedIds.includes(optionId)
      ? selectedIds.filter((id) => id !== optionId)
      : [...selectedIds, optionId];
    onChange(next);
  };

  const label = (id: string) => (getOptionLabel ? getOptionLabel(id) : id);
  const hasSelection = selectedIds.length > 0;

  return (
    <div className="relative shrink-0" ref={ref}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(!open)}
        className={cn(
          "!w-auto !min-w-0 h-9 px-4 text-sm rounded-md border border-gray-03 bg-gray-05 text-gray-01 hover:bg-gray-03/40 flex items-center gap-2",
          hasSelection && "border-blue-03 bg-blue-03/10 text-blue-03",
          triggerClassName
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel ?? triggerLabel}
      >
        <span className="whitespace-nowrap">{triggerLabel}</span>
        <ChevronDown className="w-4 h-4 shrink-0 text-gray-02" />
        {hasSelection && (
          <span className="ml-1 px-2 py-0.5 rounded-full bg-gray-03/50 text-xs font-medium">
            {selectedIds.length}
          </span>
        )}
      </Button>
      {open && (
        <div
          ref={panelRef}
          className={cn(
            "absolute left-0 top-full mt-1.5 z-[100] bg-gray-04 border border-gray-03 rounded-md shadow-md p-1.5 overflow-y-auto",
            panelClassName
          )}
          style={{
            minWidth: panelMinWidth,
            maxHeight: panelMaxHeight,
          }}
          role="listbox"
          aria-multiselectable="true"
          aria-label={ariaLabel ?? triggerLabel}
        >
          <div className="text-xs font-semibold text-gray-02 mb-2 px-2">
            {triggerLabel}
          </div>
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
          {options.length > 0 &&
            options.map((optionId) => {
              const isSelected = selectedIds.includes(optionId);
              return (
                <button
                  key={optionId}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => toggle(optionId)}
                  className="w-full text-left px-3 py-2 rounded text-sm transition-colors flex items-center gap-2 hover:bg-gray-03/50 text-gray-01"
                >
                  <span
                    className={cn(
                      "flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center",
                      isSelected ? "bg-blue-03 border-blue-03" : "border-gray-03"
                    )}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </span>
                  <span className="truncate">{label(optionId)}</span>
                </button>
              );
            })}
          {!loading && options.length === 0 && (
            <p className="px-3 py-2 text-sm text-gray-02">
              {emptyLabel ?? "No options"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
