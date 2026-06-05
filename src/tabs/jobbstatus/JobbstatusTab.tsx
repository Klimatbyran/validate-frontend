/**
 * Main swimlane queue status view (Jobbstatus tab)
 * Orchestrates data fetching, filtering, and component rendering
 */

import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, ArrowUp } from "lucide-react";
import { Button } from "@/ui/button";
import { motion } from "framer-motion";
import { ViewModePills } from "@/ui/view-mode-pills";
import { useCompaniesContext } from "@/contexts/companies-context";
import { useBatches } from "@/hooks/useBatches";
import { convertCompaniesToSwimlaneFormat } from "./lib/swimlane-transform";
import {
  type FilterType,
  type RunScope,
  hasPendingApproval,
  hasFailedJobs,
  hasProcessingJobs,
  isFullyCompleted,
  hasIssues,
  hasPipelineStepIssues,
} from "./lib/swimlane-filters";
import { useI18n } from "@/contexts/I18nContext";
import { useRerunByWorker } from "./hooks/useRerunByWorker";
import { OverviewStats } from "./components/OverviewStats";
import { FilterBar } from "./components/FilterBar";
import { CompanyCard } from "./components/CompanyCard";
import { JobbstatusArchivePanel } from "./components/JobbstatusArchivePanel";

export type JobbstatusViewMode = "live" | "archive";

const VIEW_MODES: { value: JobbstatusViewMode; labelKey: string }[] = [
  { value: "live", labelKey: "jobstatus.sourceLive" },
  { value: "archive", labelKey: "jobstatus.sourceArchive" },
];

const JOBSTATUS_SOURCE_QUERY = "source";
const JOBSTATUS_SEARCH_QUERY = "q";
const JOBSTATUS_ATTENTION_QUERY = "attention";

function jobbstatusSubtabFromSearchParams(
  searchParams: URLSearchParams,
): JobbstatusViewMode {
  return searchParams.get(JOBSTATUS_SOURCE_QUERY) === "archive"
    ? "archive"
    : "live";
}

