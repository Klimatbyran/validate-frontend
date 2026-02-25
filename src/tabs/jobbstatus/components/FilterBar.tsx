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
  ChevronDown,
  RefreshCw,
} from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import type {
  FilterType,
  RunScope,
} from "@/tabs/jobbstatus/lib/swimlane-filters";
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
  /** Available batch IDs for multi-select filter */
  existingBatches?: string[];
  /** True while batch list is being fetched */
  batchesLoading?: boolean;
  /** Currently selected batch IDs (subset of existingBatches) */
  selectedBatchIds?: string[];
  /** Called when user changes batch selection */
  onBatchFilterChange?: (ids: string[]) => void;
  /** Optional: refresh company data (e.g. when returning to tab) */
  onRefresh?: () => void;
  /** True while a refresh is in progress (optional, for button loading state) */
  isRefreshing?: boolean;
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
  existingBatches = [],
  batchesLoading = false,
  selectedBatchIds = [],
  onBatchFilterChange,
  onRefresh,
  isRefreshing = false,
}: FilterBarProps) {
  const { t } = useI18n();
  const hasActiveFiltersOrSearch =
    activeFilters.size > 0 ||
    selectedBatchIds.length > 0 ||
    (companySearchQuery?.trim() ?? "") !== "";
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [showBatchDropdown, setShowBatchDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const batchDropdownRef = useRef<HTMLDivElement>(null);

  const primaryFilters = useMemo(
    () =>
      PRIMARY_FILTER_CONFIG.map((config) => ({
        ...config,
        icon: PRIMARY_FILTER_ICONS[config.id],
      })),
    [],
  );
  const secondaryFilters = SECONDARY_FILTER_CONFIG;

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setShowMoreFilters(false);
      }
      if (
        batchDropdownRef.current &&
        !batchDropdownRef.current.contains(target)
      ) {
        setShowBatchDropdown(false);
      }
    };

    if (showMoreFilters || showBatchDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showMoreFilters, showBatchDropdown]);

  const toggleBatch = (batchId: string) => {
    if (!onBatchFilterChange) return;
    const next = selectedBatchIds.includes(batchId)
      ? selectedBatchIds.filter((id) => id !== batchId)
      : [...selectedBatchIds, batchId];
    onBatchFilterChange(next);
  };

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
                placeholder={t("jobstatus.searchCompany")}
                className="w-full pl-9 pr-8 py-2 rounded-md border border-gray-03 bg-gray-05 text-gray-01 text-sm placeholder:text-gray-02 focus:outline-none focus:ring-2 focus:ring-blue-03/50 focus:border-blue-03"
                aria-label={t("jobstatus.searchCompanyAria")}
              />
              {companySearchQuery && (
                <button
                  type="button"
                  onClick={() => onCompanySearchChange("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-02 hover:text-gray-01 rounded"
                  aria-label={t("jobstatus.clearSearch")}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
          <div className="flex items-center gap-2 shrink-0 sm:ml-auto">
            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="!w-auto !min-w-0 h-9 px-3 text-gray-01 hover:bg-gray-03/40"
                aria-label={t("common.refresh")}
              >
                <RefreshCw
                  className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
                />
              </Button>
            )}
            <span className="text-sm text-gray-02">
              {t("jobstatus.scope")}:
            </span>
            <div className="flex items-center gap-1 bg-gray-03 rounded-full p-0.5">
              <button
                onClick={() => onRunScopeChange("latest")}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  runScope === "latest"
                    ? "bg-gray-01 text-gray-05"
                    : "text-gray-02 hover:text-gray-01"
                }`}
              >
                {t("jobstatus.latestRun")}
              </button>
              <button
                onClick={() => onRunScopeChange("all")}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  runScope === "all"
                    ? "bg-gray-01 text-gray-05"
                    : "text-gray-02 hover:text-gray-01"
                }`}
              >
                {t("jobstatus.allRuns")}
              </button>
            </div>
          </div>
        </div>

        {/* Batch multi-select and Filter label */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <Filter className="w-4 h-4 text-gray-02" />
            <span className="text-sm font-medium text-gray-01">
              {t("jobstatus.filter")}:
            </span>
          </div>
          {onBatchFilterChange && (
            <div className="relative shrink-0" ref={batchDropdownRef}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBatchDropdown(!showBatchDropdown)}
                className={`!w-auto !min-w-0 h-9 px-4 text-sm border border-gray-03 text-gray-01 hover:bg-gray-03/40 flex items-center gap-2 ${
                  selectedBatchIds.length > 0
                    ? "border-blue-03 bg-blue-03/10 text-blue-03"
                    : ""
                }`}
                aria-expanded={showBatchDropdown}
                aria-haspopup="listbox"
                aria-label={t("jobstatus.batch")}
              >
                <span className="whitespace-nowrap">
                  {t("jobstatus.batch")}
                </span>
                <ChevronDown className="w-4 h-4 shrink-0" />
                {selectedBatchIds.length > 0 && (
                  <span className="ml-1 px-2 py-0.5 rounded-full bg-gray-03/50 text-xs font-medium">
                    {selectedBatchIds.length}
                  </span>
                )}
              </Button>
              {showBatchDropdown && (
                <div
                  className="absolute left-0 top-full mt-2 z-50 bg-gray-04 border border-gray-03 rounded-lg shadow-lg p-2 min-w-[220px] max-h-[280px] overflow-y-auto"
                  role="listbox"
                  aria-multiselectable="true"
                  aria-label={t("jobstatus.batch")}
                >
                  <div className="text-xs font-semibold text-gray-02 mb-2 px-2">
                    {t("jobstatus.batch")}
                  </div>
                  {batchesLoading ? (
                    <div
                      className="w-full text-left px-3 py-2 rounded text-sm text-gray-02 flex items-center gap-2 cursor-default"
                      role="option"
                      aria-disabled="true"
                      aria-live="polite"
                    >
                      <span className="flex-shrink-0 w-4 h-4 rounded border border-gray-03" aria-hidden />
                      <span className="truncate">
                        {t("jobstatus.batchLoading")}
                      </span>
                    </div>
                  ) : existingBatches.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-gray-02">
                      {t("jobstatus.batchEmpty")}
                    </p>
                  ) : (
                    existingBatches.map((batchId) => {
                      const isSelected = selectedBatchIds.includes(batchId);
                      return (
                        <button
                          key={batchId}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => toggleBatch(batchId)}
                          className="w-full text-left px-3 py-2 rounded text-sm transition-colors flex items-center gap-2 hover:bg-gray-03/50 text-gray-01"
                        >
                          <span
                            className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center ${
                              isSelected
                                ? "bg-blue-03 border-blue-03"
                                : "border-gray-03"
                            }`}
                          >
                            {isSelected && (
                              <CheckCircle2 className="w-3 h-3 text-white" />
                            )}
                          </span>
                          <span className="truncate">{batchId}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}
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
                  <span className="whitespace-nowrap">
                    {t(`jobstatus.filters.${filter.id}`)}
                  </span>
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
                {t("jobstatus.moreFilters")}
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
                    {t("jobstatus.additionalFilters")}
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
                          {t(`jobstatus.filters.${filter.id}`)}
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
                {t("common.clearFilters")}
              </Button>
            )}
          </div>
        </div>

        {/* Filter Summary */}
        {hasActiveFiltersOrSearch && (
          <div className="text-sm text-gray-02 pt-2">
            {t("jobstatus.showingCompanies", {
              filtered: filteredCount,
              total: totalCount,
            })}
          </div>
        )}

        <FilterBarRerunSection onRerunByWorker={onRerunByWorker} />
      </div>
    </div>
  );
}
