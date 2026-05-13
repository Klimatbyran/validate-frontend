import { useEffect, useState } from "react";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";
import { fetchAPIAccessRoles } from "./lib/api-access-api";
import type { ClientApiRoleListItem } from "./lib/api-access-types";

function createApiKey(roleSlug: string): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const token = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  const prefix = roleSlug.replace(/[^a-z0-9]/gi, "").toLowerCase() || "api";
  return `${prefix}_${token}`;
}

export function ApiAccessTab() {
  const { t } = useI18n();
  const [roles, setRoles] = useState<ClientApiRoleListItem[]>([]);
  const [role, setRole] = useState<string>("");
  const [generatedApiKey, setGeneratedApiKey] = useState("");
  const [rolesError, setRolesError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadRole = async () => {
      try {
        setRolesError(null);
        const fetchedRoles = await fetchAPIAccessRoles();
        if (isMounted) {
          setRoles(fetchedRoles);
          if (fetchedRoles.length > 0) {
            setRole(fetchedRoles[0].slug);
          }
        }
      } catch (error) {
        if (isMounted) {
          const message =
            error instanceof Error
              ? error.message
              : t("apiAccess.roleLoadError");
          setRolesError(message);
        }
      }
    };

    void loadRole();

    return () => {
      isMounted = false;
    };
  }, [t]);

  return (
    <div className="space-y-6">
      <div className="bg-gray-04/80 backdrop-blur-sm rounded-lg p-6">
        <div>
          <h2 className="text-xl text-gray-01 font-semibold">
            {t("apiAccess.title")}
          </h2>
          <p className="text-sm text-gray-02 mt-1">{t("apiAccess.subtitle")}</p>
        </div>

        <div className="mt-6 flex flex-wrap items-end gap-4">
          <div className="min-w-[280px] flex-1 flex flex-col gap-1">
            <div className="text-xs text-gray-02 uppercase tracking-wide">
              {t("apiAccess.roleLabel")}
            </div>

            {roles.length > 0 ? (
              <Tabs value={role} onValueChange={setRole} className="w-full">
                <TabsList className="inline-flex bg-gray-04/50 p-1 rounded-full">
                  {roles.map((item) => (
                    <TabsTrigger
                      key={item.id}
                      value={item.slug}
                      className="rounded-full"
                    >
                      {item.label ?? item.slug}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {roles.map((item) => (
                  <TabsContent key={item.id} value={item.slug} className="mt-2">
                    <p className="text-xs text-gray-02">
                      {t("apiAccess.permissions")}
                      {item.permissions
                        .map(
                          (permission) => permission.label ?? permission.code,
                        )
                        .join(", ")}
                    </p>
                  </TabsContent>
                ))}
              </Tabs>
            ) : (
              <p className="text-xs text-gray-02">{t("common.loading")}</p>
            )}

            {rolesError ? (
              <p className="text-xs text-red-400 mt-2">{rolesError}</p>
            ) : null}
          </div>

          <Button onClick={() => setGeneratedApiKey(createApiKey(role))}>
            {t("apiAccess.generateButton")}
          </Button>
        </div>
      </div>

      <div className="bg-gray-04/80 backdrop-blur-sm rounded-lg p-6">
        <div className="text-sm font-semibold text-gray-01">
          {t("apiAccess.generatedKeyLabel")}
        </div>
        <div className="mt-3 min-h-14 rounded-md border border-gray-03 bg-gray-05 px-4 py-3 font-mono text-sm text-gray-01 break-all flex items-center">
          {generatedApiKey || t("apiAccess.generatedKeyPlaceholder")}
        </div>
      </div>
    </div>
  );
}
