import { Info, ExternalLink } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/ui/dialog";

type MetadataUserLike = {
  name?: string | null;
  email?: string | null;
};

export type MetadataDetailsLike = {
  source?: string | null;
  comment?: string | null;
  user?: MetadataUserLike | null;
  verifiedBy?: { name?: string | null } | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  verifiedAt?: string | null;
  parsedAt?: string | null;
};

function hasAnyMetadata(metadata: MetadataDetailsLike | null | undefined) {
  if (!metadata) return false;
  return Boolean(
    metadata.source?.trim() ||
      metadata.comment?.trim() ||
      metadata.verifiedBy?.name?.trim() ||
      metadata.verifiedBy ||
      metadata.updatedAt
  );
}

function formatDate(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(d);
}

export function MetadataDetailsDialog({
  metadata,
  fieldLabel,
  triggerAriaLabel,
}: {
  metadata?: MetadataDetailsLike | null;
  fieldLabel: string;
  triggerAriaLabel?: string;
}) {
  const openable = useMemo(() => hasAnyMetadata(metadata), [metadata]);
  const metaAny = metadata as (MetadataDetailsLike & Record<string, unknown>) | null | undefined;
  const source = metadata?.source?.trim() || null;
  const comment = metadata?.comment?.trim() || null;
  const verifiedBy = metadata?.verifiedBy?.name?.trim() || (metadata?.verifiedBy ? "Yes" : null);

  const updatedAt =
    formatDate(metadata?.updatedAt) ??
    formatDate(metaAny?.updatedAt) ??
    null;
  if (!openable) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-full text-blue-03 hover:bg-gray-03/40 h-6 w-6"
          aria-label={triggerAriaLabel ?? `Open ${fieldLabel} metadata`}
          title="View details"
        >
          <Info className="w-3.5 h-3.5" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-gray-01">{fieldLabel} details</DialogTitle>
          <DialogDescription>
            Source and validation metadata for this field.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 max-h-[70vh] overflow-auto pr-1">
          {(updatedAt || verifiedBy) && (
            <section className="rounded-lg bg-gray-05 p-3">
              <div className="text-xs font-medium text-gray-02 mb-2">Details</div>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {updatedAt && (
                  <div>
                    <dt className="text-xs text-gray-03">Updated</dt>
                    <dd className="text-sm text-gray-01 break-words">{updatedAt}</dd>
                  </div>
                )}
                {verifiedBy && (
                  <div>
                    <dt className="text-xs text-gray-03">Verified by</dt>
                    <dd className="text-sm text-gray-01 break-words">{verifiedBy}</dd>
                  </div>
                )}
              </dl>
            </section>
          )}

          {source && (
            <section className="rounded-lg bg-gray-05 p-3">
              <div className="text-xs font-medium text-gray-02 mb-1">Source</div>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-02 underline break-all"
                >
                  {source}
                </a>
                <Button asChild size="sm" variant="secondary" className="min-w-0">
                  <a href={source} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open source
                  </a>
                </Button>
              </div>
            </section>
          )}

          {comment && (
            <section className="rounded-lg bg-gray-05 p-3">
              <div className="text-xs font-medium text-gray-02 mb-1">Comment</div>
              <div className="text-sm text-gray-01 whitespace-pre-wrap break-words">
                {comment}
              </div>
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

