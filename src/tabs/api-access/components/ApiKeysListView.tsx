import { useState } from "react";
import { Ban } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { ConfirmDialog } from "@/ui/confirm-dialog";
import { revokeAPIKey } from "../lib/api-access-api";
import type { ClientApiKeyList } from "../lib/api-access-types";

type ApiKeysListViewProps = {
  keys: ClientApiKeyList;
  keysLoading: boolean;
  keysError: string | null;
  onRevoked: () => void;
};

export function ApiKeysListView({
  keys,
  keysLoading,
  keysError,
  onRevoked,
}: ApiKeysListViewProps) {
  const { t, formatDate } = useI18n();
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRevoke = async () => {
    if (!revoking) return;
    setIsSubmitting(true);
    setRevokeError(null);
    try {
      await revokeAPIKey(revoking);
      setRevoking(null);
      onRevoked();
    } catch (error) {
      setRevokeError(
        error instanceof Error ? error.message : t("apiAccess.revokeError"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const revokingKey = keys.find((k) => k.id === revoking);

  return (
    <>
      <ConfirmDialog
        open={revoking !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRevoking(null);
            setRevokeError(null);
          }
        }}
        title={t("apiAccess.revokeDialog.title")}
        description={
          <span>
            {t("apiAccess.revokeDialog.description", {
              name: revokingKey?.name ?? "",
            })}
            {revokeError ? (
              <span className="block mt-2 text-pink-03">{revokeError}</span>
            ) : null}
          </span>
        }
        cancelLabel={t("apiAccess.revokeDialog.cancel")}
        confirmLabel={t("apiAccess.revokeDialog.confirm")}
        confirmVariant="revoke"
        onConfirm={handleRevoke}
        isLoading={isSubmitting}
      />

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
            {keys.map((keyItem) => {
              const isRevoked = keyItem.revokedAt !== null;
              return (
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
                    <div className="shrink-0 flex items-center gap-2">
                      {isRevoked ? (
                        <span className="text-xs text-pink-03">
                          {t("apiAccess.keysStatusRevoked")}
                        </span>
                      ) : (
                        <>
                          <span className="text-xs text-green-300">
                            {t("apiAccess.keysStatusActive")}
                          </span>
                          <button
                            type="button"
                            onClick={() => setRevoking(keyItem.id)}
                            title={t("apiAccess.revokeAria", { name: keyItem.name })}
                            aria-label={t("apiAccess.revokeAria", { name: keyItem.name })}
                            className="text-gray-02 hover:text-pink-03 transition-colors"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-02">
                    <span>
                      {t("apiAccess.keysRole")}:{" "}
                      {keyItem.role.label ?? keyItem.role.slug}
                    </span>
                    <span>
                      {t("apiAccess.keysCreated")}:{" "}
                      {formatDate(new Date(keyItem.createdAt))}
                    </span>
                    <span>
                      {t("apiAccess.keysLastUsed")}:{" "}
                      {formatDate(keyItem.lastUsedAt ? new Date(keyItem.lastUsedAt) : null)}
                    </span>
                    {isRevoked ? (
                      <span className="text-pink-03/80">
                        {t("apiAccess.keysRevoked")}:{" "}
                        {formatDate(keyItem.revokedAt ? new Date(keyItem.revokedAt) : null)}
                      </span>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
