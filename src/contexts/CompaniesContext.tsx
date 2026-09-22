/**
 * CompaniesContext — queue/company data for the Jobbstatus tab.
 * Mount only under Jobbstatus so queue polling does not run on other tabs.
 */

import { createContext, useContext, type ReactNode } from "react";
import { useCompanies } from "@/hooks/useCompanies";
import type { CustomAPICompany } from "@/lib/types";

export interface CompaniesContextValue {
  companies: CustomAPICompany[];
  isLoading: boolean;
  error: string | null;
  loadMoreCompanies: () => Promise<void>;
  isLoadingMore: boolean;
  hasMorePages: boolean;
  refresh: () => void;
  isRefreshing: boolean;
}

const CompaniesContext = createContext<CompaniesContextValue | undefined>(
  undefined,
);

export function CompaniesProvider({ children }: { children: ReactNode }) {
  const value = useCompanies();
  return (
    <CompaniesContext.Provider value={value}>
      {children}
    </CompaniesContext.Provider>
  );
}

export function useCompaniesContext(): CompaniesContextValue {
  const ctx = useContext(CompaniesContext);
  if (ctx === undefined) {
    throw new Error(
      "useCompaniesContext must be used within CompaniesProvider",
    );
  }
  return ctx;
}
