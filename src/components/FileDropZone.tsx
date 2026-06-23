import { useRef } from "react";
import { FileUp } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface FileDropZoneProps {
  isDragging: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onInputChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  title: string;
  subtitle?: string;
  compact?: boolean;
  className?: string;
}

export function FileDropZone({
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
  onInputChange,
  title,
  subtitle,
  compact = false,
  className,
}: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "border-2 border-dashed rounded-lg cursor-pointer",
        "flex flex-col items-center justify-center",
        "transition-all duration-200",
        "bg-gray-04/50 backdrop-blur-sm",
        compact ? "p-6" : "p-12",
        isDragging
          ? "border-orange-03 bg-orange-05/10"
          : "border-gray-03 hover:border-gray-02",
        className,
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        className="hidden"
        onChange={onInputChange}
        onClick={(e) => e.stopPropagation()}
      />
      <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}>
        <FileUp
          className={cn(
            compact ? "w-8 h-8 mb-2" : "w-12 h-12 mb-4",
            isDragging ? "text-orange-03" : "text-gray-02",
          )}
        />
      </motion.div>
      <p
        className={cn(
          "text-gray-01 text-center",
          compact ? "text-sm" : "text-lg",
        )}
      >
        {title}
        {subtitle ? (
          <>
            <br />
            <span className="text-sm text-gray-02">{subtitle}</span>
          </>
        ) : null}
      </p>
    </div>
  );
}
