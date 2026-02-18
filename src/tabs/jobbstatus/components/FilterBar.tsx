/**
 * Filter bar component for swimlane queue status
 * Handles filter UI, dropdown, run scope toggle, and rerun jobs
 */

import React, { useState, useRef, useEffect } from "react";
import {
  Filter,
  X,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RotateCw,
  MoreVertical,
  Activity,
  Search,
} from "lucide-react";
import { Button } from "@/ui/button";
import type { FilterType, RunScope } from "@/tabs/jobbstatus/lib/swimlane-filters";

type RerunWorker = "scope1" | "scope2" | "scope3" | "economy" | "baseYear" | "industryGics";

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

const RERUN_WORKERS: Array<{ id: RerunWorker; label: string }> = [
  { id: "scope1", label: "Scope 1" },
  { id: "scope2", label: "Scope 2" },
  { id: "scope3", label: "Scope 3" },
  { id: "economy", label: "Ekonomi" },
  { id: "baseYear", label: "Basår" },
  { id: "industryGics", label: "Bransch GICS" },
];

const LIMIT_OPTIONS: Array<{ value: number | "all"; label: string }> = [
  { value: 1, label: "1" },
  { value: 5, label: "5" },
  { value: "all", label: "Alla" },
];

function RerunJobsSection({
  onRerunByWorker,
}: {
  onRerunByWorker: (worker: RerunWorker, limit: number | "all") => void;
}) {
  const [rerunLimit, setRerunLimit] = useState<number | "all">(5);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-4 border-t border-gray-03/50">
      <div className="flex items-center gap-2 shrink-0">
        <Activity className="w-4 h-4 text-gray-02" />
        <span className="text-sm font-medium text-gray-01">
          Kör specifika jobb:
        </span>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        {RERUN_WORKERS.map((worker) => (
          <Button
            key={worker.id}
            variant="ghost"
            size="sm"
            onClick={() => onRerunByWorker(worker.id, rerunLimit)}
            className="!w-auto !min-w-0 h-9 px-4 text-sm border border-gray-03 text-gray-01 hover:bg-gray-03/40"
          >
            {worker.label}
          </Button>
        ))}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-gray-02">Antal:</span>
        <select
          value={String(rerunLimit)}
          onChange={(e) => {
            const val = e.target.value;
            setRerunLimit(val === "all" ? "all" : Number(val));
          }}
          className="px-2 py-1 rounded-md border border-gray-03 bg-gray-05 text-gray-01 text-sm focus:outline-none focus:ring-2 focus:ring-blue-03/50 focus:border-blue-03"
        >
          {LIMIT_OPTIONS.map((opt) => (
            <option key={String(opt.value)} value={String(opt.value)}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

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

  // Primary filters (most commonly used)
  const primaryFilters: Array<{
    id: FilterType;
    label: string;
    icon: React.ReactNode;
    badgeColorClass: string;
    activeColor: string;
  }> = [
    {
      id: "pending_approval",
      label: "Väntar på godkännande",
      icon: <AlertTriangle className="w-4 h-4" />,
      badgeColorClass: "bg-orange-03/20 text-orange-03",
      activeColor: "bg-orange-03 text-white hover:bg-orange-03/90",
    },
    {
      id: "has_failed",
      label: "Har misslyckade",
      icon: <XCircle className="w-4 h-4" />,
      badgeColorClass: "bg-pink-03/20 text-pink-03",
      activeColor: "bg-pink-03 text-white hover:bg-pink-03/90",
    },
    {
      id: "has_processing",
      label: "Bearbetar",
      icon: <RotateCw className="w-4 h-4" />,
      badgeColorClass: "bg-blue-03/20 text-blue-03",
      activeColor: "bg-blue-03 text-white hover:bg-blue-03/90",
    },
    {
      id: "has_issues",
      label: "Har problem",
      icon: <AlertTriangle className="w-4 h-4" />,
      badgeColorClass: "bg-orange-03/20 text-orange-03",
      activeColor: "bg-orange-03 text-white hover:bg-orange-03/90",
    },
  ];

  // Secondary filters (in dropdown)
  const secondaryFilters: Array<{
    id: FilterType;
    label: string;
  }> = [
    { id: "fully_completed", label: "Fullständigt klart" },
    { id: "preprocessing_issues", label: "Preprocessing-problem" },
    { id: "data_extraction_issues", label: "Dataextraktion-problem" },
    { id: "finalize_issues", label: "Finalisering-problem" },
  ];

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

        {/* Rerun Jobs Section - Inside filter container */}
        <RerunJobsSection onRerunByWorker={onRerunByWorker} />
      </div>
    </div>
  );
}
