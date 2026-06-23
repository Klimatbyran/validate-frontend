import { useCallback, useState } from "react";
import { collectPdfFilesFromDataTransfer } from "@/lib/drag-drop-pdf-files";

export interface DroppedPdfFile {
  id: string;
  file: File;
}

function mergeDroppedPdfFiles(
  prev: DroppedPdfFile[],
  files: File[],
): { next: DroppedPdfFile[]; added: number } {
  const existing = new Set(
    prev.map((f) => `${f.file.name}:${f.file.size}:${f.file.lastModified}`),
  );
  const toAdd: DroppedPdfFile[] = [];
  for (const file of files) {
    const key = `${file.name}:${file.size}:${file.lastModified}`;
    if (existing.has(key)) continue;
    existing.add(key);
    toAdd.push({ id: crypto.randomUUID(), file });
  }
  if (toAdd.length === 0) return { next: prev, added: 0 };
  return { next: [...prev, ...toAdd], added: toAdd.length };
}

export function usePdfFileDrop() {
  const [isDragging, setIsDragging] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState<DroppedPdfFile[]>([]);

  const appendFiles = useCallback((files: File[]) => {
    if (files.length === 0) return 0;

    setDroppedFiles((prev) => mergeDroppedPdfFiles(prev, files).next);
    return files.length;
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = await collectPdfFilesFromDataTransfer(e.dataTransfer);
      return appendFiles(files);
    },
    [appendFiles],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []).filter(
        (file) =>
          file.type === "application/pdf" ||
          file.name.toLowerCase().endsWith(".pdf"),
      );
      e.target.value = "";
      return appendFiles(files);
    },
    [appendFiles],
  );

  const removeFile = useCallback((id: string) => {
    setDroppedFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const clearFiles = useCallback(() => {
    setDroppedFiles([]);
  }, []);

  return {
    isDragging,
    droppedFiles,
    setDroppedFiles,
    appendFiles,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleInputChange,
    removeFile,
    clearFiles,
  };
}
