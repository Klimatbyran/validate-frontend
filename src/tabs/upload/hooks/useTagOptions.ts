import { useEffect, useState } from "react";
import { fetchTagOptions } from "@/tabs/editor/lib/tag-options-api";
import type { TagOption } from "@/tabs/editor/lib/types";
import { TOKEN_STORAGE_KEY } from "@/lib/auth-constants";

export function useTagOptions() {
  const [tagOptions, setTagOptions] = useState<TagOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchNow = async () => {
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
    };

    // Initial load
    fetchNow();

    // If the user logs in after page load, token-updated will fire via AuthContext.
    const handleTokenUpdated = (event: Event) => {
      const token = (event as CustomEvent<string>).detail;
      if (!token) return;
      if (typeof localStorage === "undefined") return;
      // Ensure the token is available before the next authenticated request.
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      fetchNow();
    };

    window.addEventListener("token-updated", handleTokenUpdated as EventListener);
    return () => {
      cancelled = true;
      window.removeEventListener(
        "token-updated",
        handleTokenUpdated as EventListener,
      );
    };
  }, []);

  return { tagOptions, loading, error };
}

