import { useI18n } from "@/contexts/I18nContext";
import { ApiKeyRevealDialog } from "./ApiKeyRevealDialog";
import type { ClientApiKeyList } from "../lib/api-access-types";

type ApiKeysListViewProps = {
  keys: ClientApiKeyList;
  keysLoading: boolean;
  keysError: string | null;
  apiKeysById?: Record<string, string>;
};

function formatDate(value: string | null): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

export function ApiKeysListView({
  keys,
  keysLoading,
  keysError,
  apiKeysById,
}: ApiKeysListViewProps) {
  const { t } = useI18n();

  const getStatusLabel = (revokedAt: string | null): string => {
    if (revokedAt) return t("apiAccess.keysStatusRevoked");
    return t("apiAccess.keysStatusActive");
  };

  return (
    <div className="bg-gray-04/80 backdrop-blur-sm rounded-lg p-6">
      <div className="text-sm font-semibold text-gray-01">
        {t("apiAccess.keysListTitle")}
      </div>

      {keysLoading ? (
        <p className="mt-3 text-xs text-gray-02">{t("common.loading")}</p>
      ) : keysError ? (
        <p className="mt-3 text-xs text-red-400">{keysError}</p>
      ) : keys.length === 0 ? (
        <p className="mt-3 text-xs text-gray-02">{t("apiAccess.keysEmpty")}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {keys.map((keyItem) => (
            <li
              key={keyItem.id}
              className="rounded-md border border-gray-03 bg-gray-05 px-3 py-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-gray-01 truncate">
                    {keyItem.name}
                  </p>
                  <p className="text-xs text-gray-02 truncate font-mono">
                    {keyItem.keyLookup}
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-1.5">
                  <ApiKeyRevealDialog
                    keyName={keyItem.name}
                    apiKey={apiKeysById?.[keyItem.id] || keyItem.apiKey || null}
                  />
                  <span
                    className={
                      keyItem.revokedAt
                        ? "text-xs text-gray-02"
                        : "text-xs text-green-300"
                    }
                  >
                    {getStatusLabel(keyItem.revokedAt)}
                  </span>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-02">
                <span>
                  {t("apiAccess.keysRole")}:{" "}
                  {keyItem.role.label ?? keyItem.role.slug}
                </span>
                <span>
                  {t("apiAccess.keysCreated")}:{" "}
                  {formatDate(keyItem.createdAt) || t("common.placeholderDash")}
                </span>
                <span>
                  {t("apiAccess.keysLastUsed")}:{" "}
                  {formatDate(keyItem.lastUsedAt) ||
                    t("common.placeholderDash")}
                </span>
                <span>
                  {t("apiAccess.keysRevoked")}:{" "}
                  {formatDate(keyItem.revokedAt) || t("common.placeholderDash")}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
