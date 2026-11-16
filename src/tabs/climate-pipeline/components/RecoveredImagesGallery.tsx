import { Image } from "lucide-react";
import { cn } from "@/lib/utils";
import { CollapsibleSection } from "@/ui/collapsible-section";
import type { RecoveredImage } from "../hooks/useClimatePlanDetail";

/** Shared between StepResultDialog (every climate-plans-pipeline step's
 * dialog) and ClimatePipelineTab (the docling job's own dialog) — a
 * reviewer checking either one needs to see which actual picture a
 * recovered description/commitment came from, not just one or the
 * other. */
export function RecoveredImagesGallery({
  images,
}: {
  images: RecoveredImage[];
}) {
  if (images.length === 0) return null;

  const skipped = images.filter((img) => !img.hasText).length;
  const failed = images.filter((img) => img.vlmError).length;
  const title =
    skipped > 0 || failed > 0
      ? `Recovered images (${images.length}` +
        (skipped > 0 ? ` · ${skipped} skipped, no text` : "") +
        (failed > 0 ? ` · ${failed} AI call failed` : "") +
        `)`
      : `Recovered images (${images.length})`;

  return (
    <div className="mt-3">
      <CollapsibleSection
        title={title}
        icon={<Image />}
        accentIconBg="bg-green-03/20"
        accentTextColor="text-green-03"
      >
        <p className="text-xs text-gray-02 mb-3">
          Pictures docling's layout model would otherwise drop the text
          from — recovered via OCR/AI description, already folded into the
          markdown in each picture's place. Thumbnail is a small (400px)
          preview, good for confirming which picture a description came
          from — find the page in the source PDF to read fine print. "No
          text" pictures skipped the paid AI description entirely (too
          little OCR-recognized text to be worth it) — shown here too so
          you can judge whether that call was actually right. "Described"
          is when the AI description was actually generated — a cache hit
          can be reusing a much older call, not a fresh read just now.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {images.map((img) => {
            const badge = img.vlmError
              ? {
                  cls: "border-pink-03/40 bg-pink-03/10 text-pink-03",
                  label: "AI call failed — showing raw OCR text",
                  title: img.vlmError,
                }
              : img.hasText
                ? {
                    cls: "border-green-03/40 bg-green-03/10 text-green-03",
                    label: "Contains text",
                    title: undefined,
                  }
                : {
                    cls: "border-orange-03/40 bg-orange-03/10 text-orange-03",
                    label: "Contains no text — AI call skipped",
                    title: undefined,
                  };
            return (
              <div
                key={img.id}
                className={cn(
                  "rounded-md border bg-gray-04/40 p-2",
                  img.vlmError ? "border-pink-03/40" : img.hasText ? "border-gray-03" : "border-orange-03/40",
                )}
              >
                <img
                  src={`data:image/jpeg;base64,${img.thumbnail}`}
                  alt={img.description ?? img.ocrText ?? "Recovered image"}
                  className="w-full h-auto rounded-sm mb-2"
                />
                <div className="text-xs text-gray-02">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    {img.page != null && (
                      <span className="font-medium text-gray-01">
                        Page {img.page}
                      </span>
                    )}
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
                        badge.cls,
                      )}
                      title={badge.title}
                    >
                      {badge.label}
                    </span>
                  </div>
                  {img.describedAt && (
                    <p className="text-gray-02/70 mb-1">
                      Described {new Date(img.describedAt).toLocaleString()}
                    </p>
                  )}
                  {img.description && <p className="mb-1">{img.description}</p>}
                  {img.ocrText && (
                    <p className="italic text-gray-02/80">"{img.ocrText}"</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CollapsibleSection>
    </div>
  );
}
