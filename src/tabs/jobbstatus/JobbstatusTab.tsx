/**
 * Main swimlane queue status view (Jobbstatus tab)
 * Orchestrates data fetching, filtering, and component rendering
 */

import { useState, useMemo, useEffect } from "react";
import { Loader2, ArrowUp } from "lucide-react";
import { Button } from "@/ui/button";
import { useCompanies } from "@/hooks/useCompanies";
import { authenticatedFetch } from "@/lib/api-helpers";
import { toast } from "sonner";
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
import { OverviewStats } from "./components/OverviewStats";
import { FilterBar } from "./components/FilterBar";
import { CompanyCard } from "./components/CompanyCard";
import { findJobByQueueId } from "@/lib/workflow-utils";

export function JobbstatusTab() {
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
  const [companySearchQuery, setCompanySearchQuery] = useState("");
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

  // Filter companies based on active filters (AND logic) and company name search
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
                  return hasPipelineStepIssues(company, "preprocessing", runScope);
                case "data_extraction_issues":
                  return hasPipelineStepIssues(
                    company,
                    "data-extraction",
                    runScope
                  );
                case "finalize_issues":
                  return hasPipelineStepIssues(company, "finalize", runScope);
                default:
                  return true;
              }
            });
          });

    if (!searchTrimmed) return statusFiltered;
    return statusFiltered.filter((company) =>
      company.name.toLowerCase().includes(searchTrimmed)
    );
  }, [swimlaneCompanies, activeFilters, runScope, companySearchQuery]);

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

  // Clear all filters and company search
  const clearFilters = () => {
    setActiveFilters(new Set());
    setCompanySearchQuery("");
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

  const handleRerunByWorker = async (
    workerName: "scope1" | "scope2" | "scope1+2" | "scope3" | "economy" | "baseYear" | "industryGics",
    limit: number | "all" = 5
  ) => {
    const workerToFollowUpKey: Record<string, string> = {
      "scope1": "scope1",
      "scope2": "scope2",
      "scope1+2": "scope1+2",
      "scope3": "scope3",
      "economy": "economy",
      "baseYear": "baseYear",
      "industryGics": "industryGics",
    };

    const followUpKey = workerToFollowUpKey[workerName];
    if (!followUpKey) return;

    // Collect targets: for each company, find the latest year's extractEmissions job + wikidata from checkDB
    const targets: Array<{
      companyName: string;
      extractEmissionsJobId: string;
      wikidataNode: string | undefined;
    }> = [];

    for (const company of swimlaneCompanies) {
      if (limit !== "all" && targets.length >= limit) break;

      // Use the latest year (first in array, sorted by timestamp)
      const latestYear = company.years[0];
      if (!latestYear) continue;

      const extractEmissionsJob = findJobByQueueId("extractEmissions", latestYear);
      if (!extractEmissionsJob?.id) continue;

      targets.push({
        companyName: company.name,
        extractEmissionsJobId: extractEmissionsJob.id,
        wikidataNode: company.wikidataId,
      });
    }

    if (targets.length === 0) {
      toast.error(`Inga företag hittades att köra om ${workerName} för`);
      return;
    }

    toast.info(`Kör om ${workerName} för ${targets.length} företag...`);

    let successes = 0;
    let failures = 0;

    for (const target of targets) {
      try {
        const response = await authenticatedFetch(
          `/api/queues/extractEmissions/${encodeURIComponent(target.extractEmissionsJobId)}/rerun-and-save`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              scopes: [followUpKey],
              ...(target.wikidataNode ? { jobData: { wikidata: { node: target.wikidataNode } } } : {}),
            }),
          }
        );

        if (response.ok) {
          successes++;
          console.log(`[rerun-by-worker] ${workerName} OK for ${target.companyName}`);
        } else {
          failures++;
          const errorText = await response.text();
          console.error(`[rerun-by-worker] ${workerName} FAILED for ${target.companyName}: ${errorText}`);
        }
      } catch (err) {
        failures++;
        console.error(`[rerun-by-worker] ${workerName} ERROR for ${target.companyName}:`, err);
      }
    }

    if (failures === 0) {
      toast.success(`Startade om ${workerName} för ${successes} företag`);
    } else {
      toast.warning(`${workerName}: ${successes} lyckades, ${failures} misslyckades`);
    }
  };

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

  if (error) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-03">Error loading companies: {error}</p>
        </div>
      </div>
    );
  }

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
