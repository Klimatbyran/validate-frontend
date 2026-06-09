import { useEffect, useState, useCallback } from "react";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import { Callout } from "@/ui/callout";
import { SingleSelectDropdown } from "@/ui/single-select-dropdown";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/ui/tabs";
import { ApiKeysListView } from "./components/ApiKeysListView";
import { ApiKeyCreatedDialog } from "./components/ApiKeyCreatedDialog";
import { ApiUsageView } from "./components/ApiUsageView";
import { createAPIkey } from "./lib/api-access-api";
import { useApiAccessData } from "./hooks/useApiAccessData";

export function ApiAccessTab() {
  const { t } = useI18n();
  const {
    roles,
    keys,
    rolesError,
    keysError,
    keysLoading,
    isAuthError,
    refreshKeys,
  } = useApiAccessData();
  const [role, setRole] = useState<string>("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [keyLookup, setKeyLookup] = useState("");
  const [createdKey, setCreatedKey] = useState<{
    name: string;
    apiKey: string;
  } | null>(null);
  const [permissionsOpen, setPermissionsOpen] = useState(false);

  const selectedRole = roles.find((item) => item.slug === role) ?? null;

  const parseRoleLabel = useCallback((label: string | null) => {
    if (!label) return { name: label, description: null };
    const idx = label.indexOf(" — ");
    if (idx === -1) return { name: label, description: null };
    return { name: label.slice(0, idx), description: label.slice(idx + 3) };
  }, []);

  const handleRoleChange = useCallback((newRole: string) => {
    setRole(newRole);
    setPermissionsOpen(false);
  }, []);

  useEffect(() => {
    if (!role && roles.length > 0) {
      setRole(roles[0].slug);
    }
  }, [role, roles]);

  const handleCreateKey = async () => {
    if (isCreating) return;

    if (!selectedRole) {
      setCreateError(t("apiAccess.roleLoadError"));
      return;
    }

    const trimmedName = keyName.trim();
    if (!trimmedName) {
      setCreateError(t("apiAccess.keyNameRequired"));
      return;
    }

    setCreateError(null);
    setIsCreating(true);

    try {
      const created = await createAPIkey({
        name: trimmedName,
        roleId: selectedRole.id,
        keyLookup: keyLookup.trim() || undefined,
      });
      setCreatedKey({ name: trimmedName, apiKey: created.apiKey });
      setKeyName("");
      setKeyLookup("");
      await refreshKeys();
    } catch (error) {
      setCreateError(
        error instanceof Error ? error.message : t("apiAccess.keyCreateError"),
      );
    } finally {
      setIsCreating(false);
    }
  };

  if (isAuthError) {
    return (
      <Callout variant="info">
        <p className="text-sm text-blue-03/90">{t("auth.loginRequiredTab")}</p>
      </Callout>
    );
  }

  return (
    <>
      {createdKey ? (
        <ApiKeyCreatedDialog
          open={true}
          onClose={() => setCreatedKey(null)}
          keyName={createdKey.name}
          apiKey={createdKey.apiKey}
        />
      ) : null}
      <Tabs defaultValue="keys" className="space-y-4">
        <TabsList>
          <TabsTrigger value="keys">{t("apiAccess.tabKeys")}</TabsTrigger>
          <TabsTrigger value="usage">{t("apiAccess.tabUsage")}</TabsTrigger>
        </TabsList>

        <TabsContent value="keys">
          <div className="space-y-6">
            <div className="bg-gray-04/80 backdrop-blur-sm rounded-lg p-6">
              <div>
                <h2 className="text-xl text-gray-01 font-semibold">
                  {t("apiAccess.title")}
                </h2>
                <p className="text-sm text-gray-02 mt-1">
                  {t("apiAccess.subtitle")}
                </p>
              </div>

              <div className="mt-6 space-y-4">
                <div className="flex flex-col gap-1">
                  <div className="text-xs text-gray-02 uppercase tracking-wide">
                    {t("apiAccess.roleLabel")}
                  </div>
                  <div className="flex items-center gap-4 flex-wrap">
                    {roles.length > 0 ? (
                      <SingleSelectDropdown
                        options={roles.map((item) => item.slug)}
                        value={role}
                        onChange={handleRoleChange}
                        placeholder={t("apiAccess.roleLabel")}
                        ariaLabel={t("apiAccess.roleLabel")}
                        getOptionLabel={(value) => {
                          const item = roles.find(
                            (candidate) => candidate.slug === value,
                          );
                          return (
                            parseRoleLabel(item?.label ?? null).name ?? value
                          );
                        }}
                        panelMinWidth={256}
                      />
                    ) : (
                      <p className="text-xs text-gray-02">
                        {t("common.loading")}
                      </p>
                    )}
                    {selectedRole ? (
                      <p className="text-sm text-gray-02">
                        {parseRoleLabel(selectedRole.label).description ?? ""}
                      </p>
                    ) : null}
                  </div>
                  {selectedRole && selectedRole.permissions.length > 0 ? (
                    <div>
                      <button
                        type="button"
                        onClick={() => setPermissionsOpen((v) => !v)}
                        className="mt-1 flex items-center gap-1 text-xs text-gray-02 hover:text-gray-01 transition-colors"
                      >
                        <span>
                          {selectedRole.permissions.length}{" "}
                          {t("apiAccess.permissionsCount")}
                        </span>
                        <svg
                          className={`w-3 h-3 shrink-0 transition-transform duration-150 ${permissionsOpen ? "rotate-180" : ""}`}
                          viewBox="0 0 12 12"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        >
                          <path
                            d="M2 4l4 4 4-4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                      {permissionsOpen ? (
                        <ul className="mt-1.5 flex flex-wrap gap-1.5">
                          {selectedRole.permissions.map((permission) => (
                            <li
                              key={permission.code}
                              className="rounded px-1.5 py-0.5 bg-gray-03 text-xs text-gray-02 font-mono"
                            >
                              {permission.label ?? permission.code}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                {rolesError ? (
                  <p className="text-xs text-red-400">{rolesError}</p>
                ) : null}

                <div className="grid gap-3 lg:grid-cols-[minmax(14rem,1fr)_minmax(14rem,1fr)_auto] lg:items-end">
                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="api-key-name"
                      className="text-xs text-gray-02 uppercase tracking-wide"
                    >
                      {t("apiAccess.keyNameLabel")}
                    </label>
                    <input
                      id="api-key-name"
                      type="text"
                      value={keyName}
                      onChange={(event) => setKeyName(event.target.value)}
                      placeholder={t("apiAccess.keyNamePlaceholder")}
                      className="h-10 rounded-md border border-gray-03 bg-gray-05 px-3 text-sm text-gray-01 placeholder:text-gray-02 focus:outline-none focus:ring-1 focus:ring-blue-300 max-w-[250px]"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="api-key-lookup"
                      className="text-xs text-gray-02 uppercase tracking-wide"
                    >
                      {t("apiAccess.keyLookupLabel")}
                    </label>
                    <input
                      id="api-key-lookup"
                      type="text"
                      value={keyLookup}
                      onChange={(event) => setKeyLookup(event.target.value)}
                      placeholder={t("apiAccess.keyLookupPlaceholder")}
                      className="h-10 rounded-md border border-gray-03 max-w-[250px] bg-gray-05 px-3 text-sm text-gray-01 placeholder:text-gray-02 focus:outline-none focus:ring-1 focus:ring-blue-300"
                    />
                  </div>

                  <Button
                    onClick={handleCreateKey}
                    disabled={isCreating}
                    className="max-w-[200px]"
                  >
                    {t("apiAccess.generateButton")}
                  </Button>
                </div>
              </div>

              {createError ? (
                <p className="mt-3 text-xs text-red-400">{createError}</p>
              ) : null}
            </div>

            <ApiKeysListView
              keys={keys}
              keysLoading={keysLoading}
              keysError={keysError}
              onRevoked={refreshKeys}
            />
          </div>
        </TabsContent>

        <TabsContent value="usage">
          <ApiUsageView />
        </TabsContent>
      </Tabs>
    </>
  );
}
