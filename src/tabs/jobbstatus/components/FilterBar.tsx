/**
 * Filter bar component for swimlane queue status
 * Handles filter UI, dropdown, run scope toggle, and rerun jobs
 */

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Filter,
  X,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RotateCw,
  MoreVertical,
  Search,
} from "lucide-react";
import { Button } from "@/ui/button";
import type { FilterType, RunScope } from "@/tabs/jobbstatus/lib/swimlane-filters";
import {
  PRIMARY_FILTER_CONFIG,
  SECONDARY_FILTER_CONFIG,
  type RerunWorker,
} from "@/tabs/jobbstatus/lib/filter-config";
import { FilterBarRerunSection } from "./FilterBarRerunSection";

interface FilterBarProps {
  activeFilters: Set<FilterType>;
  runScope: RunScope;
  filterCounts: Record<FilterType, number>;
  onToggleFilter: (filter: FilterType) => void;
  onClearFilters: () => void;
  onRunScopeChange: (scope: RunScope) => void;
  filteredCount: number;
  totalCount: number;
  onRerunByWorker: (worker: RerunWorker, limit: number | "all") => void;
  companySearchQuery?: string;
  onCompanySearchChange?: (query: string) => void;
}

const PRIMARY_FILTER_ICONS: Record<FilterType, React.ReactNode> = {
  pending_approval: <AlertTriangle className="w-4 h-4" />,
  has_failed: <XCircle className="w-4 h-4" />,
  has_processing: <RotateCw className="w-4 h-4" />,
  has_issues: <AlertTriangle className="w-4 h-4" />,
  fully_completed: <CheckCircle2 className="w-4 h-4" />,
  preprocessing_issues: <AlertTriangle className="w-4 h-4" />,
  data_extraction_issues: <AlertTriangle className="w-4 h-4" />,
  finalize_issues: <AlertTriangle className="w-4 h-4" />,
};

