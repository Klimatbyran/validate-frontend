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

export function ReturnValueSection({ job }: ReturnValueSectionProps) {
  const { t } = useI18n();
  if (!job) return null;

  const returnValue = job.returnvalue;

  if (returnValue === null || returnValue === undefined) {
    return null;
  }

  const markdownValue = extractMarkdown(returnValue);

  return (
    <div className="bg-gray-03/20 rounded-lg p-4">
      <h3 className="text-lg font-medium text-gray-01 mb-4">
        {t("jobstatus.jobdetails.returnValue")}
      </h3>
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
