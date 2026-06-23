import { createContext, useContext, type ReactNode } from "react";
import { useRegistryBatches } from "@/tabs/registry/hooks/useRegistryBatches";
import type { GarboBatchOption } from "@/lib/garbo-batch-types";

type RegistryBatchesContextValue = {
  batches: GarboBatchOption[];
  isLoading: boolean;
  refetch: () => void;
};

const RegistryBatchesContext =
  createContext<RegistryBatchesContextValue | null>(null);

export function RegistryBatchesProvider({ children }: { children: ReactNode }) {
  const value = useRegistryBatches();
  return (
    <RegistryBatchesContext.Provider value={value}>
      {children}
    </RegistryBatchesContext.Provider>
  );
}

export function useRegistryBatchesContext(): RegistryBatchesContextValue {
  const ctx = useContext(RegistryBatchesContext);
  if (!ctx) {
    throw new Error(
      "useRegistryBatchesContext must be used within RegistryBatchesProvider",
    );
  }
  return ctx;
}
