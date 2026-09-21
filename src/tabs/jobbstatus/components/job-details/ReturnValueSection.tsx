import { QueueJob } from "@/lib/types";
import { ValueRenderer } from "@/ui/value-renderer";
import { MarkdownVectorPagesDisplay } from "@/ui/markdown-display";
import { isMarkdown } from "@/lib/utils";
import { useI18n } from "@/contexts/I18nContext";

interface ReturnValueSectionProps {
  job: QueueJob | null;
}

/** Pulls out a markdown string when the whole returnvalue is one (e.g.
 * doclingParsePDF's `{ markdown }`) — same isMarkdown heuristic
 * JobSpecificDataView already uses for markdown-shaped job.data fields. */
function extractMarkdown(returnValue: unknown): string | null {
  if (typeof returnValue === "string") {
    return isMarkdown(returnValue) ? returnValue : null;
  }
  if (
    returnValue &&
    typeof returnValue === "object" &&
    typeof (returnValue as { markdown?: unknown }).markdown === "string"
  ) {
    const { markdown } = returnValue as { markdown: string };
    return isMarkdown(markdown) ? markdown : null;
  }
  return null;
}

interface PictureRecoveryInfo {
  index: number;
  page: number | null;
  description: string | null;
  ocr_text: string | null;
  thumbnail: string;
}

interface ImageRecoveryStats {
  pictures_total: number;
  pictures_dropped_small: number;
  pictures_dropped_duplicate: number;
  pictures_described: number;
  pictures?: PictureRecoveryInfo[];
}

/** doclingParsePDF's own per-picture OCR/VLM counts, only present when
 * readImages was on — see docling_test/app.py's recover_images(). */
function extractImageRecovery(returnValue: unknown): ImageRecoveryStats | null {
  if (
    returnValue &&
    typeof returnValue === "object" &&
    "imageRecovery" in returnValue
  ) {
    return (returnValue as { imageRecovery: ImageRecoveryStats }).imageRecovery;
  }
  return null;
}

/** A list of every picture docling read out of the source PDF, so a
 * reviewer can quickly check what was actually seen without opening the
 * PDF itself — thumbnail alongside the full, untruncated text that ended
 * up in the markdown (AI description, or raw OCR words when the VLM call
 * failed). The description can run to a couple thousand characters (it's
 * a structured "transcribed text" + "visual connections" writeup), so
 * this deliberately doesn't clamp it — a card grid with truncated text
 * hid exactly the part worth reviewing. */
function ImageRecoveryGallery({
  pictures,
}: {
  pictures: PictureRecoveryInfo[];
}) {
  return (
    <div className="flex flex-col gap-3 mb-4">
      {pictures.map((pic) => (
        <div
          key={pic.index}
          className="bg-gray-04 rounded-lg p-3 flex gap-3 items-start"
        >
          <img
            src={`data:image/jpeg;base64,${pic.thumbnail}`}
            alt={`Picture ${pic.index}`}
            className="w-32 shrink-0 rounded object-contain bg-black/20"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-3 text-xs text-gray-02 mb-1">
              <span>Picture {pic.index}</span>
              {pic.page !== null && <span>Page {pic.page}</span>}
            </div>
            {(pic.description ?? pic.ocr_text) && (
              <p className="text-xs text-gray-01 whitespace-pre-wrap">
                {pic.description ?? pic.ocr_text}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ReturnValueSection({ job }: ReturnValueSectionProps) {
  const { t } = useI18n();
  if (!job) return null;

  const returnValue = job.returnvalue;

  if (returnValue === null || returnValue === undefined) {
    return null;
  }

  const markdownValue = extractMarkdown(returnValue);
  const imageRecovery = extractImageRecovery(returnValue);

  return (
    <div className="bg-gray-03/20 rounded-lg p-4">
      <h3 className="text-lg font-medium text-gray-01 mb-4">
        {t("jobstatus.jobdetails.returnValue")}
      </h3>
      {imageRecovery && (
        <p className="text-xs text-gray-02 mb-3">
          Image recovery: {imageRecovery.pictures_total} picture(s) found,{" "}
          {imageRecovery.pictures_described} described,{" "}
          {imageRecovery.pictures_dropped_small} too small,{" "}
          {imageRecovery.pictures_dropped_duplicate} duplicate
        </p>
      )}
      {imageRecovery?.pictures && imageRecovery.pictures.length > 0 && (
        <ImageRecoveryGallery pictures={imageRecovery.pictures} />
      )}
      {markdownValue !== null ? (
        <MarkdownVectorPagesDisplay value={markdownValue} />
      ) : (
        <div className="bg-gray-04 rounded-lg p-3">
          <div className="text-gray-01 break-words">
            <ValueRenderer value={returnValue} />
          </div>
        </div>
      )}
    </div>
  );
}
