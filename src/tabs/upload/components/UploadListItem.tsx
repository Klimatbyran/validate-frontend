import { File, Link2 } from "lucide-react";
import { motion } from "framer-motion";
import { UploadedFile, UrlInput } from "../types";

interface FileListItemProps {
  file: UploadedFile;
}

interface UrlListItemProps {
  url: UrlInput;
}

export function FileListItem({ file }: FileListItemProps) {
  return (
    <motion.li
      key={file.id}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="p-4 flex items-center space-x-4"
    >
      <File className="w-6 h-6 text-orange-03" />
      <div className="flex-1">
        <p className="text-sm text-gray-01">{file.file.name}</p>
        <p className="text-sm text-gray-02">
          Företag: {file.company} • {(file.file.size / 1024 / 1024).toFixed(2)}{" "}
          MB
        </p>
      </div>
    </motion.li>
  );
}

export function UrlListItem({ url }: UrlListItemProps) {
  return (
    <motion.li
      key={url.id}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="p-4 flex items-center space-x-4"
    >
      <Link2 className="w-6 h-6 text-orange-03" />
      <div className="flex-1">
        <p className="text-sm text-gray-01 break-all">{url.url}</p>
        <p className="text-sm text-gray-02">Företag: {url.company}</p>
      </div>
    </motion.li>
  );
}
