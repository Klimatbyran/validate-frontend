import { useI18n } from "@/contexts/I18nContext";
import { UploadRunOptions } from "@/tabs/upload/components/UploadRunOptions";
import type { UploadBatchOptionsProps } from "@/tabs/upload/components/UploadBatchOptions";
import type { UploadTagsOptionsProps } from "@/tabs/upload/components/UploadTagsOptions";
import type { UploadWorkerRunOptionsProps } from "@/tabs/upload/components/UploadWorkerRunOptions";
import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import type { RegistryEntry } from "../lib/registry-types";

interface RegistryRunReportsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedReports: RegistryEntry[];
  autoApprove: boolean;
  onAutoApproveChange: (value: boolean) => void;
  runOptions: {
    batch: UploadBatchOptionsProps;
    tags: UploadTagsOptionsProps;
    workers: UploadWorkerRunOptionsProps;
  };
  onRunReports: () => Promise<void>;
  isRunning: boolean;
}

const RegistryRunReportsModal = ({
  open,
  onOpenChange,
  selectedReports,
  autoApprove,
  onAutoApproveChange,
  runOptions,
  onRunReports,
  isRunning,
}: RegistryRunReportsModalProps) => {
  const { t } = useI18n();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("registry.runReports")}</DialogTitle>
          <DialogDescription>
            {t("registry.runReportsDescription", {
              count: selectedReports.length,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-gray-03 bg-gray-03/20 p-4">
            <p className="text-sm font-medium text-gray-01 mb-2">
              {t("registry.selectedReportsList", { count: selectedReports.length })}
            </p>
            <ul className="space-y-1 max-h-40 overflow-y-auto pr-2">
              {selectedReports.map((entry) => {
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
            disabled={isRunning || selectedReports.length === 0}
          >
            {isRunning ? t("registry.runningReports") : t("registry.runReports")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RegistryRunReportsModal;