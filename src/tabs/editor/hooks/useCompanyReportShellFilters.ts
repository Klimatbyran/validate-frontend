import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getPeriodShellKey,
  groupPeriodsByReportShell,
  type CompanyReportShellGroup,
} from "../lib/company-report-shells";
import type { GarboReportingPeriodSummary } from "../lib/types";

type UseCompanyReportShellFiltersOptions = {
  /** When true, filter to the newest report shell on load and company change. */
  defaultToLatestShell?: boolean;
};

/**
 * Filter reporting periods by CompanyReport shell (report year + companyReportId).
 * When not showing all, use multi-select on shell keys.
 */
export function useCompanyReportShellFilters(
  periods: GarboReportingPeriodSummary[],
  resetKey: string,
  options?: UseCompanyReportShellFiltersOptions,
) {
  const defaultToLatestShell = options?.defaultToLatestShell ?? false;

  const [showAllReports, setShowAllReports] = useState(!defaultToLatestShell);
  const [selectedShellKeys, setSelectedShellKeys] = useState<string[]>([]);
  const pendingLatestDefault = useRef(defaultToLatestShell);
  const lastResetKey = useRef<string | null>(null);

  const shells = useMemo(() => groupPeriodsByReportShell(periods), [periods]);

  useEffect(() => {
    if (lastResetKey.current === resetKey) return;
    lastResetKey.current = resetKey;

    if (defaultToLatestShell) {
      pendingLatestDefault.current = true;
      setShowAllReports(false);
      setSelectedShellKeys([]);
      return;
    }

    pendingLatestDefault.current = false;
    setShowAllReports(true);
    setSelectedShellKeys([]);
  }, [resetKey, defaultToLatestShell]);

  useEffect(() => {
    if (!pendingLatestDefault.current) return;
    const latestShellKey = groupPeriodsByReportShell(periods)[0]?.shellKey;
    if (!latestShellKey) return;
    setSelectedShellKeys([latestShellKey]);
    pendingLatestDefault.current = false;
  }, [periods]);

  const filterPeriodsByShell = useCallback(
    <T extends GarboReportingPeriodSummary>(list: T[]): T[] => {
      if (showAllReports) return list;
      if (selectedShellKeys.length === 0) {
        return defaultToLatestShell ? [] : list;
      }
      return list.filter((period) =>
        selectedShellKeys.includes(getPeriodShellKey(period)),
      );
    },
    [showAllReports, selectedShellKeys, defaultToLatestShell],
  );

  const visibleShellGroups = useCallback(
    (list: GarboReportingPeriodSummary[]): CompanyReportShellGroup[] => {
      const grouped = groupPeriodsByReportShell(list);
      if (showAllReports) return grouped;
      if (selectedShellKeys.length === 0) {
        return defaultToLatestShell ? [] : grouped;
      }
      return grouped.filter((group) =>
        selectedShellKeys.includes(group.shellKey),
      );
    },
    [showAllReports, selectedShellKeys, defaultToLatestShell],
  );

  return {
    shells,
    showAllReports,
    setShowAllReports,
    selectedShellKeys,
    setSelectedShellKeys,
    filterPeriodsByShell,
    visibleShellGroups,
  };
}
