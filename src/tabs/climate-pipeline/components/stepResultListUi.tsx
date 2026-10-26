import type { ReactNode } from "react";

export function QaFooter({ children }: { children: ReactNode }) {
  return (
    <div className="mt-3 pt-2 border-t border-gray-03/60 min-w-0">
      {children}
    </div>
  );
}

export type MetaChipTone = "neutral" | "score" | "type" | "relevance";

function metaChipToneClass(tone: MetaChipTone): string {
  switch (tone) {
    case "score":
      return "border-blue-03/40 bg-blue-03/15 text-blue-03";
    case "type":
      return "border-orange-03/40 bg-orange-03/15 text-orange-03";
    case "relevance":
      return "border-green-03/40 bg-green-03/15 text-green-03";
    default:
      return "border-gray-03 bg-gray-03/40 text-gray-01";
  }
}

export function MetaChip({
  label,
  children,
  tone = "neutral",
  large = false,
}: {
  label: string;
  children: React.ReactNode;
  tone?: MetaChipTone;
  large?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border ${large ? "px-2.5 py-1.5 text-sm" : "px-2 py-1 text-xs"} ${metaChipToneClass(tone)}`}
    >
      <span
        className={`uppercase tracking-wide opacity-80 ${large ? "text-xs" : "text-[10px]"}`}
      >
        {label}
      </span>
      <span className="font-semibold tabular-nums">{children}</span>
    </span>
  );
}

/** Visual weight for 1–7 scores: all stay readable; higher = stronger fill/type. */
function scoreStrengthClass(score: number | null | undefined): string {
  const level = Math.min(7, Math.max(1, Math.round(score ?? 1)));
  switch (level) {
    case 1:
      return "border-blue-03/25 bg-blue-03/8 text-blue-03/65 font-medium";
    case 2:
      return "border-blue-03/30 bg-blue-03/12 text-blue-03/75 font-medium";
    case 3:
      return "border-blue-03/40 bg-blue-03/18 text-blue-03/85 font-semibold";
    case 4:
      return "border-blue-03/50 bg-blue-03/25 text-blue-03 font-semibold";
    case 5:
      return "border-blue-03/60 bg-blue-03/35 text-blue-03 font-bold";
    case 6:
      return "border-blue-03/80 bg-blue-03/45 text-blue-03 font-bold";
    default:
      return "border-blue-03 bg-blue-03/55 text-blue-03 font-bold ring-1 ring-blue-03/50";
  }
}

export function ScoreChip({
  label,
  score,
  large = false,
}: {
  label: string;
  score: number | null | undefined;
  large?: boolean;
}) {
  const display = score ?? "—";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border tabular-nums ${large ? "px-2.5 py-1.5 text-sm" : "px-2 py-1 text-xs"} ${scoreStrengthClass(score)}`}
      title={`${label}: ${display} (1 weak → 7 strong)`}
    >
      <span
        className={`uppercase tracking-wide opacity-80 ${large ? "text-xs" : "text-[10px]"}`}
      >
        {label}
      </span>
      <span>{display}</span>
    </span>
  );
}
