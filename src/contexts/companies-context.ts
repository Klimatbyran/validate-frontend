import { createContext, useContext } from "react";
import type { CustomAPICompany, CustomAPIQueueStats } from "@/lib/types";

export interface CompaniesContextValue {
  companies: CustomAPICompany[];
  queueStats: CustomAPIQueueStats[];
  isQueueStatsLoading: boolean;
  isLoading: boolean;
  error: string | null;
  loadMoreCompanies: () => Promise<void>;
  isLoadingMore: boolean;
  hasMorePages: boolean;
  refresh: () => void;
  isRefreshing: boolean;
}

export const CompaniesContext = createContext<
  CompaniesContextValue | undefined
>(undefined);

export function useCompaniesContext(): CompaniesContextValue {
  const ctx = useContext(CompaniesContext);
  if (ctx === undefined) {
    throw new Error(
      "useCompaniesContext must be used within CompaniesProvider",
    );
  }
  return ctx;
}
