import { useI18n } from "@/contexts/I18nContext";
import type { RegistryBulkProgress } from "../lib/registry-types";

type RegistryBulkUploadProgressProps = {
  progress: RegistryBulkProgress;
};

export function RegistryBulkUploadProgress({
  progress,
}: RegistryBulkUploadProgressProps) {
  const { t } = useI18n();
  const { phase, completed, total } = progress;
  const percent =
    total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
  const isStarting = completed === 0 && total > 0;

  const label =
    phase === "upload"
      ? t("registry.bulkUploadProgressUpload", { completed, total })
      : t("registry.bulkUploadProgressSave", { completed, total });

  return (
    <div className="space-y-2" role="status" aria-live="polite">
      <div className="flex items-center justify-between gap-3 text-sm text-gray-02">
        <span>{label}</span>
        <span className="tabular-nums shrink-0">
          {isStarting ? "…" : `${percent}%`}
        </span>
      </div>
      <div className="relative h-2 w-full rounded-full bg-gray-03 overflow-hidden">
        {isStarting && (
          <div
            className="absolute inset-0 bg-orange-03/25 animate-pulse"
            aria-hidden
          />
        )}
        <div
          className="relative h-full rounded-full bg-orange-03 transition-[width] duration-300 ease-out"
          style={{ width: `${Math.max(isStarting ? 2 : 0, percent)}%` }}
          role="progressbar"
          aria-valuenow={completed}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label={label}
        />
      </div>
    </div>
  );
}
