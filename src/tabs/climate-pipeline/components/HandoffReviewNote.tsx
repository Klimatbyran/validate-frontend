import { cn } from "@/lib/utils";
import type {
  HandoffOutcome,
  HandoffReview,
} from "../lib/shadowTefHandoffReview";

const OUTCOME_STYLE: Record<HandoffOutcome, string> = {
  ADD: "border-green-03/40 bg-green-03/10 text-green-03",
  BROADEN: "border-teal-03/40 bg-teal-03/10 text-teal-03",
  "USE-EXISTING": "border-blue-03/40 bg-blue-03/10 text-blue-03",
  "DO-NOT-ADOPT": "border-pink-03/40 bg-pink-03/10 text-pink-03",
};

// The TEF authority's own historic verdict on this element, from the
// 2026-11-05 handoff -- see shadowTefHandoffReview.ts. Deliberately styled
// as its own dashed-border block, separate from the in-app `comment` field
// (ReviewVerdict / the card's own comment display): that field is live and
// can change or vanish (e.g. once an element is promoted into the real
// taxonomy and deleted), while this is frozen evidence of what was decided
// at the time, which is exactly the thing a live field can't guarantee to
// still show.
export function HandoffReviewNote({
  review,
}: {
  review: HandoffReview | null;
}) {
  if (!review) return null;
  return (
    <div className="rounded-md border border-dashed border-gray-03 bg-gray-05/40 p-2 space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-02">
        TEF handoff review · 2026-11-05
      </p>
      {review.outcomes.map((o, i) => (
        <div key={i} className="space-y-0.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
                OUTCOME_STYLE[o.outcome],
              )}
            >
              {o.outcome}
            </span>
            {o.component && o.component !== review.originalLabel ? (
              <span className="text-[11px] text-gray-02">{o.component}</span>
            ) : null}
          </div>
          {o.comment ? (
            <p className="text-xs text-gray-02 italic break-words">
              “{o.comment}”
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
