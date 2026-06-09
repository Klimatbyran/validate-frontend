import { useEffect, useMemo, useState } from "react";
import { getPeriodYear } from "../lib/reporting-period-ui";

type PeriodLike = { startDate: string; endDate: string };

/**
 * Sort order, year filter, and derived period lists for spreadsheet-style period tabs.
 */
export function useReportingPeriodColumnFilters<TPeriod extends PeriodLike>(
  periods: TPeriod[],
  resetKey: string,
) {
  const [showAllYears, setShowAllYears] = useState(true);
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  useEffect(() => {
    setShowAllYears(true);
    setSelectedYears([]);
    setSortOrder("desc");
  }, [resetKey]);

  const sortedPeriods = useMemo(() => {
    const key = (p: TPeriod) => p.endDate ?? p.startDate ?? "";
    const sorted = [...periods].sort((a, b) => key(b).localeCompare(key(a)));
    return sortOrder === "desc" ? sorted : sorted.slice().reverse();
  }, [periods, sortOrder]);

  const years = useMemo(() => {
    const set = new Set<string>();
    sortedPeriods.forEach((p) => {
      const y = getPeriodYear(p);
      if (y) set.add(y);
    });
    const arr = Array.from(set).sort((a, b) => b.localeCompare(a));
    return sortOrder === "desc" ? arr : arr.slice().reverse();
  }, [sortedPeriods, sortOrder]);

  const visiblePeriods = useMemo(() => {
    const base = sortedPeriods;
    if (showAllYears) return base;
    if (!selectedYears.length) return base;
    return base.filter((p) => {
      const y = getPeriodYear(p);
      return y ? selectedYears.includes(y) : false;
    });
  }, [sortedPeriods, selectedYears, showAllYears]);

  return {
    showAllYears,
    setShowAllYears,
    selectedYears,
    setSelectedYears,
    sortOrder,
    setSortOrder,
    sortedPeriods,
    years,
    visiblePeriods,
  };
}
