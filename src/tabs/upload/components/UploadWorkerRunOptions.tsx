import { useI18n } from "@/contexts/I18nContext";
import { cn } from "@/lib/utils";
import { RUN_ONLY_WORKERS, type RunOnlyWorkerId } from "@/lib/run-only-workers";

export interface UploadWorkerRunOptionsProps {
  runAllWorkers: boolean;
  onRunAllWorkersChange: (value: boolean) => void;
  selectedWorkers: RunOnlyWorkerId[];
  onSelectedWorkersChange: (workerId: RunOnlyWorkerId, checked: boolean) => void;
  forceReindex: boolean;
  onForceReindexChange: (value: boolean) => void;
}

export function UploadWorkerRunOptions({
  runAllWorkers,
  onRunAllWorkersChange,
  selectedWorkers,
  onSelectedWorkersChange,
  forceReindex,
  onForceReindexChange,
}: UploadWorkerRunOptionsProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      {/* Run all/partial + run only – single row, pills inline */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-02">{t("upload.runLabel")}</span>
          <div className="flex items-center gap-1 bg-gray-03 rounded-full p-0.5">
            <button
              type="button"
              onClick={() => onRunAllWorkersChange(true)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                runAllWorkers ? "bg-gray-01 text-gray-05" : "text-gray-02 hover:text-gray-01",
              )}
            >
              {t("upload.runAll")}
            </button>
            <button
              type="button"
              onClick={() => onRunAllWorkersChange(false)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                !runAllWorkers ? "bg-gray-01 text-gray-05" : "text-gray-02 hover:text-gray-01",
              )}
            >
              {t("upload.runPartial")}
            </button>
          </div>
        </div>

        <div
          className={cn(
            "flex flex-wrap items-center gap-2 transition-opacity",
            runAllWorkers && "opacity-50 pointer-events-none",
          )}
        >
          <span className="text-sm text-gray-02 shrink-0">{t("upload.runOnly")}</span>
          <div className="flex flex-wrap gap-1.5">
            {RUN_ONLY_WORKERS.map((worker) => {
              const isSelected = selectedWorkers.includes(worker.id);
              return (
                <button
                  key={worker.id}
                  type="button"
                  onClick={() => onSelectedWorkersChange(worker.id, !isSelected)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                    isSelected
                      ? "bg-gray-01 text-gray-05"
                      : "text-gray-02 hover:text-gray-01 bg-gray-03/80 hover:bg-gray-03",
                  )}
                >
                  {t(`jobstatus.rerunWorkers.${worker.id}`)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Force reindex */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-03/50">
        <label htmlFor="force-reindex" className="text-sm text-gray-01 cursor-pointer">
          {t("upload.forceReindex")}
        </label>
        <button
          id="force-reindex"
          type="button"
          role="switch"
          aria-checked={forceReindex}
          onClick={() => onForceReindexChange(!forceReindex)}
          className={cn(
            "relative inline-flex h-6 w-11 items-center rounded-full",
            "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            forceReindex ? "bg-orange-03" : "bg-gray-03",
          )}
        >
          <span
            className={cn(
              "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
              forceReindex ? "translate-x-6" : "translate-x-1",
            )}
          />
        </button>
      </div>
      <p className="text-xs text-gray-02">{t("upload.forceReindexDescription")}</p>
    </div>
  );
}

