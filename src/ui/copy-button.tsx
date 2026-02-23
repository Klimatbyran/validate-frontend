/**
 * Reusable copy-to-clipboard button. Use getText() to provide the string to copy.
 */

import React, { useState, useCallback } from "react";
import { cn } from "@/lib/utils";

export interface CopyButtonProps {
  /** Function that returns the text to copy (e.g. () => JSON.stringify(data, null, 2)) */
  getText: () => string;
  label?: string;
  copiedLabel?: string;
  className?: string;
}

export function CopyButton({
  getText,
  label = "Kopiera",
  copiedLabel = "Kopierad",
  className,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(getText());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API not available or denied
    }
  }, [getText]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "text-xs px-2 py-1 rounded border font-medium transition-colors",
        "bg-gray-04 text-gray-01 border-gray-03 hover:bg-gray-03",
        className
      )}
    >
      {copied ? copiedLabel : label}
    </button>
  );
}
