/**
 * CompaniesContext - Shared companies data and refresh for Job status and Debug tabs.
 * Provider stays mounted so data is preloaded and persists when switching tabs.
 */

import type { ReactNode } from "react";
import { useCompanies } from "@/hooks/useCompanies";
import { CompaniesContext } from "@/contexts/companies-context";

export function CompaniesProvider({ children }: { children: ReactNode }) {
  const value = useCompanies();
  return (
    <CompaniesContext.Provider value={value}>
      {children}
    </CompaniesContext.Provider>
  );
}
