/**
 * CompaniesContext - Shared companies data and refresh for Job status and Debug tabs.
 * Provider stays mounted so data is preloaded and persists when switching tabs.
 */

import { createContext, useContext, type ReactNode } from "react";
import { useCompanies } from "@/hooks/useCompanies";
import type { CustomAPICompany } from "@/lib/types";

export interface CompaniesContextValue {
  companies: CustomAPICompany[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
  isRefreshing: boolean;
}

const CompaniesContext = createContext<CompaniesContextValue | undefined>(
  undefined
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
    throw new Error("useCompaniesContext must be used within CompaniesProvider");
  }
  return ctx;
}
