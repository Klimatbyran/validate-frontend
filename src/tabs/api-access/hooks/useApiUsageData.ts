import { useCallback, useState } from "react";
import { useI18n } from "@/contexts/I18nContext";
import { fetchApiKeyUsage, ApiAuthError } from "../lib/api-access-api";
import type { ApiKeyUsageList } from "../lib/api-access-types";

export function useApiUsageData() {
  const { t } = useI18n();
  const [usage, setUsage] = useState<ApiKeyUsageList>([]);
  const [usageError, setUsageError] = useState<string | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [isAuthError, setIsAuthError] = useState(false);
  const [since, setSince] = useState<string>("");

  const loadUsage = useCallback(
    async (sinceValue?: string) => {
      setUsageError(null);
      setIsAuthError(false);
      setUsageLoading(true);
      try {
        const data = await fetchApiKeyUsage(sinceValue || undefined);
        setUsage(data);
      } catch (error) {
        if (error instanceof ApiAuthError) {
          setIsAuthError(true);
        } else {
          setUsageError(
            error instanceof Error
              ? error.message
              : t("apiAccess.usage.loadError"),
          );
        }
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
    isAuthError,
    since,
    setSince,
    loadUsage,
  };
}
