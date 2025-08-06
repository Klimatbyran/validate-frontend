import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QueueJob } from "@/lib/types";

interface ErrorSectionProps {
  job: QueueJob;
  onShowTechnical?: () => void;
  showFullError?: boolean;
}

export function ErrorSection({
  job,
  onShowTechnical,
  showFullError = false,
}: ErrorSectionProps) {
  if (!job.isFailed || job.stacktrace.length === 0) {
    return null;
  }

  if (showFullError) {
    return (
      <div className="bg-pink-03/10 rounded-lg p-4">
        <h3 className="text-lg font-medium text-pink-03 mb-4">
          Fullständigt felmeddelande
        </h3>
        <pre className="text-pink-03 text-sm overflow-x-auto">
          {job.stacktrace.join("\n")}
        </pre>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-pink-03/10 to-pink-04/10 rounded-xl p-6 border border-pink-03/20">
      <h3 className="text-xl font-semibold text-pink-03 mb-4 flex items-center">
        <AlertTriangle className="w-5 h-5 mr-3" />
        Felmeddelande
      </h3>
      <div className="text-pink-03 text-sm bg-pink-03/10 rounded-lg p-4 font-mono">
        {job.stacktrace[0]}
        {job.stacktrace.length > 1 && onShowTechnical && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onShowTechnical}
            className="mt-3 text-pink-03 hover:bg-pink-03/10 font-medium"
          >
            Visa fullständigt felmeddelande
          </Button>
        )}
      </div>
    </div>
  );
}
