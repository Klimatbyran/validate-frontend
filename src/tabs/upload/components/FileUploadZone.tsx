import { FileUp } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import { FileDropZone } from "@/components/FileDropZone";
import { UploadedFile } from "../types";
import { AutoApproveToggle } from "./AutoApproveToggle";

interface FileUploadZoneProps {
  isDragging: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onInputChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploadedFiles: UploadedFile[];
  autoApprove: boolean;
  onAutoApproveChange: (value: boolean) => void;
  onFileSubmit: () => void;
}

export function FileUploadZone({
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
  onInputChange,
  uploadedFiles,
  autoApprove,
  onAutoApproveChange,
  onFileSubmit,
}: FileUploadZoneProps) {
  const { t } = useI18n();
  return (
    <>
      <div className="flex items-center justify-end mb-2">
        <AutoApproveToggle value={autoApprove} onChange={onAutoApproveChange} />
      </div>
      <FileDropZone
        isDragging={isDragging}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onInputChange={onInputChange}
        title={t("upload.dragDropPdf")}
        subtitle={t("upload.orClickToSelect")}
      />
      {uploadedFiles.length > 0 && (
        <div className="mt-4 flex justify-end">
          <Button onClick={onFileSubmit}>
            <FileUp className="w-4 h-4 mr-2" />
            {t("upload.uploadAndProcess")}
          </Button>
        </div>
      )}
    </>
  );
}
