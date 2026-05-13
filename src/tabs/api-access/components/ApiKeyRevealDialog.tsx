import { useState } from "react";
import { Eye } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { CopyButton } from "@/ui/copy-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import { Button } from "@/ui/button";

type ApiKeyRevealDialogProps = {
  keyName: string;
  apiKey: string | null;
};

export function ApiKeyRevealDialog({
  keyName,
  apiKey,
}: ApiKeyRevealDialogProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label={t("apiAccess.revealKeyAria", { name: keyName })}
      >
        <Eye className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {t("apiAccess.revealKeyTitle", { name: keyName })}
            </DialogTitle>
            <DialogDescription>
              {apiKey
                ? t("apiAccess.revealKeyDescription")
                : t("apiAccess.revealKeyUnavailable")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-md border border-gray-03 bg-gray-05 px-3 py-2 font-mono text-sm text-gray-01 break-all">
              {apiKey || t("common.placeholderDash")}
            </div>

            {apiKey ? (
              <div className="flex justify-end">
                <CopyButton
                  getText={() => apiKey}
                  label={t("apiAccess.copyKey")}
                  copiedLabel={t("common.copied")}
                  failedLabel={t("common.copyFailed")}
                />
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