export function FilterBar({
  activeFilters,
  runScope,
  filterCounts,
  onToggleFilter,
  onClearFilters,
  onRunScopeChange,
  filteredCount,
  totalCount,
  onRerunByWorker,
  companySearchQuery = "",
  onCompanySearchChange,
}: FilterBarProps) {
  const hasActiveFiltersOrSearch =
    activeFilters.size > 0 || (companySearchQuery?.trim() ?? "") !== "";
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const primaryFilters = useMemo(
    () =>
      PRIMARY_FILTER_CONFIG.map((config) => ({
        ...config,
        icon: PRIMARY_FILTER_ICONS[config.id],
      })),
    []
  );
  const secondaryFilters = SECONDARY_FILTER_CONFIG;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowMoreFilters(false);
      }
    };

    if (showMoreFilters) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showMoreFilters]);

  return (
    <div className="bg-gray-04/50 rounded-lg p-4 border border-gray-03">
      <div className="flex flex-col gap-4">
        {/* Company search and Omfattning (scope) */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {onCompanySearchChange && (
            <div className="relative flex-1 min-w-0 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-02 pointer-events-none" />
              <input
                type="text"
                value={companySearchQuery}
                onChange={(e) => onCompanySearchChange(e.target.value)}
                placeholder="Sök på företagsnamn..."
                className="w-full pl-9 pr-8 py-2 rounded-md border border-gray-03 bg-gray-05 text-gray-01 text-sm placeholder:text-gray-02 focus:outline-none focus:ring-2 focus:ring-blue-03/50 focus:border-blue-03"
                aria-label="Sök företag"
              />
              {companySearchQuery && (
                <button
                  type="button"
                  onClick={() => onCompanySearchChange("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-02 hover:text-gray-01 rounded"
                  aria-label="Rensa sökning"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
          <div className="flex items-center gap-2 shrink-0 sm:ml-auto">
            <span className="text-sm text-gray-02">Omfattning:</span>
            <div className="flex items-center gap-1 bg-gray-03 rounded-full p-0.5">
              <button
                onClick={() => onRunScopeChange("latest")}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  runScope === "latest"
                    ? "bg-gray-01 text-gray-05"
                    : "text-gray-02 hover:text-gray-01"
                }`}
              >
                Senaste körning
              </button>
              <button
                onClick={() => onRunScopeChange("all")}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  runScope === "all"
                    ? "bg-gray-01 text-gray-05"
                    : "text-gray-02 hover:text-gray-01"
                }`}
              >
                Alla körningar
              </button>
            </div>
          </div>
        </div>

        {/* Filter label in line with filter buttons (same layout as "Kör specifika jobb") */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <Filter className="w-4 h-4 text-gray-02" />
            <span className="text-sm font-medium text-gray-01">Filter:</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {primaryFilters.map((filter) => {
              const isActive = activeFilters.has(filter.id);
              const count = filterCounts[filter.id];
              return (
                <Button
                  key={filter.id}
                  variant={isActive ? "primary" : "ghost"}
                  size="sm"
                  onClick={() => onToggleFilter(filter.id)}
                  className={`!w-auto !min-w-0 h-9 px-4 text-sm ${
                    isActive
                      ? filter.activeColor
                      : "border border-gray-03 text-gray-01 hover:bg-gray-03/40"
                  }`}
                >
                  {isActive && <X className="w-4 h-4 mr-1.5 shrink-0" />}
                  <span className="mr-1.5 shrink-0">{filter.icon}</span>
                  <span className="whitespace-nowrap">{filter.label}</span>
                  {count > 0 && (
                    <span
                      className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                        isActive
                          ? "bg-white/20 text-white"
                          : filter.badgeColorClass
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </Button>
              );
            })}

            {/* More Filters Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMoreFilters(!showMoreFilters)}
                className="!w-auto !min-w-0 h-9 px-4 text-sm border border-gray-03 text-gray-01 hover:bg-gray-03/40"
              >
              <MoreVertical className="w-4 h-4 mr-1.5" />
              Fler filter
              {activeFilters.size > 0 &&
                secondaryFilters.some((f) => activeFilters.has(f.id)) && (
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-03/20 text-blue-03 text-xs font-medium">
                    {
                      secondaryFilters.filter((f) => activeFilters.has(f.id))
                        .length
                    }
                  </span>
                )}
            </Button>

            {/* Dropdown Menu */}
            {showMoreFilters && (
              <div className="absolute left-0 top-full mt-2 z-50 bg-gray-04 border border-gray-03 rounded-lg shadow-lg p-2 min-w-[200px]">
                <div className="text-xs font-semibold text-gray-02 mb-2 px-2">
                  Ytterligare filter
                </div>
                {secondaryFilters.map((filter) => {
                  const isActive = activeFilters.has(filter.id);
                  const count = filterCounts[filter.id];
                  return (
                    <button
                      key={filter.id}
                      onClick={() => {
                        onToggleFilter(filter.id);
                      }}
                      className={`w-full text-left px-3 py-2 rounded text-sm transition-colors flex items-center justify-between ${
                        isActive
                          ? "bg-blue-03/20 text-blue-03"
                          : "text-gray-01 hover:bg-gray-03/50"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {isActive && (
                          <CheckCircle2 className="w-4 h-4 text-blue-03" />
                        )}
                        {filter.label}
                      </span>
                      {count > 0 && (
                        <span className="text-xs text-gray-02">{count}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

            {/* Clear Filters */}
            {hasActiveFiltersOrSearch && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                className="!w-auto !min-w-0 h-9 px-4 text-sm text-gray-02 hover:text-gray-01 hover:bg-gray-03/40"
              >
                <X className="w-4 h-4 mr-1.5" />
                Rensa filter
              </Button>
            )}
          </div>
        </div>

        {/* Filter Summary */}
        {hasActiveFiltersOrSearch && (
          <div className="text-sm text-gray-02 pt-2">
            Visar {filteredCount} av {totalCount} företag
          </div>
        )}

        <FilterBarRerunSection onRerunByWorker={onRerunByWorker} />
      </div>
    </div>
  );
}
