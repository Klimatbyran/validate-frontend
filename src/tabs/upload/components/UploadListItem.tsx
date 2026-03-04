import { File, Link2 } from "lucide-react";
import { motion } from "framer-motion";
import { useI18n } from "@/contexts/I18nContext";
import { UploadedFile, UrlInput } from "../types";

interface FileListItemProps {
  file: UploadedFile;
}

interface UrlListItemProps {
  url: UrlInput;
}

export function FileListItem({ file }: FileListItemProps) {
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
          {t("upload.companyWithName", { name: company })} • {t("upload.fileSizeMb", { size: sizeMb })}
        </p>
      </div>
    </motion.li>
  );
}

export function UrlListItem({ url }: UrlListItemProps) {
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
        <p className="text-sm text-gray-02">{t("upload.companyWithName", { name: company })}</p>
      </div>
    </motion.li>
  );
}
