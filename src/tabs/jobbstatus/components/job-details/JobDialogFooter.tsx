import { Check, X, RotateCcw } from "lucide-react";
import { Button } from "@/ui/button";
import { useI18n } from "@/contexts/I18nContext";

interface JobDialogFooterProps {
  needsApproval: boolean;
  canRetry: boolean;
  approvalOnly?: boolean; // If true, only show approval buttons (no retry)
  onApprove?: (approved: boolean) => void;
  onRetry?: () => void;
}

export function JobDialogFooter({
  needsApproval,
  canRetry,
  approvalOnly = false,
  onApprove,
  onRetry,
}: JobDialogFooterProps) {
  const { t } = useI18n();
  return (
    <div className="flex justify-between w-full">
      <div>
        {canRetry && !approvalOnly && (
          <Button
            variant="ghost"
            onClick={onRetry}
            className="text-blue-03 hover:bg-blue-03/10"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            {t("jobstatus.jobdetails.tryAgain")}
          </Button>
        )}
      </div>
      {needsApproval && (
        <div className="space-x-2">
          <Button
            variant="ghost"
            onClick={() => onApprove?.(false)}
            className="border-pink-03 text-pink-03 hover:bg-pink-03/10"
          >
            <X className="w-4 h-4 mr-2" />
            {t("jobstatus.jobdetails.reject")}
          </Button>
          <Button
            variant="primary"
            onClick={() => onApprove?.(true)}
            className={
              approvalOnly
                ? "bg-green-04 text-green-01 hover:bg-green-04/90"
                : "bg-green-03 text-white hover:bg-green-03/90"
            }
          >
            <Check className="w-4 h-4 mr-2" />
            {t("jobstatus.jobdetails.approve")}
          </Button>
        </div>
      )}
    </div>
  );
}