export function JobbstatusTab() {
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const jobbstatusSubtab = jobbstatusSubtabFromSearchParams(searchParams);
  const overlaySearchTerm = (
    searchParams.get(JOBSTATUS_SEARCH_QUERY) || ""
  ).trim();
  const overlayAttention = searchParams.get(JOBSTATUS_ATTENTION_QUERY);

  const setJobbstatusSubtab = useCallback(
    (value: JobbstatusViewMode) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value === "live") {
            next.delete(JOBSTATUS_SOURCE_QUERY);
          } else {
            next.set(JOBSTATUS_SOURCE_QUERY, "archive");
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );
  const {
    companies,
    isLoading,
    error,
    loadMoreCompanies,
    isLoadingMore,
    hasMorePages,
    refresh,
    isRefreshing,
  } = useCompaniesContext();
  const [activeFilters, setActiveFilters] = useState<Set<FilterType>>(
    new Set(),
  );
  const [runScope, setRunScope] = useState<RunScope>("latest");
  const [companySearchQuery, setCompanySearchQuery] =
    useState(overlaySearchTerm);
  const [overlayDrivenView, setOverlayDrivenView] = useState(false);
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const { batches: existingBatches, isLoading: batchesLoading } = useBatches();

  const swimlaneCompanies = useMemo(
    () => convertCompaniesToSwimlaneFormat(companies),
    [companies],
  );

  const filterCounts = useMemo(() => {
    return {
      pending_approval: swimlaneCompanies.filter((c) =>
        hasPendingApproval(c, runScope),
      ).length,
      has_failed: swimlaneCompanies.filter((c) => hasFailedJobs(c, runScope))
        .length,
      has_processing: swimlaneCompanies.filter((c) =>
        hasProcessingJobs(c, runScope),
      ).length,
      fully_completed: swimlaneCompanies.filter((c) =>
        isFullyCompleted(c, runScope),
      ).length,
      has_issues: swimlaneCompanies.filter((c) => hasIssues(c, runScope))
        .length,
      preprocessing_issues: swimlaneCompanies.filter((c) =>
        hasPipelineStepIssues(c, "preprocessing", runScope),
      ).length,
      data_extraction_issues: swimlaneCompanies.filter((c) =>
        hasPipelineStepIssues(c, "data-extraction", runScope),
      ).length,
      finalize_issues: swimlaneCompanies.filter((c) =>
        hasPipelineStepIssues(c, "finalize", runScope),
      ).length,
    };
  }, [swimlaneCompanies, runScope]);

  useEffect(() => {
    const hasOverlayParams = Boolean(overlayAttention || overlaySearchTerm);

    if (!hasOverlayParams) {
      if (overlayDrivenView) {
        setActiveFilters(new Set());
        setRunScope("latest");
        setCompanySearchQuery("");
        setOverlayDrivenView(false);
      }
      return;
    }

    const nextFilters = new Set<FilterType>();
    if (overlayAttention === "failed") {
      nextFilters.add("has_failed");
    } else if (overlayAttention === "approval") {
      nextFilters.add("pending_approval");
    }

    if (nextFilters.size > 0) {
      setActiveFilters(nextFilters);
      setRunScope("all");
    } else {
      setActiveFilters(new Set());
      if (overlaySearchTerm) {
        setRunScope("all");
      }
    }

    if (overlaySearchTerm) {
      setCompanySearchQuery(overlaySearchTerm);
    }

    setOverlayDrivenView(true);
  }, [overlayAttention, overlaySearchTerm, overlayDrivenView]);

  const filteredCompanies = useMemo(() => {
    const searchTrimmed = companySearchQuery.trim().toLowerCase();
    const statusFiltered =
      activeFilters.size === 0
        ? swimlaneCompanies
        : swimlaneCompanies.filter((company) => {
            return Array.from(activeFilters).every((filter) => {
              switch (filter) {
                case "pending_approval":
                  return hasPendingApproval(company, runScope);
                case "has_failed":
                  return hasFailedJobs(company, runScope);
                case "has_processing":
                  return hasProcessingJobs(company, runScope);
                case "fully_completed":
                  return isFullyCompleted(company, runScope);
                case "has_issues":
                  return hasIssues(company, runScope);
                case "preprocessing_issues":
                  return hasPipelineStepIssues(
                    company,
                    "preprocessing",
                    runScope,
                  );
                case "data_extraction_issues":
                  return hasPipelineStepIssues(
                    company,
                    "data-extraction",
                    runScope,
                  );
                case "finalize_issues":
                  return hasPipelineStepIssues(company, "finalize", runScope);
                default:
                  return true;
              }
            });
          });

    const batchFiltered =
      selectedBatchIds.length === 0
        ? statusFiltered
        : statusFiltered.filter((company) => {
            const companyBatchIds = company.batchIds ?? [];
            return selectedBatchIds.some((sel) => {
              if (companyBatchIds.includes(sel)) return true;
              const name = existingBatches.find((b) => b.id === sel)?.batchName;
              return Boolean(name && companyBatchIds.includes(name));
            });
          });

    if (!searchTrimmed) return batchFiltered;
    return batchFiltered.filter((company) => {
      if (company.name.toLowerCase().includes(searchTrimmed)) return true;
      if (company.wikidataId?.toLowerCase().includes(searchTrimmed))
        return true;
      if (
        (company.batchIds || []).some((id) =>
          id.toLowerCase().includes(searchTrimmed),
        )
      ) {
        return true;
      }

      return (company.years || []).some((year) => {
        if ((year as any).threadId?.toLowerCase?.().includes(searchTrimmed)) {
          return true;
        }
        if (String(year.year).includes(searchTrimmed)) return true;
        return (year.jobs || []).some((job) => {
          const threadId =
            (job.data as any)?.threadId || (job as any)?.threadId || "";
          const sourceUrl =
            (job.data as any)?.url || (job.data as any)?.sourceUrl || "";
          return (
            String(job.id || "")
              .toLowerCase()
              .includes(searchTrimmed) ||
            String(threadId).toLowerCase().includes(searchTrimmed) ||
            String(sourceUrl).toLowerCase().includes(searchTrimmed)
          );
        });
      });
    });
  }, [
    swimlaneCompanies,
    activeFilters,
    runScope,
    companySearchQuery,
    selectedBatchIds,
    existingBatches,
  ]);

  const toggleFilter = (filter: FilterType) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(filter)) {
        next.delete(filter);
      } else {
        next.add(filter);
      }
      return next;
    });
  };

  const clearFilters = () => {
    setActiveFilters(new Set());
    setCompanySearchQuery("");
    setSelectedBatchIds([]);
  };

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollToTop(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const pillOptions = useMemo(
    () => VIEW_MODES.map((m) => ({ value: m.value, label: t(m.labelKey) })),
    [t],
  );

  const handleRerunByWorker = useRerunByWorker(filteredCompanies);

  return (
    <div className="flex flex-col gap-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-04/80 backdrop-blur-sm rounded-lg p-6 flex flex-col gap-4"
      >
        <div className="flex items-center justify-between mb-2 gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-semibold text-gray-01">
              {t("jobstatus.title")}
            </h2>
            <p className="text-sm text-gray-02 mt-1">
              {t("jobstatus.subtitle")}
            </p>
          </div>
          <ViewModePills
            options={pillOptions}
            value={jobbstatusSubtab}
            onValueChange={setJobbstatusSubtab}
            ariaLabel={t("jobstatus.viewMode")}
            className="shrink-0"
          />
        </div>

        {jobbstatusSubtab === "live" ? (
          <>
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="text-center space-y-4">
                  <Loader2 className="w-8 h-8 text-blue-03 animate-spin mx-auto" />
                  <div>
                    <p className="text-lg text-gray-01 font-medium">
                      {t("jobstatus.loadingCompanies")}
                    </p>
                    <p className="text-sm text-gray-02 mt-2">
                      {t("jobstatus.fetchingCompanies")}
                    </p>
                  </div>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center p-4">
                <div className="text-center">
                  <p className="text-red-03">
                    {t("jobstatus.errorLoadingCompanies", {
                      error: String(error),
                    })}
                  </p>
                </div>
              </div>
            ) : !companies || companies.length === 0 ? (
              <div className="flex items-center justify-center p-4">
                <div className="text-center">
                  <p className="text-gray-02">
                    {t("jobstatus.noCompaniesFound")}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <OverviewStats
                  companies={filteredCompanies}
                  onFilterToggle={toggleFilter}
                />
                <div className="sticky top-0 z-40 bg-gray-05 pb-4 -mb-4">
                  <FilterBar
                    activeFilters={activeFilters}
                    runScope={runScope}
                    filterCounts={filterCounts}
                    onToggleFilter={toggleFilter}
                    onClearFilters={clearFilters}
                    onRunScopeChange={setRunScope}
                    filteredCount={filteredCompanies.length}
                    totalCount={swimlaneCompanies.length}
                    onRerunByWorker={handleRerunByWorker}
                    companySearchQuery={companySearchQuery}
                    onCompanySearchChange={setCompanySearchQuery}
                    existingBatches={existingBatches}
                    batchesLoading={batchesLoading}
                    selectedBatchIds={selectedBatchIds}
                    onBatchFilterChange={setSelectedBatchIds}
                    onRefresh={refresh}
                    isRefreshing={isRefreshing}
                  />
                </div>
                <div className="space-y-4">
                  {filteredCompanies.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-02">
                        {activeFilters.size > 0 || selectedBatchIds.length > 0
                          ? t("jobstatus.noCompaniesMatch")
                          : t("jobstatus.noCompaniesFound")}
                      </p>
                    </div>
                  ) : (
                    <>
                      {filteredCompanies.map((company, companyIndex) => (
                        <CompanyCard
                          key={company.id}
                          company={company}
                          positionInList={companyIndex + 1}
                        />
                      ))}
                      {hasMorePages && (
                        <div className="flex justify-center pt-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={loadMoreCompanies}
                            disabled={isLoadingMore}
                            className="border border-gray-03 text-gray-01 hover:bg-gray-03/40"
                          >
                            {isLoadingMore
                              ? t("jobstatus.loadingMore")
                              : t("jobstatus.loadMore")}
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </>
        ) : null}

        {jobbstatusSubtab === "archive" && (
          <div className="mt-4">
            <JobbstatusArchivePanel
              batchesFromGarbo={existingBatches}
              batchesLoading={batchesLoading}
            />
          </div>
        )}

        {showScrollToTop && (
          <button
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 z-50 bg-gray-01 text-gray-05 rounded-full p-3 shadow-lg hover:bg-gray-02 transition-all hover:scale-110 active:scale-95"
            aria-label={t("common.scrollToTop")}
          >
            <ArrowUp className="w-5 h-5" />
          </button>
        )}
      </motion.div>
    </div>
  );
}
