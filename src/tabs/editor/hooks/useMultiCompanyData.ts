import { useCallback, useEffect, useMemo, useState } from "react";
import { listCompanies } from "../lib/companies-api";
import { fetchTagOptions } from "../lib/tag-options-api";
import type { GarboCompanyListItem, TagOption } from "../lib/types";
import { buildTagLabelBySlug } from "../lib/editor-tag-and-payload-utils";

export function useMultiCompanyData() {
  const [companies, setCompanies] = useState<GarboCompanyListItem[]>([]);
  const [tagOptions, setTagOptions] = useState<TagOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [companyList, availableTagOptions] = await Promise.all([
        listCompanies(),
        fetchTagOptions(),
      ]);
      setCompanies(companyList);
      setTagOptions(availableTagOptions);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const years = useMemo(() => {
    const uniqueYears = new Set<string>();
    companies.forEach((company) => {
      company.reportingPeriods?.forEach((reportingPeriod) => {
        const year = reportingPeriod.startDate?.slice(0, 4) ?? reportingPeriod.endDate?.slice(0, 4);
        if (year) uniqueYears.add(year);
      });
    });
    return Array.from(uniqueYears).sort((yearA, yearB) => yearB.localeCompare(yearA));
  }, [companies]);

  const tagLabelBySlug = useMemo(() => buildTagLabelBySlug(tagOptions), [tagOptions]);

  return {
    companies,
    setCompanies,
    tagOptions,
    years,
    tagLabelBySlug,
    loading,
    error,
    reload,
  };
}

