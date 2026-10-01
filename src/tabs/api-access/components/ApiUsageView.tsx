import { useEffect, useState } from "react";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import { Callout } from "@/ui/callout";
import { useApiUsageData } from "../hooks/useApiUsageData";
import type { KeyUsage } from "../lib/api-access-types";

function UsageKeySection({ item }: { item: KeyUsage }) {
  const { t, formatDate } = useI18n();
  const [open, setOpen] = useState(false);
  const endpointCount = item.endpoints.length;

  return (
    <li className="rounded-md border border-gray-03 bg-gray-05">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="w-full px-3 py-3 text-left hover:bg-gray-03/20 transition-colors rounded-md"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-gray-01 font-mono truncate">
              {item.keyLookup}
            </p>
            <p className="text-xs text-gray-02">
              {t("apiAccess.usage.role")}: {item.roleSlug}
              {item.lastRequestAt
                ? ` · ${t("apiAccess.usage.lastRequest")}: ${formatDate(new Date(item.lastRequestAt))}`
                : ""}
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm text-gray-01 font-semibold">
                {item.totalRequests.toLocaleString()}
              </p>
              <p className="text-xs text-gray-02">
                {t("apiAccess.usage.requests")}
                {endpointCount > 0
                  ? ` · ${t("apiAccess.usage.endpointCount", { count: endpointCount })}`
                  : ""}
              </p>
            </div>
            <svg
              className={`w-3.5 h-3.5 shrink-0 text-gray-02 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden
            >
              <path
                d="M2 4l4 4 4-4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </button>

      {open ? (
        <div className="px-3 pb-3 border-t border-gray-03 pt-2">
          {endpointCount > 0 ? (
            <>
              <p className="text-xs text-gray-02 uppercase tracking-wide mb-1">
                {t("apiAccess.usage.endpoints")}
              </p>
              <ul className="space-y-0.5">
                {item.endpoints.map((ep) => (
                  <li
                    key={`${ep.service ?? "unknown"}:${ep.method}:${ep.path}`}
                    className="flex items-center justify-between text-xs gap-2"
                  >
                    <span className="font-mono text-gray-02 min-w-0 truncate">
                      <span className="text-gray-02/80">
                        {ep.service ?? t("apiAccess.usage.serviceUnknown")}{" "}
                      </span>
                      <span className="text-blue-300">{ep.method}</span>{" "}
                      {ep.path}
                    </span>
                    <span className="text-gray-02 tabular-nums shrink-0">
                      {ep.count.toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-xs text-gray-02">
              {t("apiAccess.usage.noEndpoints")}
            </p>
          )}
        </div>
      ) : null}
    </li>
  );
}

export function ApiUsageView() {
  const { t } = useI18n();
  const {
    usage,
    usageError,
    usageLoading,
    isAuthError,
    since,
    setSince,
    loadUsage,
  } = useApiUsageData();

  useEffect(() => {
    void loadUsage();
  }, [loadUsage]);

  const handleRefresh = () => {
    const sinceIso = since ? new Date(since).toISOString() : undefined;
    void loadUsage(sinceIso);
  };

  if (isAuthError) {
    return (
      <Callout variant="info">
        <p className="text-sm text-blue-03/90">{t("auth.loginRequiredTab")}</p>
      </Callout>
    );
  }

  return (
    <div className="bg-gray-04/80 backdrop-blur-sm rounded-lg p-6 space-y-4">
      <div className="flex items-end gap-3 flex-wrap">
        <div className="flex flex-col gap-1">
          <label
            htmlFor="usage-since"
            className="text-xs text-gray-02 uppercase tracking-wide"
          >
            {t("apiAccess.usage.sinceLabel")}
          </label>
          <input
            id="usage-since"
            type="datetime-local"
            value={since}
            onChange={(e) => setSince(e.target.value)}
            className="h-10 rounded-md border border-gray-03 bg-gray-05 px-3 text-sm text-gray-01 focus:outline-none focus:ring-1 focus:ring-blue-300"
          />
        </div>
        <Button onClick={handleRefresh} disabled={usageLoading}>
          {t("apiAccess.usage.refreshButton")}
        </Button>
      </div>

      {usageLoading ? (
        <p className="text-xs text-gray-02">{t("common.loading")}</p>
      ) : usageError ? (
        <p className="text-xs text-red-400">{usageError}</p>
      ) : usage.length === 0 ? (
        <p className="text-xs text-gray-02">{t("apiAccess.usage.empty")}</p>
      ) : (
        <ul className="space-y-2">
          {usage.map((item) => (
            <UsageKeySection key={item.keyId} item={item} />
          ))}
        </ul>
      )}
    </div>
  );
}
