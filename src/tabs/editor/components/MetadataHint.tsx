import { useI18n } from "@/contexts/I18nContext";

/** Metadata from API (source, comment, verifiedBy). */
export interface MetadataLike {
  source?: string | null;
  comment?: string | null;
  verifiedBy?: { name?: string } | null;
}

interface MetadataHintProps {
  metadata?: MetadataLike | null;
  className?: string;
}

/** Non-intrusive one-line hint for source, comment, verified. */
export function MetadataHint({ metadata, className = "" }: MetadataHintProps) {
  const { t } = useI18n();
  if (!metadata) return null;
  const hasSource = !!metadata.source?.trim();
  const hasComment = !!metadata.comment?.trim();
  const verified = !!metadata.verifiedBy;
  if (!hasSource && !hasComment && !verified) return null;
  const parts: string[] = [];
  if (hasSource) parts.push(`${t("editor.fieldEdit.source")}: ${metadata.source!.trim()}`);
  if (hasComment) parts.push(`${t("editor.fieldEdit.comment")}: ${metadata.comment!.trim()}`);
  if (verified) parts.push(t("editor.fieldEdit.verifiedLabel"));
  return (
    <p
      className={`text-xs text-gray-03 mt-1 ${className}`}
      title={parts.join(" · ")}
    >
      {parts.join(" · ")}
    </p>
  );
}
