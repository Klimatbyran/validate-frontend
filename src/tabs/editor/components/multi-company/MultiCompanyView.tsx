import { useCallback, useMemo, useState } from "react";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import { LoadingSpinner } from "@/ui/loading-spinner";
import { toast } from "sonner";
import { updateCompany, updateReportingPeriods } from "../../lib/companies-api";
import type {
  EditState,
  GarboCompanyListItem,
  GarboMetadata,
} from "../../lib/types";
import { FieldEditModal } from "./FieldEditModal";
import { BulkTagUpdateModal } from "./BulkTagUpdateModal";
import { MultiCompanyFilters } from "./MultiCompanyFilters";
import { MultiCompanySelectionBar } from "./MultiCompanySelectionBar";
import { MultiCompanyTable } from "./MultiCompanyTable";
import { getPeriodForYear } from "../../lib/multi-company-utils";
import { MultiSelectDropdown } from "@/ui/multi-select-dropdown";
import { useMultiCompanyData } from "../../hooks/useMultiCompanyData";
import {
  buildReportingPeriodUpdatePayload,
  companyMatchesTagFilter,
  parseTagSlugs,
} from "../../lib/editor-tag-and-payload-utils";

function companyMatchesSearch(
  company: GarboCompanyListItem,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const name = (company.name ?? "").toLowerCase();
  const wikidataId = (company.wikidataId ?? "").toLowerCase();
  const internalId = (company.id ?? "").toLowerCase();
  const idPrefix = internalId.split("-")[0];
  return (
    name.includes(q) ||
    wikidataId.includes(q) ||
    internalId.includes(q) ||
    idPrefix.includes(q)
  );
}

