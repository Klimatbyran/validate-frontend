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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FilterType, RunScope } from "@/lib/swimlane-filters";

interface FilterBarProps {
  activeFilters: Set<FilterType>;
  runScope: RunScope;
  filterCounts: Record<FilterType, number>;
  onToggleFilter: (filter: FilterType) => void;
  onClearFilters: () => void;
  onRunScopeChange: (scope: RunScope) => void;
  filteredCount: number;
  totalCount: number;
  onRerunByWorker: (worker: "scope1+2" | "scope3") => void;
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
}: FilterBarProps) {
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
      <div className="flex flex-col gap-3">
        {/* Filter Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-02" />
            <span className="text-sm font-medium text-gray-01">Filter:</span>
          </div>

          {/* Run Scope Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-02">Omfattning:</span>
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

        {/* Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Primary Filter Buttons */}
          {primaryFilters.map((filter) => {
            const isActive = activeFilters.has(filter.id);
            const count = filterCounts[filter.id];
            return (
              <Button
                key={filter.id}
                variant={isActive ? "primary" : "ghost"}
                size="sm"
                onClick={() => onToggleFilter(filter.id)}
                className={
                  isActive
                    ? filter.activeColor
                    : "border border-gray-03 text-gray-01 hover:bg-gray-03/40"
                }
              >
                {isActive && <X className="w-4 h-4 mr-1.5" />}
                <span className="mr-1.5">{filter.icon}</span>
                {filter.label}
                {count > 0 && (
                  <span
                    className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
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
              className="border border-gray-03 text-gray-01 hover:bg-gray-03/40"
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
          {activeFilters.size > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="text-gray-02 hover:text-gray-01 hover:bg-gray-03/40"
            >
              <X className="w-4 h-4 mr-1.5" />
              Rensa filter
            </Button>
          )}
        </div>

        {/* Filter Summary */}
        {activeFilters.size > 0 && (
          <div className="text-sm text-gray-02 pt-2">
            Visar {filteredCount} av {totalCount} företag
          </div>
        )}

        {/* Rerun Jobs Section - Inside filter container */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-gray-02" />
            <span className="text-sm font-medium text-gray-01">
              Kör om jobb:
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRerunByWorker("scope1+2")}
              className="border border-gray-03 text-gray-01 hover:bg-gray-03/40"
            >
              Scope 1+2 (5 st)
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRerunByWorker("scope3")}
              className="border border-gray-03 text-gray-01 hover:bg-gray-03/40"
            >
              Scope 3 (5 st)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
