import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/contexts/I18nContext";
import { fetchAPIAccessRoles, fetchAPIKeys, ApiAuthError } from "../lib/api-access-api";
import type {
  ClientApiKeyList,
  ClientApiRoleListItem,
} from "../lib/api-access-types";

export function useApiAccessData() {
  const { t } = useI18n();
  const [roles, setRoles] = useState<ClientApiRoleListItem[]>([]);
  const [keys, setKeys] = useState<ClientApiKeyList>([]);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [keysError, setKeysError] = useState<string | null>(null);
  const [keysLoading, setKeysLoading] = useState(true);
  const [isAuthError, setIsAuthError] = useState(false);

  const refreshKeys = useCallback(async () => {
    setKeysError(null);
    setKeysLoading(true);
    try {
      const fetchedKeys = await fetchAPIKeys();
      setKeys(fetchedKeys);
    } catch (error) {
      setKeysError(
        error instanceof Error ? error.message : t("apiAccess.keysLoadError"),
      );
    } finally {
      setKeysLoading(false);
    }
  }, [t]);

  const loadInitialData = useCallback(async () => {
    setRolesError(null);
    setKeysError(null);
    setIsAuthError(false);
    setKeysLoading(true);

    try {
      const [fetchedRoles, fetchedKeys] = await Promise.all([
        fetchAPIAccessRoles(),
        fetchAPIKeys(),
      ]);
      setRoles(fetchedRoles);
      setKeys(fetchedKeys);
    } catch (error) {
      if (error instanceof ApiAuthError) {
        setIsAuthError(true);
      } else {
        const message =
          error instanceof Error ? error.message : t("apiAccess.roleLoadError");
        setRolesError(message);
        setKeysError(
          error instanceof Error ? error.message : t("apiAccess.keysLoadError"),
        );
      }
    } finally {
      setKeysLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadInitialData();
  }, [loadInitialData]);

  return {
    roles,
    keys,
    rolesError,
    keysError,
    keysLoading,
    isAuthError,
    refreshKeys,
  };
}
