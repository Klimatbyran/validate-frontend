import { AlertCircle } from "lucide-react";
import { Button } from "@/ui/button";
import { QueueJob } from "@/lib/types";

interface ErrorSectionProps {
  job: QueueJob;
  setActiveTab: (tab: "user" | "technical") => void;
  isFullError?: boolean;
}

function isJobFailed(job: QueueJob): boolean {
  return job.isFailed === true || job.status === "failed";
}

export function ErrorSection({
  job,
  setActiveTab,
  isFullError = false,
}: ErrorSectionProps) {
  const failed = isJobFailed(job);
  const failedReason = job.failedReason?.trim() || null;
  const stacktrace = Array.isArray(job.stacktrace) ? job.stacktrace : [];
  const hasContent = failed && (failedReason || stacktrace.length > 0);

  if (!hasContent) return null;

  return (
    <div className="bg-pink-03/10 rounded-lg p-4 border border-pink-03/20">
      <h3 className="text-lg font-medium text-pink-03 mb-3 flex items-center gap-2">
        <AlertCircle className="w-5 h-5" />
        {isFullError ? "Fullständigt felmeddelande" : "Senaste jobbet misslyckades"}
      </h3>

      {failedReason && (
        <div className="mb-4">
          <div className="text-xs font-medium text-pink-03/80 uppercase tracking-wide mb-1">
            Orsak till misslyckande
          </div>
          <p className="text-gray-01 text-sm whitespace-pre-wrap">
            {failedReason}
          </p>
        </div>
      )}

      {stacktrace.length > 0 && (
        <>
          <div className="text-xs font-medium text-pink-03/80 uppercase tracking-wide mb-1">
            {isFullError ? "Stackspår" : "Felmeddelande / stackspår"}
          </div>
          {isFullError ? (
            <pre className="text-pink-03 text-sm overflow-x-auto bg-gray-04 rounded p-3 border border-gray-03">
              {stacktrace.join("\n")}
            </pre>
          ) : (
            <div className="text-pink-03 text-sm">
              <pre className="whitespace-pre-wrap break-words font-sans text-sm">
                {stacktrace[0]}
              </pre>
              {stacktrace.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab("technical")}
                  className="mt-2 text-pink-03 hover:bg-pink-03/10"
                >
                  Visa fullständigt felmeddelande
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