export function MultiCompanyView() {
  const { t } = useI18n();
  const {
    companies,
    setCompanies,
    tagOptions,
    years,
    tagLabelBySlug,
    loading,
    error,
    reload: loadCompanies,
  } = useMultiCompanyData();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<Set<string>>(
    new Set(),
  );
  const [bulkTagModalOpen, setBulkTagModalOpen] = useState(false);

  const filteredCompanies = useMemo(() => {
    let filteredList = companies;
    if (searchQuery.trim()) {
      filteredList = filteredList.filter((company) =>
        companyMatchesSearch(company, searchQuery),
      );
    }
    if (selectedTags.length) {
      // API returns company.tags as string[] of slugs; filter shows companies that have any selected tag
      filteredList = filteredList.filter((company) =>
        companyMatchesTagFilter(company.tags, selectedTags),
      );
    }
    if (selectedYear) {
      const selectedYearNumber = Number(selectedYear);
      filteredList = filteredList.filter((company) =>
        getPeriodForYear(company.reportingPeriods, selectedYearNumber),
      );
    }
    return filteredList;
  }, [companies, searchQuery, selectedYear, selectedTags]);

  const toggleCompanySelection = useCallback((companyId: string) => {
    setSelectedCompanyIds((prev) => {
      const next = new Set(prev);
      if (next.has(companyId)) next.delete(companyId);
      else next.add(companyId);
      return next;
    });
  }, []);

  const selectAllFiltered = useCallback(() => {
    setSelectedCompanyIds(
      new Set(filteredCompanies.map((company) => company.id)),
    );
  }, [filteredCompanies]);

  const clearSelection = useCallback(() => {
    setSelectedCompanyIds(new Set());
  }, []);

  const allFilteredSelected =
    filteredCompanies.length > 0 &&
    filteredCompanies.every((company) => selectedCompanyIds.has(company.id));

  const bulkTagInitialSelectedSlugs = useMemo(() => {
    const selectedIds = Array.from(selectedCompanyIds);
    if (selectedIds.length === 0) return [];
    const selectedCompanies = selectedIds
      .map((id) => companies.find((c) => c.id === id))
      .filter(Boolean) as GarboCompanyListItem[];
    if (selectedCompanies.length === 0) return [];

    const firstTags = selectedCompanies[0]?.tags ?? [];
    if (firstTags.length === 0) return [];
    return firstTags.filter((slug) =>
      selectedCompanies.every((c) => (c.tags ?? []).includes(slug)),
    );
  }, [companies, selectedCompanyIds]);

  const handleBulkTagSubmit = useCallback(
    async (tags: string[]) => {
      const selectedIds = Array.from(selectedCompanyIds);
      setActionLoading(true);
      try {
        let success = 0;
        let failed = 0;
        for (const companyId of selectedIds) {
          const company = companies.find(
            (listedCompany) => listedCompany.id === companyId,
          );
          if (!company) {
            failed++;
            continue;
          }
          try {
            await updateCompany(companyId, { name: company.name, tags });
            success++;
          } catch {
            failed++;
          }
        }
        if (failed === 0) {
          toast.success(
            t("editor.companies.bulkUpdateTagsSuccess", {
              count: selectedIds.length,
            }),
          );
          setCompanies((prev) =>
            prev.map((company) =>
              selectedCompanyIds.has(company.id)
                ? { ...company, tags }
                : company,
            ),
          );
        } else {
          toast.warning(
            t("editor.companies.bulkUpdateTagsSuccess", { count: success }) +
              (failed > 0
                ? `; ${t("editor.companies.bulkUpdateTagsError")}`
                : ""),
          );
        }
        setBulkTagModalOpen(false);
        setSelectedCompanyIds(new Set());
        await loadCompanies();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : String(error));
        throw error;
      } finally {
        setActionLoading(false);
      }
    },
    [selectedCompanyIds, companies, t, loadCompanies, setCompanies],
  );

  const handleSaveEdit = useCallback(
    async (value: string, meta: GarboMetadata & { verified?: boolean }) => {
      if (!editState) return;
      setActionLoading(true);
      try {
        if (editState.field === "tags") {
          const tags = parseTagSlugs(value);
          await updateCompany(editState.companyId, {
            name: editState.companyName,
            tags,
          });
          toast.success(t("editor.tagOptions.updated"));
          setCompanies((prev) =>
            prev.map((company) =>
              company.id === editState.companyId
                ? { ...company, tags }
                : company,
            ),
          );
        } else if (
          editState.year != null &&
          editState.startDate &&
          editState.endDate
        ) {
          const reportingPeriodPayload = buildReportingPeriodUpdatePayload(
            editState,
            value,
            meta.verified,
          );
          if (!reportingPeriodPayload) {
            throw new Error("Could not build reporting period payload.");
          }
          await updateReportingPeriods(editState.companyId, {
            reportingPeriods: [reportingPeriodPayload],
            metadata:
              meta.source || meta.comment
                ? { source: meta.source, comment: meta.comment }
                : undefined,
          });
          toast.success(t("editor.tagOptions.updated"));
        }
        setEditState(null);
        if (editState.field !== "tags") {
          await loadCompanies();
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : String(error));
        throw error;
      } finally {
        setActionLoading(false);
      }
    },
    [editState, t, loadCompanies, setCompanies],
  );

  const renderTagsInput = useCallback(
    (value: string, onChange: (v: string) => void) => {
      const selectedSlugs = parseTagSlugs(value);
      return (
        <div className="space-y-2">
          <MultiSelectDropdown
            options={tagOptions.map((tagOption) => tagOption.slug)}
            selectedIds={selectedSlugs}
            onChange={(selectedOptionIds: string[]) =>
              onChange(selectedOptionIds.join(", "))
            }
            triggerLabel={t("editor.companies.tags")}
            getOptionLabel={(slug) => tagLabelBySlug[slug] ?? slug}
            emptyLabel={t("editor.tagOptions.empty")}
            panelClassName="max-h-64"
            panelMinWidth={260}
            usePortal={false}
          />
          {selectedSlugs.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedSlugs.map((slug) => (
                <span
                  key={slug}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-03/80 text-gray-01 border border-gray-03"
                >
                  {tagLabelBySlug[slug] ?? slug}
                </span>
              ))}
            </div>
          )}
        </div>
      );
    },
    [tagOptions, t, tagLabelBySlug],
  );

  return (
    <div className="space-y-4">
      <MultiCompanyFilters
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        years={years}
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
        tagOptions={tagOptions}
        selectedTags={selectedTags}
        onTagsChange={setSelectedTags}
        onRefresh={loadCompanies}
        refreshDisabled={loading}
      />

      {loading ? (
        <div className="flex justify-center py-12 bg-gray-04/80 backdrop-blur-sm rounded-lg">
          <LoadingSpinner label={t("editor.companies.loading")} />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-gray-03 bg-gray-04/80 p-6">
          <p className="text-gray-01 font-medium">
            {t("editor.companies.loadError")}
          </p>
          <p className="text-sm text-gray-02 mt-1">{error}</p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-4"
            onClick={loadCompanies}
          >
            {t("common.refresh")}
          </Button>
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div className="rounded-lg border border-gray-03 bg-gray-04/80 p-8 text-center text-gray-02">
          {t("editor.companies.empty")}
        </div>
      ) : (
        <>
          <MultiCompanySelectionBar
            count={selectedCompanyIds.size}
            onClear={clearSelection}
            onBulkUpdateTags={() => setBulkTagModalOpen(true)}
            bulkDisabled={actionLoading}
          />

          <MultiCompanyTable
            companies={filteredCompanies}
            selectedYear={selectedYear}
            allFilteredSelected={allFilteredSelected}
            onToggleSelectAll={() =>
              allFilteredSelected ? clearSelection() : selectAllFiltered()
            }
            selectedCompanyIds={selectedCompanyIds}
            onToggleCompanySelection={toggleCompanySelection}
            actionLoading={actionLoading}
            onEdit={setEditState}
          />
        </>
      )}

      {editState && (
        <FieldEditModal
          open={!!editState}
          onOpenChange={(open) => !open && setEditState(null)}
          title={`${editState.field === "tags" ? t("editor.companies.tags") : editState.field} — ${editState.companyName}`}
          currentValue={editState.currentValue}
          initialValue={
            editState.currentValue != null ? String(editState.currentValue) : ""
          }
          onSubmit={handleSaveEdit}
          allowVerifyOnly={
            editState.field !== "tags" && editState.field !== "reportURL"
          }
          isSubmitting={actionLoading}
          renderInput={
            editState.field === "tags"
              ? renderTagsInput
              : editState.field === "scope1" ||
                  editState.field === "scope2" ||
                  editState.field === "economy"
                ? (value, onChange, disabled) => (
                    <input
                      type="number"
                      value={value}
                      onChange={(e) => onChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-03 bg-gray-05 text-gray-01 focus:outline-none focus:ring-2 focus:ring-blue-03"
                      disabled={disabled}
                      min={0}
                      step="any"
                    />
                  )
                : undefined
          }
        />
      )}

      <BulkTagUpdateModal
        open={bulkTagModalOpen}
        onOpenChange={setBulkTagModalOpen}
        companyCount={selectedCompanyIds.size}
        tagOptions={tagOptions}
        initialSelectedSlugs={bulkTagInitialSelectedSlugs}
        onSubmit={handleBulkTagSubmit}
        isSubmitting={actionLoading}
      />
    </div>
  );
}
