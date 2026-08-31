import { Link2 } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import type { PipelineMode } from "@/lib/pipeline-mode";
import { Button } from "@/ui/button";
import { AutoApproveToggle } from "./AutoApproveToggle";

interface UrlUploadFormProps {
  urlInput: string;
  onUrlInputChange: (value: string) => void;
  autoApprove: boolean;
  onAutoApproveChange: (value: boolean) => void;
  onSubmit: () => void;
  pipelineMode?: PipelineMode;
}

export function UrlUploadForm({
  urlInput,
  onUrlInputChange,
  autoApprove,
  onAutoApproveChange,
  onSubmit,
  pipelineMode = "emissions",
}: UrlUploadFormProps) {
  const { t } = useI18n();
  const submitLabel =
    pipelineMode === "climate-plans"
      ? t("upload.addLinksClimatePlans")
      : t("upload.addLinksEmissions");

  return (
    <div className="space-y-4">
      <div className="bg-gray-04/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
        <AutoApproveToggle
          value={autoApprove}
          onChange={onAutoApproveChange}
          showScopeHint
        />
        <label className="block text-sm font-medium text-gray-01">
          {t("upload.pastePdfLinks")}
        </label>
        <textarea
          value={urlInput}
          onChange={(e) => onUrlInputChange(e.target.value)}
          placeholder={t("upload.linksPlaceholder")}
          className="w-full h-32 bg-gray-03/20 border border-gray-03 rounded-lg p-3 text-gray-01 placeholder:text-gray-02 focus:outline-none focus:ring-2 focus:ring-orange-03"
        />
        <div className="flex justify-end">
          <Button onClick={onSubmit} disabled={!urlInput.trim()}>
            <Link2 className="w-4 h-4 mr-2" />
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
