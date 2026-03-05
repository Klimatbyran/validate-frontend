import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/ui/button";
import { UploadedFile, UrlInput } from "../types";
import { FileListItem, UrlListItem, SubmittedFileListItem } from "./UploadListItem";

interface UploadListProps {
  uploadMode: "file" | "url";
  uploadedFiles: UploadedFile[];
  processedUrls: UrlInput[];
  onContinue: () => void;
}

export function UploadList({
  uploadMode,
  uploadedFiles,
  processedUrls,
  onContinue,
}: UploadListProps) {
  const { t } = useI18n();
  const fileCount = uploadedFiles?.length ?? 0;
  const urlCount = processedUrls?.length ?? 0;
  const totalCount = fileCount + urlCount;
  if (totalCount === 0) {
    return null;
  }

  const submittedFileUrls = (processedUrls ?? []).filter((u) => u?.url?.startsWith("uploaded:"));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-04/80 backdrop-blur-sm rounded-lg"
    >
      <div className="p-4 border-b border-gray-03 flex justify-between items-center">
        <h2 className="text-lg text-gray-01">
          {uploadMode === "file"
            ? t("upload.uploadedFiles", { count: totalCount })
            : t("upload.addedLinks", { count: urlCount })}
        </h2>
        <Button variant="primary" onClick={onContinue}>
          {t("upload.seeResults")}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
      <ul className="divide-y divide-gray-03">
        {uploadMode === "file"
          ? (
              <>
                {(uploadedFiles ?? []).filter(Boolean).map((file) => (
                  <FileListItem key={file.id} file={file} />
                ))}
                {submittedFileUrls.map((url) => (
                  <SubmittedFileListItem key={url.id} url={url} />
                ))}
              </>
            )
          : (processedUrls ?? []).filter(Boolean).map((url) => (
              <UrlListItem key={url.id} url={url} />
            ))}
      </ul>
    </motion.div>
  );
}
