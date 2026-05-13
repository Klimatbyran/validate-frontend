import { useI18n } from "@/contexts/I18nContext";
import { UploadRunOptions } from "@/tabs/upload/components/UploadRunOptions";
import type { RunReportsPipelineRunOptions } from "@/hooks/useRunReportsPipeline";
import type { RunReportListItem } from "@/lib/run-reports-types";
import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";

export interface RunReportsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: RunReportListItem[];
  autoApprove: boolean;
  onAutoApproveChange: (value: boolean) => void;
  runOptions: RunReportsPipelineRunOptions;
  onRunReports: () => void;
  isRunning: boolean;
}

export function RunReportsModal({
  open,
  onOpenChange,
  items,
  autoApprove,
  onAutoApproveChange,
  runOptions,
  onRunReports,
  isRunning,
}: RunReportsModalProps) {
  const { t } = useI18n();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("registry.runReports")}</DialogTitle>
          <DialogDescription>
            {t("registry.runReportsDescription", {
              count: items.length,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-gray-03 bg-gray-03/20 p-4">
            <p className="text-sm font-medium text-gray-01 mb-2">
              {t("registry.selectedReportsList", { count: items.length })}
            </p>
            <ul className="space-y-1 max-h-40 overflow-y-auto pr-2">
              {items.map((entry) => {
                const key = entry.id ?? `${entry.wikidataId ?? ""}-${entry.url}`;
                return (
                  <li key={key} className="text-sm text-gray-02 truncate" title={entry.url}>
                    {(entry.companyName && entry.companyName.trim()) || entry.url}
                  </li>
                );
              })}
            </ul>
          </div>

          <UploadRunOptions
            batch={runOptions.batch}
            tags={runOptions.tags}
            workers={{
              ...runOptions.workers,
              autoApprove,
              onAutoApproveChange,
            }}
            dropdownUsePortal={false}
          />
        </div>

        <DialogFooter>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isRunning}
          >
            {t("registry.cancel")}
          </Button>
          <Button
            size="sm"
            onClick={() => void onRunReports()}
            disabled={isRunning || items.length === 0}
          >
            {isRunning ? t("registry.runningReports") : t("registry.runReports")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
