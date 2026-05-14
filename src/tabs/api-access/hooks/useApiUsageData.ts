import { useCallback, useState } from "react";
import { useI18n } from "@/contexts/I18nContext";
import { fetchApiKeyUsage } from "../lib/api-access-api";
import type { ApiKeyUsageList } from "../lib/api-access-types";

export function useApiUsageData() {
  const { t } = useI18n();
  const [usage, setUsage] = useState<ApiKeyUsageList>([]);
  const [usageError, setUsageError] = useState<string | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [since, setSince] = useState<string>("");

  const loadUsage = useCallback(
    async (sinceValue?: string) => {
      setUsageError(null);
      setUsageLoading(true);
      try {
        const data = await fetchApiKeyUsage(sinceValue || undefined);
        setUsage(data);
      } catch (error) {
        setUsageError(
          error instanceof Error
            ? error.message
            : t("apiAccess.usage.loadError"),
        );
      } finally {
        setUsageLoading(false);
      }
    },
    [t],
  );

  return {
    usage,
    usageError,
    usageLoading,
    since,
    setSince,
    loadUsage,
  };
}
