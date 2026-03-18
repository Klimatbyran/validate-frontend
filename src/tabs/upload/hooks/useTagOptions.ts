import { useEffect, useState } from "react";
import { fetchTagOptions } from "@/tabs/editor/lib/tag-options-api";
import type { TagOption } from "@/tabs/editor/lib/types";

export function useTagOptions() {
  const [tagOptions, setTagOptions] = useState<TagOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const opts = await fetchTagOptions();
        if (cancelled) return;
        setTagOptions([...opts].sort((a, b) => a.slug.localeCompare(b.slug)));
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        setTagOptions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { tagOptions, loading, error };
}

