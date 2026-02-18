import { Button } from "@/ui/button";
import { QueueJob } from "@/lib/types";

interface ErrorSectionProps {
  job: QueueJob;
  setActiveTab: (tab: "user" | "technical") => void;
  isFullError?: boolean;
}

export function ErrorSection({
  job,
  setActiveTab,
  isFullError = false,
}: ErrorSectionProps) {
  if (!job.isFailed || job.stacktrace.length === 0) return null;

  return (
    <div className="bg-pink-03/10 rounded-lg p-4">
      <h3 className="text-lg font-medium text-pink-03 mb-4">
        {isFullError ? "Fullständigt felmeddelande" : "Felmeddelande"}
      </h3>
      {isFullError ? (
        <pre className="text-pink-03 text-sm overflow-x-auto">
          {job.stacktrace.join("\n")}
        </pre>
      ) : (
        <div className="text-pink-03 text-sm">
          {job.stacktrace[0]}
          {job.stacktrace.length > 1 && (
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
    </div>
  );
}
