/**
 * GICS sub-industry picker with a lightweight “tree” presentation:
 * Sector → Group → Industry → Sub-industry (selectable)
 *
 * Values are always the `code` string (sub-industry code).
 */

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/button";

export type GicsTreeOption = {
  code: string;
  label?: string;
  subIndustryName?: string;
  sector?: string;
  group?: string;
  industry?: string;
};

type Row =
  | { kind: "heading"; key: string; depth: number; label: string }
  | {
      kind: "option";
      key: string;
      depth: number;
      value: string;
      label: string;
    };

function optionLabel(opt: GicsTreeOption): string {
  return opt.label ?? opt.subIndustryName ?? opt.code;
}

function sortText(a: string, b: string) {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

function buildRows(options: GicsTreeOption[], query: string): Row[] {
  const q = query.trim().toLowerCase();
  const matches = (opt: GicsTreeOption) => {
    if (!q) return true;
    const parts = [
      opt.code,
      optionLabel(opt),
      opt.sector ?? "",
      opt.group ?? "",
      opt.industry ?? "",
    ]
      .join(" ")
      .toLowerCase();
    return parts.includes(q);
  };

  const filtered = options.filter(matches);

  const bySector = new Map<string, GicsTreeOption[]>();
  for (const opt of filtered) {
    const sector = (opt.sector ?? "").trim() || "—";
    const list = bySector.get(sector) ?? [];
    list.push(opt);
    bySector.set(sector, list);
  }

  const rows: Row[] = [];
  const sectors = Array.from(bySector.keys()).sort(sortText);
  for (const sector of sectors) {
    rows.push({
      kind: "heading",
      key: `sector:${sector}`,
      depth: 0,
      label: sector,
    });

    const sectorOpts = bySector.get(sector) ?? [];
    const byGroup = new Map<string, GicsTreeOption[]>();
    for (const opt of sectorOpts) {
      const group = (opt.group ?? "").trim() || "—";
      const list = byGroup.get(group) ?? [];
      list.push(opt);
      byGroup.set(group, list);
    }

    const groups = Array.from(byGroup.keys()).sort(sortText);
    for (const group of groups) {
      rows.push({
        kind: "heading",
        key: `group:${sector}:${group}`,
        depth: 1,
        label: group,
      });

      const groupOpts = byGroup.get(group) ?? [];
      const byIndustry = new Map<string, GicsTreeOption[]>();
      for (const opt of groupOpts) {
        const industry = (opt.industry ?? "").trim() || "—";
        const list = byIndustry.get(industry) ?? [];
        list.push(opt);
        byIndustry.set(industry, list);
      }

      const industries = Array.from(byIndustry.keys()).sort(sortText);
      for (const industry of industries) {
        rows.push({
          kind: "heading",
          key: `industry:${sector}:${group}:${industry}`,
          depth: 2,
          label: industry,
        });

        const industryOpts = (byIndustry.get(industry) ?? [])
          .slice()
          .sort((a, b) => sortText(optionLabel(a), optionLabel(b)));

        for (const opt of industryOpts) {
          rows.push({
            kind: "option",
            key: `opt:${opt.code}`,
            depth: 3,
            value: opt.code,
            label: `${optionLabel(opt)} (${opt.code})`,
          });
        }
      }
    }
  }

  return rows;
}

export function GicsTreeSelect({
  options,
  value,
  onChange,
  placeholder,
  loading = false,
  loadingLabel,
  emptyLabel,
  searchPlaceholder,
  ariaLabel,
  triggerClassName,
  panelMinWidth = 280,
  panelMaxHeight = 360,
}: {
  options: GicsTreeOption[];
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  loading?: boolean;
  loadingLabel?: string;
  emptyLabel: string;
  searchPlaceholder: string;
  ariaLabel?: string;
  triggerClassName?: string;
  panelMinWidth?: number;
  panelMaxHeight?: number;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelPosition, setPanelPosition] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedInWrapper = wrapperRef.current?.contains(target);
      const clickedInPanel = panelRef.current?.contains(target);
      if (!clickedInWrapper && !clickedInPanel) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!wrapperRef.current?.contains(document.activeElement)) return;
      const panel = panelRef.current;
      const buttons = panel
        ? Array.from(
            panel.querySelectorAll<HTMLButtonElement>('button[role="option"]'),
          )
        : [];
      const currentIndex = buttons.indexOf(
        document.activeElement as HTMLButtonElement,
      );

      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next =
          currentIndex < 0 ? 0 : Math.min(currentIndex + 1, buttons.length - 1);
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

  useLayoutEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const triggerEl = triggerRef.current;
      if (!triggerEl) return;
      const rect = triggerEl.getBoundingClientRect();
      const offset = 6;
      const viewportH = window.innerHeight || 0;
      const availableBelow = Math.max(0, viewportH - rect.bottom - offset);
      const availableAbove = Math.max(0, rect.top - offset);

      const desiredMax = panelMaxHeight;
      // Flip above if below space is tight and above is better.
      const placeAbove =
        availableBelow < 200 && availableAbove > availableBelow;
      const maxHeight = Math.max(
        160,
        Math.min(desiredMax, placeAbove ? availableAbove : availableBelow),
      );

      const top = placeAbove
        ? rect.top - offset - maxHeight
        : rect.bottom + offset;
      setPanelPosition({ top, left: rect.left, width: rect.width, maxHeight });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  const selected = useMemo(
    () => options.find((o) => o.code === value) ?? null,
    [options, value],
  );
  const triggerDisplay = selected
    ? `${optionLabel(selected)} (${selected.code})`
    : placeholder;

  const rows = useMemo(
    () => (loading ? [] : buildRows(options, query)),
    [loading, options, query],
  );
  const hasAnyOptions = options.length > 0;
  const hasAnyRows = rows.some((r) => r.kind === "option");

  const select = (next: string) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <div className="relative shrink-0" ref={wrapperRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setOpen((o) => !o);
          if (!open) setQuery("");
        }}
        ref={triggerRef}
        className={cn(
          "!w-auto !min-w-0 h-9 px-4 text-sm rounded-md border border-gray-03 bg-gray-05 text-gray-01 hover:bg-gray-03/40 flex items-center gap-2",
          triggerClassName,
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel ?? placeholder}
      >
        <span className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap">
          {triggerDisplay}
        </span>
        <ChevronDown className="w-4 h-4 shrink-0 text-gray-02" />
      </Button>

      {open && panelPosition && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={panelRef}
              className="z-[99999] bg-gray-04 border border-gray-03 rounded-md shadow-md p-1.5 overflow-y-auto"
              style={{
                position: "fixed",
                top: panelPosition.top,
                left: panelPosition.left,
                width: Math.max(panelMinWidth, panelPosition.width),
                maxHeight: panelPosition.maxHeight,
              }}
              role="listbox"
              aria-label={ariaLabel ?? placeholder}
            >
              <div className="p-1.5">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full px-2 py-1.5 rounded-md border border-gray-03 bg-gray-05 text-gray-01 text-xs focus:outline-none focus:ring-2 focus:ring-blue-03"
                />
              </div>

              {loading ? (
                <div
                  className="w-full text-left px-3 py-2 rounded text-sm text-gray-02 cursor-default"
                  role="option"
                  aria-disabled="true"
                  aria-live="polite"
                >
                  {loadingLabel ?? "Loading…"}
                </div>
              ) : !hasAnyOptions || !hasAnyRows ? (
                <div
                  className="w-full text-left px-3 py-2 rounded text-sm text-gray-02 cursor-default"
                  role="option"
                  aria-disabled="true"
                >
                  {emptyLabel}
                </div>
              ) : (
                rows.map((row) => {
                  if (row.kind === "heading") {
                    return (
                      <div
                        key={row.key}
                        className={cn(
                          "px-3 py-1 text-[11px] font-semibold text-gray-02 uppercase tracking-wider",
                        )}
                        style={{ paddingLeft: 12 + row.depth * 12 }}
                        aria-hidden
                      >
                        {row.label}
                      </div>
                    );
                  }

                  const isSelected = row.value === value;
                  return (
                    <button
                      key={row.key}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => select(row.value)}
                      className="w-full text-left px-3 py-2 rounded text-sm transition-colors flex items-center gap-2 hover:bg-gray-03/50 text-gray-01"
                      style={{ paddingLeft: 12 + row.depth * 12 }}
                    >
                      <span
                        className={cn(
                          "flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center",
                          isSelected
                            ? "border-blue-03 bg-blue-03"
                            : "border-gray-03",
                        )}
                        aria-hidden
                      >
                        {isSelected ? (
                          <Check className="w-3.5 h-3.5 text-white" />
                        ) : null}
                      </span>
                      <span className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap">
                        {row.label}
                      </span>
                    </button>
                  );
                })
              )}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
