/**
 * Main swimlane queue status view
 * Orchestrates data fetching, filtering, and component rendering
 */

import { useState, useMemo, useEffect } from "react";
import { Loader2, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompanies } from "@/hooks/useCompanies";
import { toast } from "sonner";
import { convertCompaniesToSwimlaneFormat } from "@/lib/swimlane-transform";
import {
  type FilterType,
  type RunScope,
  hasPendingApproval,
  hasFailedJobs,
  hasProcessingJobs,
  isFullyCompleted,
  hasIssues,
  hasPipelineStepIssues,
} from "@/lib/swimlane-filters";
import { OverviewStats } from "@/components/swimlane/OverviewStats";
import { FilterBar } from "@/components/swimlane/FilterBar";
import { CompanyCard } from "@/components/swimlane/CompanyCard";

export function SwimlaneQueueStatus() {
  const {
    companies,
    isLoading,
    error,
    loadMoreCompanies,
    isLoadingMore,
    hasMorePages,
  } = useCompanies();
  const [activeFilters, setActiveFilters] = useState<Set<FilterType>>(
    new Set()
  );
  const [runScope, setRunScope] = useState<RunScope>("latest");
  const [showScrollToTop, setShowScrollToTop] = useState(false);

  // Convert CustomAPICompany to SwimlaneCompany format
  const swimlaneCompanies = useMemo(() => {
    return convertCompaniesToSwimlaneFormat(companies);
  }, [companies]);

  // Calculate filter counts
  const filterCounts = useMemo(() => {
    return {
      pending_approval: swimlaneCompanies.filter((c) =>
        hasPendingApproval(c, runScope)
      ).length,
      has_failed: swimlaneCompanies.filter((c) => hasFailedJobs(c, runScope))
        .length,
      has_processing: swimlaneCompanies.filter((c) =>
        hasProcessingJobs(c, runScope)
      ).length,
      fully_completed: swimlaneCompanies.filter((c) =>
        isFullyCompleted(c, runScope)
      ).length,
      has_issues: swimlaneCompanies.filter((c) => hasIssues(c, runScope))
        .length,
      preprocessing_issues: swimlaneCompanies.filter((c) =>
        hasPipelineStepIssues(c, "preprocessing", runScope)
      ).length,
      data_extraction_issues: swimlaneCompanies.filter((c) =>
        hasPipelineStepIssues(c, "data-extraction", runScope)
      ).length,
      finalize_issues: swimlaneCompanies.filter((c) =>
        hasPipelineStepIssues(c, "finalize", runScope)
      ).length,
    };
  }, [swimlaneCompanies, runScope]);

  // Filter companies based on active filters (AND logic - all must match)
  const filteredCompanies = useMemo(() => {
    if (activeFilters.size === 0) {
      return swimlaneCompanies;
    }

    return swimlaneCompanies.filter((company) => {
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
            return hasPipelineStepIssues(company, "preprocessing", runScope);
          case "data_extraction_issues":
            return hasPipelineStepIssues(company, "data-extraction", runScope);
          case "finalize_issues":
            return hasPipelineStepIssues(company, "finalize", runScope);
          default:
            return true;
        }
      });
    });
  }, [swimlaneCompanies, activeFilters, runScope]);

  // Toggle filter
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

  // Clear all filters
  const clearFilters = () => {
    setActiveFilters(new Set());
  };

  // Show/hide scroll to top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollToTop(window.scrollY > 300);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Scroll to top handler
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRerunByWorker = (
    workerName: "scope1+2" | "scope3",
    limit = "all"
  ) => {
    toast.promise(
      fetch("/api/queues/rerun-by-worker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workerName,
          queues: ["followUpScope12"],
          limit,
        }),
      }).then((res) => {
        if (!res.ok) {
          return res.text().then((text) => {
            throw new Error(text || `HTTP ${res.status}`);
          });
        }
      }),
      {
        loading: `Kör om senaste ${limit} jobben för ${workerName}...`,
        success: `Startade om ${limit} jobb för ${workerName}`,
        error: (err) =>
          `Kunde inte köra om jobb för ${workerName}: ${
            err?.message || "Okänt fel"
          }`,
      }
    );
  };

  // Show loading state only until we have any companies
  if (isLoading && (!companies || companies.length === 0)) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 text-blue-03 animate-spin mx-auto" />
          <div>
            <p className="text-lg text-gray-01 font-medium">
              Loading companies...
            </p>
            <p className="text-sm text-gray-02 mt-2">
              Fetching company data from API
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-03">Error loading companies: {error}</p>
        </div>
      </div>
    );
  }

  // Show empty state
  if (!companies || companies.length === 0) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-02">No companies found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Process Overview - Moved to top */}
      <OverviewStats
        companies={filteredCompanies}
        onFilterToggle={toggleFilter}
      />

      <div className="flex flex-col gap-4">
        {/* Filter Bar */}
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
        />
      </div>

      <div className="space-y-4">
        {filteredCompanies.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-02">
              {activeFilters.size > 0
                ? "Inga företag matchar de valda filtren"
                : "Inga företag hittades"}
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
                    ? "Laddar fler företag..."
                    : "Ladda fler företag"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating Scroll to Top Button */}
      {showScrollToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 bg-gray-01 text-gray-05 rounded-full p-3 shadow-lg hover:bg-gray-02 transition-all hover:scale-110 active:scale-95"
          aria-label="Scroll to top"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
