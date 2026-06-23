import { File, X } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import type { DroppedPdfFile } from "@/hooks/usePdfFileDrop";

interface RegistryDroppedFilesListProps {
  files: DroppedPdfFile[];
  onRemove?: (id: string) => void;
}

export function RegistryDroppedFilesList({
  files,
  onRemove,
}: RegistryDroppedFilesListProps) {
  const { t } = useI18n();

  if (files.length === 0) return null;

  return (
    <div className="rounded-lg border border-gray-03 bg-gray-04/40 overflow-hidden">
      <div className="px-3 py-2 border-b border-gray-03 bg-gray-04/60">
        <p className="text-sm font-medium text-gray-01">
          {t("registry.droppedFilesHeading", { count: files.length })}
        </p>
        <p className="text-xs text-gray-02 mt-0.5">
          {t("registry.droppedFilesHint")}
        </p>
      </div>
      <ul className="max-h-40 overflow-y-auto divide-y divide-gray-03">
        {files.map(({ id, file }) => {
          const sizeMb = (file.size / 1024 / 1024).toFixed(2);
          return (
            <li
              key={id}
              className="flex items-center gap-3 px-3 py-2 text-sm text-gray-01"
            >
              <File className="w-4 h-4 shrink-0 text-orange-03" />
              <div className="flex-1 min-w-0">
                <p className="truncate">{file.name}</p>
                <p className="text-xs text-gray-02">
                  {t("upload.fileSizeMb", { size: sizeMb })}
                </p>
              </div>
              {onRemove ? (
                <button
                  type="button"
                  onClick={() => onRemove(id)}
                  className="p-1 rounded text-gray-02 hover:text-gray-01 hover:bg-gray-03"
                  aria-label={t("registry.removeDroppedFile")}
                >
                  <X className="w-4 h-4" />
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
