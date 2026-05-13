import { useEffect, useState } from "react";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import { SingleSelectDropdown } from "@/ui/single-select-dropdown";
import { ApiKeysListView } from "./components/ApiKeysListView";
import { createAPIkey } from "./lib/api-access-api";
import { useApiAccessData } from "./hooks/useApiAccessData";

export function ApiAccessTab() {
  const { t } = useI18n();
  const { roles, keys, rolesError, keysError, keysLoading, refreshKeys } =
    useApiAccessData();
  const [role, setRole] = useState<string>("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [keyLookup, setKeyLookup] = useState("");
  const [apiKeysById, setApiKeysById] = useState<Record<string, string>>({});

  const selectedRole = roles.find((item) => item.slug === role) ?? null;

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
      setApiKeysById((prev) => ({
        ...prev,
        [created.id]: created.apiKey,
      }));
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

  return (
    <div className="space-y-6">
      <div className="bg-gray-04/80 backdrop-blur-sm rounded-lg p-6">
        <div>
          <h2 className="text-xl text-gray-01 font-semibold">
            {t("apiAccess.title")}
          </h2>
          <p className="text-sm text-gray-02 mt-1">{t("apiAccess.subtitle")}</p>
        </div>

        <div className="mt-6 space-y-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(22rem,1fr)_minmax(18rem,1fr)]">
            <div className="flex flex-col gap-1">
              <div className="text-xs text-gray-02 uppercase tracking-wide">
                {t("apiAccess.roleLabel")}
              </div>
              {roles.length > 0 ? (
                <SingleSelectDropdown
                  options={roles.map((item) => item.slug)}
                  value={role}
                  onChange={setRole}
                  placeholder={t("apiAccess.roleLabel")}
                  ariaLabel={t("apiAccess.roleLabel")}
                  getOptionLabel={(value) => {
                    const item = roles.find(
                      (candidate) => candidate.slug === value,
                    );
                    return item?.label ?? value;
                  }}
                  wrapperClassName="w-full"
                  triggerClassName="!w-full justify-between"
                  triggerTextClassName="max-w-none"
                  panelMinWidth={360}
                />
              ) : (
                <p className="text-xs text-gray-02">{t("common.loading")}</p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <div className="text-xs text-gray-02 uppercase tracking-wide">
                {t("apiAccess.permissions")}
              </div>
              <div className="rounded-md border border-gray-03 bg-gray-05 px-3 py-2 min-h-10 flex items-center">
                <p className="text-xs text-gray-02">
                  {selectedRole
                    ? selectedRole.permissions
                        .map(
                          (permission) => permission.label ?? permission.code,
                        )
                        .join(", ")
                    : t("common.placeholderDash")}
                </p>
              </div>
            </div>
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
        apiKeysById={apiKeysById}
      />
    </div>
  );
}
