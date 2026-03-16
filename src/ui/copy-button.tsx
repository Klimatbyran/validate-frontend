/**
 * Reusable copy-to-clipboard button. Use getText() to provide the string to copy.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { useI18n } from "@/contexts/I18nContext";
import { cn } from "@/lib/utils";

export interface CopyButtonProps {
  /** Function that returns the text to copy (e.g. () => JSON.stringify(data, null, 2)) */
  getText: () => string;
  label?: string;
  copiedLabel?: string;
  failedLabel?: string;
  resetDelayMs?: number;
  className?: string;
}

export function CopyButton({
  getText,
  label,
  copiedLabel,
  failedLabel,
  resetDelayMs = 1500,
  className,
}: CopyButtonProps) {
  const { t } = useI18n();
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
  const resetTimerRef = useRef<number | null>(null);
  const displayLabel = label ?? t("common.copy");
  const displayCopiedLabel = copiedLabel ?? t("common.copied");
  const displayFailedLabel = failedLabel ?? t("common.copyFailed");

  const scheduleReset = useCallback(() => {
    if (resetTimerRef.current) {
      window.clearTimeout(resetTimerRef.current);
    }

    resetTimerRef.current = window.setTimeout(() => {
      setStatus("idle");
      resetTimerRef.current = null;
    }, resetDelayMs);
  }, [resetDelayMs]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(getText());
      setStatus("copied");
    } catch {
      setStatus("error");
    }

    scheduleReset();
  }, [getText, scheduleReset]);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  const buttonLabel =
    status === "copied"
      ? displayCopiedLabel
      : status === "error"
        ? displayFailedLabel
        : displayLabel;

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-live="polite"
      className={cn(
        "text-xs px-2 py-1 rounded border font-medium transition-colors",
        "bg-gray-04 text-gray-01 border-gray-03 hover:bg-gray-03",
        className,
      )}
    >
      {buttonLabel}
    </button>
  );
}
