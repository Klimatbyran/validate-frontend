import { useEffect, useState } from "react";
import { listCompanies } from "@/tabs/editor/lib/companies-api";

/**
 * Wikidata ID → tag slugs from Garbo GET /companies (same source as editor list).
 * Used for registry tag filters only.
 */
export function useGarboCompanyTagsMap(): {
  wikidataToTags: Record<string, string[]> | null;
  loading: boolean;
  error: string | null;
} {
  const [wikidataToTags, setWikidataToTags] = useState<Record<
    string,
    string[]
  > | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void listCompanies()
      .then((list) => {
        if (cancelled) return;
        const m: Record<string, string[]> = {};
        for (const c of list) {
          if (c.wikidataId) m[c.wikidataId] = c.tags ?? [];
        }
        setWikidataToTags(m);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setWikidataToTags(null);
          setError(e instanceof Error ? e.message : "Unknown error");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { wikidataToTags, loading, error };
}
