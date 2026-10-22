import { cn } from "@/lib/utils";
import { CONFIDENCE_CLASSES } from "../lib/tef-groups";
import type { MatchConfidence } from "../lib/measures-types";

export type MeasureDimension = "activity" | "intervention";

export function scoreClasses(score: number): string {
  if (score <= 1) return "bg-gray-03/40 text-gray-02";
  if (score <= 2) return "bg-pink-03/20 text-pink-03";
  if (score <= 3) return "bg-orange-03/20 text-orange-03";
  if (score <= 4) return "bg-orange-03/30 text-orange-03";
  if (score <= 5) return "bg-blue-03/20 text-blue-03";
  if (score <= 6) return "bg-green-03/20 text-green-03";
  return "bg-green-03/40 text-green-03";
}

export function scoreBarClasses(score: number): string {
  if (score <= 1) return "bg-gray-03/60";
  if (score <= 2) return "bg-pink-03/60";
  if (score <= 3) return "bg-orange-03/60";
  if (score <= 4) return "bg-orange-03/80";
  if (score <= 5) return "bg-blue-03/80";
  if (score <= 6) return "bg-green-03/60";
  return "bg-green-03";
}

export function ScoreBadge({ score }: { score: number }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center w-10 h-10 rounded-full text-base font-bold shrink-0 tabular-nums",
        scoreClasses(score),
      )}
      title={`Score: ${score}/7`}
    >
      {score}
    </span>
  );
}

export function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: 7 }, (_, i) => (
        <div
          key={i}
          className={cn(
            "h-2 w-5 rounded-full transition-colors",
            i < score ? scoreBarClasses(score) : "bg-gray-03/30",
          )}
        />
      ))}
    </div>
  );
}

export function ActivityTag({ activity }: { activity: string }) {
  if (!activity || activity === "none") return null;
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-03/10 text-blue-03 border border-blue-03/20 capitalize">
      {activity.replace(/_/g, " ")}
    </span>
  );
}

export function InterventionTypeTag({ type }: { type: string }) {
  if (!type || type === "none") return null;
  const colors: Record<string, string> = {
    direct: "bg-green-03/15 text-green-03 border-green-03/20",
    indirect: "bg-blue-03/15 text-blue-03 border-blue-03/20",
    enabling: "bg-orange-03/15 text-orange-03 border-orange-03/20",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium border capitalize",
        colors[type] ?? "bg-gray-03/30 text-gray-02 border-gray-03/20",
      )}
    >
      {type}
    </span>
  );
}

export function ConfidenceBadge({
  confidence,
}: {
  confidence: MatchConfidence;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border capitalize",
        CONFIDENCE_CLASSES[confidence],
      )}
    >
      {confidence}
    </span>
  );
}

export const CONFIDENCE_ORDER: Record<MatchConfidence, number> = {
  high: 3,
  mid: 2,
  low: 1,
};
