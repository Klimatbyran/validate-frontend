import { useEffect, useState } from "react";
import type { GroupedCompany } from "@/lib/types";
import { queueStore } from "@/lib/queue-store";

export function useGroupedCompanies() {
  const [companies, setCompanies] = useState<GroupedCompany[]>([]);

  useEffect(() => {
    const subscription = queueStore
      .getGroupedCompanies()
      .subscribe(newCompanies => setCompanies(newCompanies));

    return () => subscription.unsubscribe();
  }, []);

  return companies;
}
