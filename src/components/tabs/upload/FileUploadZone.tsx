import React from "react";
import { FileUp } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { UploadedFile } from "./types";

interface FileUploadZoneProps {
  isDragging: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  uploadedFiles: UploadedFile[];
  onFileSubmit: () => void;
}

export function FileUploadZone({
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
  uploadedFiles,
  onFileSubmit,
}: FileUploadZoneProps) {
  return (
    <>
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`
          border-2 border-dashed rounded-lg p-12
          flex flex-col items-center justify-center
          transition-all duration-200
          bg-gray-04/50 backdrop-blur-sm
          ${
            isDragging
              ? "border-orange-03 bg-orange-05/10"
              : "border-gray-03 hover:border-gray-02"
          }
        `}
      >
        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <FileUp
            className={`w-12 h-12 mb-4 ${
              isDragging
                ? "text-orange-03"
                : "text-gray-02"
            }`}
          />
        </motion.div>
        <p className="text-lg text-gray-01 text-center">
          Dra och släpp PDF filer här
          <br />
          <span className="text-sm text-gray-02">
            eller klicka för att välja filer
          </span>
        </p>
      </div>
      {uploadedFiles.length > 0 && (
        <div className="mt-4 flex justify-end">
          <Button onClick={onFileSubmit}>
            <FileUp className="w-4 h-4 mr-2" />
            Lägg till filer
          </Button>
        </div>
      )}
    </>
  );
}

