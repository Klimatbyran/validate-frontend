import { cn } from "@/lib/utils";
import {
  ruleFlagById,
  type WebsiteRuleFlagId,
} from "../lib/website-rule-flags";

/** Inline flag for rule-based / hand-authored pieces that may need retuning. */
export function RuleFlagNote({
  id,
  tone = "dark",
  className,
}: {
  id: WebsiteRuleFlagId;
  tone?: "dark" | "light";
  className?: string;
}) {
  const flag = ruleFlagById(id);
  return (
    <div
      className={cn(
        "rounded-2xl border px-3 py-2 text-left",
        tone === "dark"
          ? "border-amber-400/35 bg-amber-400/10 text-amber-100"
          : "border-orange-03/40 bg-orange-03/10 text-orange-02",
        className,
      )}
      role="note"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "text-[10px] uppercase tracking-wide font-medium px-1.5 py-0.5 rounded",
            tone === "dark"
              ? "bg-amber-400/20 text-amber-200"
              : "bg-orange-03/20 text-orange-02",
          )}
        >
          Fixed rule · revisit
        </span>
        <span
          className={cn(
            "text-xs font-medium",
            tone === "dark" ? "text-white/90" : "text-gray-01",
          )}
        >
          {flag.label}
        </span>
      </div>
      <p
        className={cn(
          "mt-1 text-xs leading-relaxed",
          tone === "dark" ? "text-white/60" : "text-gray-02",
        )}
      >
        {flag.note}
      </p>
      <p
        className={cn(
          "mt-1 text-[10px] font-mono",
          tone === "dark" ? "text-white/40" : "text-gray-02/80",
        )}
      >
        {flag.source}
      </p>
    </div>
  );
}

export function RuleFlagChip({
  id,
  tone = "dark",
  className,
}: {
  id: WebsiteRuleFlagId;
  tone?: "dark" | "light";
  className?: string;
}) {
  const flag = ruleFlagById(id);
  return (
    <span
      title={`${flag.note} (${flag.source})`}
      className={cn(
        "inline-flex items-center gap-1 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border",
        tone === "dark"
          ? "border-amber-400/40 text-amber-200/90 bg-amber-400/10"
          : "border-orange-03/45 text-orange-02 bg-orange-03/10",
        className,
      )}
    >
      Fixed rule · {flag.label}
    </span>
  );
}
