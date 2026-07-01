import { File, Link2, CheckCircle2, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { useI18n } from "@/contexts/I18nContext";
import { UploadedFile, UrlInput } from "../types";

const UPLOADED_PREFIX = "uploaded:";

interface FileListItemProps {
  file: UploadedFile;
  onRemove?: (id: string) => void;
}

interface UrlListItemProps {
  url: UrlInput;
  onRemove?: (id: string) => void;
}

interface SubmittedFileListItemProps {
  url: UrlInput;
  onRemove?: (id: string) => void;
}

export function FileListItem({ file, onRemove }: FileListItemProps) {
  const { t } = useI18n();
  const rawFile = file?.file;
  const sizeMb = rawFile ? (rawFile.size / 1024 / 1024).toFixed(2) : "—";
  const name = rawFile?.name || file?.id || "—";
  const company = file?.company ?? "";
  return (
    <motion.li
      key={file.id}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="p-4 flex items-center space-x-4"
    >
      <File className="w-6 h-6 text-orange-03" />
      <div className="flex-1">
        <p className="text-sm text-gray-01">{name}</p>
        <p className="text-sm text-gray-02">
          {t("upload.companyWithName", { name: company })} •{" "}
          {t("upload.fileSizeMb", { size: sizeMb })}
        </p>
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={() => onRemove(file.id)}
          className="p-2 rounded-full text-gray-02 hover:text-red-500 hover:bg-gray-03 shrink-0"
          aria-label={t("upload.removeFile")}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </motion.li>
  );
}

export function UrlListItem({ url, onRemove }: UrlListItemProps) {
  const { t } = useI18n();
  const urlStr = url?.url ?? "";
  const company = url?.company ?? "";
  return (
    <motion.li
      key={url.id}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="p-4 flex items-center space-x-4"
    >
      <Link2 className="w-6 h-6 text-orange-03" />
      <div className="flex-1">
        <p className="text-sm text-gray-01 break-all">{urlStr}</p>
        <p className="text-sm text-gray-02">
          {t("upload.companyWithName", { name: company })}
        </p>
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={() => onRemove(url.id)}
          className="p-2 rounded-full text-gray-02 hover:text-red-500 hover:bg-gray-03 shrink-0"
          aria-label={t("upload.removeFile")}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </motion.li>
  );
}

export function SubmittedFileListItem({ url, onRemove }: SubmittedFileListItemProps) {
  const { t } = useI18n();
  const name = url?.url?.startsWith(UPLOADED_PREFIX)
    ? url.url.slice(UPLOADED_PREFIX.length)
    : (url?.url ?? "—");
  const company = url?.company ?? "";
  return (
    <motion.li
      key={url.id}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="p-4 flex items-center space-x-4"
    >
      <CheckCircle2 className="w-6 h-6 text-green-03" />
      <div className="flex-1">
        <p className="text-sm text-gray-01">{name}</p>
        <p className="text-sm text-gray-02">
          {t("upload.companyWithName", { name: company })}
        </p>
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={() => onRemove(url.id)}
          className="p-2 rounded-full text-gray-02 hover:text-red-500 hover:bg-gray-03 shrink-0"
          aria-label={t("upload.removeFile")}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </motion.li>
  );
}
