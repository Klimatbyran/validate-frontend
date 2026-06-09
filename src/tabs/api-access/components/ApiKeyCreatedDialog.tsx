import { AlertTriangle } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { CopyButton } from "@/ui/copy-button";
import { Callout } from "@/ui/callout";
import { Button } from "@/ui/button";
import { Modal } from "@/ui/modal";

type ApiKeyCreatedDialogProps = {
  open: boolean;
  onClose: () => void;
  keyName: string;
  apiKey: string;
};

function maskApiKey(key: string): string {
  const dotIdx = key.indexOf(".");
  if (dotIdx === -1) return key.slice(0, 6) + "•".repeat(16);
  return key.slice(0, dotIdx + 1) + "•".repeat(16);
}

export function ApiKeyCreatedDialog({
  open,
  onClose,
  keyName,
  apiKey,
}: ApiKeyCreatedDialogProps) {
  const { t } = useI18n();

  return (
    <Modal
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
      size="md"
      title={t("apiAccess.createdDialog.title")}
      description={t("apiAccess.createdDialog.forKey", { name: keyName })}
      footer={
        <Button onClick={onClose}>{t("apiAccess.createdDialog.done")}</Button>
      }
    >
      <Callout variant="warning" icon={<AlertTriangle />}>
        <p className="text-sm text-orange-03/90">
          {t("apiAccess.createdDialog.warning")}
        </p>
      </Callout>

      <div className="space-y-2">
        <p className="text-xs text-gray-02 uppercase tracking-wide">
          {t("apiAccess.createdDialog.keyLabel")}
        </p>
        <div className="rounded-md border border-gray-03 bg-gray-05 px-3 py-2 flex items-center gap-2">
          <span className="flex-1 min-w-0 font-mono text-sm text-gray-02 truncate">
            {maskApiKey(apiKey)}
          </span>
          <CopyButton
            getText={() => apiKey}
            label={t("apiAccess.copyKey")}
            copiedLabel={t("common.copied")}
            failedLabel={t("common.copyFailed")}
            className="shrink-0"
          />
        </div>
      </div>
    </Modal>
  );
}
