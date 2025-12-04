import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { UploadedFile, UrlInput } from "./types";
import { FileListItem, UrlListItem } from "./UploadListItem";

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
  if (uploadedFiles.length === 0 && processedUrls.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-04/80 backdrop-blur-sm rounded-lg"
    >
      <div className="p-4 border-b border-gray-03 flex justify-between items-center">
        <h2 className="text-lg text-gray-01">
          {uploadMode === "file"
            ? `Uppladdade filer (${uploadedFiles.length})`
            : `Tillagda länkar (${processedUrls.length})`}
        </h2>
        <Button variant="primary" onClick={onContinue}>
          Se resultat
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
      <ul className="divide-y divide-gray-03">
        {uploadMode === "file"
          ? uploadedFiles.map((file) => (
              <FileListItem key={file.id} file={file} />
            ))
          : processedUrls.map((url) => <UrlListItem key={url.id} url={url} />)}
      </ul>
    </motion.div>
  );
}
