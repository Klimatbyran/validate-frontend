import { useState, type ReactNode } from "react";
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  ClipboardCopy,
  Loader2,
} from "lucide-react";
import { copyMarkdown } from "../lib/copyMarkdown";
import { cn } from "@/lib/utils";
import { MunicipalityPill } from "./MunicipalityPill";
import { formatSnapshotName } from "../hooks/useShadowElementSnapshots";
import {
  useRematchReport,
  type RematchOutcome,
  type RematchReport,
  type RematchReportNewElement,
  type RematchReportOldElement,
  type RematchReportShift,
} from "../hooks/useShadowRebuild";

// Snapshot vs. live for the commitments that were on (or reattached off) a
// shadow element when the snapshot was taken: where each one ended up after
// the rematch, grouped by the shadow element it used to sit on.

const OUTCOMES: {
  key: RematchOutcome;
  label: string;
  bar: string;
  text: string;
}[] = [
  {
    key: "real_tef",
    label: "Real TEF",
    bar: "bg-green-03",
    text: "text-green-03",
  },
  {
    key: "recovered",
    label: "AI-recovered TEF",
    bar: "bg-teal-03",
    text: "text-teal-03",
  },
  {
    key: "shadow",
    label: "Shadow",
    bar: "bg-purple-03",
    text: "text-purple-03",
  },
  {
    key: "no_match",
    label: "No match",
    bar: "bg-gray-02",
    text: "text-gray-02",
  },
  {
    key: "pending",
    label: "Not rematched yet",
    bar: "bg-amber-03",
    text: "text-amber-03",
  },
  {
    key: "gone",
    label: "Commitment deleted",
    bar: "bg-pink-03",
    text: "text-pink-03",
  },
];
const OUTCOME_BY_KEY = Object.fromEntries(
  OUTCOMES.map((o) => [o.key, o]),
) as Record<RematchOutcome, (typeof OUTCOMES)[number]>;

function OutcomeBar({
  counts,
  className,
}: {
  counts: Record<RematchOutcome, number>;
  className?: string;
}) {
  const total = OUTCOMES.reduce((n, o) => n + (counts[o.key] ?? 0), 0);
  if (total === 0) return null;
  return (
    <div
      className={cn(
        "flex h-2 w-full overflow-hidden rounded-full bg-gray-03/40 gap-px",
        className,
      )}
    >
      {OUTCOMES.filter((o) => counts[o.key] > 0).map((o) => (
        <div
          key={o.key}
          className={o.bar}
          style={{ width: `${(counts[o.key] / total) * 100}%` }}
          title={`${o.label}: ${counts[o.key]}`}
        />
      ))}
    </div>
  );
}

function OutcomeCounts({ counts }: { counts: Record<RematchOutcome, number> }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
      {OUTCOMES.filter((o) => counts[o.key] > 0).map((o) => (
        <span key={o.key} className={o.text}>
          {counts[o.key]} {o.label.toLowerCase()}
        </span>
      ))}
    </div>
  );
}

// The review's decision for a commitment (the TEF reviewers' four, plus
// older categories still on commitments reviewed before them). "NONE" means
// the matcher found a real TEF directly, so no review ran.
const DECISIONS: Record<string, { label: string; text: string }> = {
  NONE: { label: "Matched directly", text: "text-green-03" },
  USE_EXISTING: { label: "Use existing", text: "text-teal-03" },
  BROADEN: { label: "Broaden", text: "text-blue-03" },
  TAXONOMY_GAP: { label: "Add (new element)", text: "text-purple-03" },
  DO_NOT_ADOPT: {
    label: "No new element (do not adopt)",
    text: "text-pink-03",
  },
  ENABLING_NOT_SHIFT: { label: "Enabling, not a shift", text: "text-gray-02" },
  RETRIEVAL_MISS: { label: "Missed element", text: "text-teal-03" },
  JUDGE_ERROR: { label: "Judge error", text: "text-gray-02" },
  CORRECT_NO_MATCH: { label: "No match", text: "text-gray-02" },
};

function decisionOf(shift: RematchReportShift): string | null {
  if (shift.after.outcome === "pending" || shift.after.outcome === "gone")
    return null;
  return shift.after.aiReviewCategory ?? "NONE";
}

function decisionInfo(key: string) {
  return (
    DECISIONS[key] ?? {
      label: key.replace(/_/g, " ").toLowerCase(),
      text: "text-gray-02",
    }
  );
}

/** "Broaden <labels>: <extension>. <reason>" -> the extension part. */
function broadenExtensionOf(explanation: string | null): string | null {
  const m = explanation?.match(/^Broaden [^:]+:\s*(.+?)\.\s/);
  return m ? m[1] : null;
}

function afterText(shift: RematchReportShift): string {
  const a = shift.after;
  switch (a.outcome) {
    case "real_tef":
      return a.realLabels.join(", ") || "Real TEF";
    case "recovered":
      return a.recoveredLabel ?? "AI-recovered TEF";
    case "shadow":
      return a.shadowLabel ?? "Shadow element";
    case "no_match":
      // The badge already says "No match"; the decision line says why.
      return "";
    case "pending":
      return "Not rematched yet";
    case "gone":
      return "Commitment no longer exists";
  }
}

function shiftMarkdown(s: RematchReportShift, showBefore = false): string {
  const outcome = OUTCOME_BY_KEY[s.after.outcome].label;
  const after = afterText(s);
  const d = decisionOf(s);
  const lines = [
    `- **${s.municipalityName ?? "Unknown municipality"}**: "${s.measureText.replace(/\s+/g, " ").trim()}"`,
    `  - Shift: ${s.shiftFrom} → ${s.shiftTo}`,
  ];
  if (showBefore) {
    lines.push(
      `  - Before: ${
        s.before.kind === "reattached"
          ? `reattached by a reviewer to ${s.before.reattachedToLabel ?? "a real TEF"}`
          : `shadow element "${s.before.shadowLabel}"`
      }`,
    );
  }
  lines.push(`  - Now: ${outcome}${after ? `: ${after}` : ""}`);
  if (d && d !== "NONE") {
    lines.push(
      `  - Decision: ${decisionInfo(d).label}. ${s.after.aiReviewExplanation ?? ""}`.trimEnd(),
    );
  }
  return lines.join("\n");
}

/** The report as currently filtered, as Markdown -- for pasting into a
 * chat with an AI or a colleague. */
function reportMarkdown(args: {
  report: RematchReport;
  filters: string[];
  total: number;
  leftShadow: number;
  summaryCounts: Record<RematchOutcome, number>;
  decisionCounts: Map<string, number>;
  oldElements: RematchReportOldElement[];
  reattached: RematchReportShift[];
  broadenByElement: Map<string, RematchReportShift[]>;
  newElements: RematchReportNewElement[];
  shadowByNewId: Map<string, number>;
}): string {
  const { report } = args;
  const out: string[] = [
    `# Rematch report vs "${formatSnapshotName(report)}"`,
    "",
  ];
  if (report.run) {
    out.push(
      `Rebuild ${report.run.status}${report.run.finishedAt ? `, finished ${new Date(report.run.finishedAt).toLocaleString("sv-SE", { dateStyle: "short", timeStyle: "short" })}` : ""}.`,
    );
  }
  out.push(
    `Filters: ${args.filters.length ? args.filters.join(", ") : "none"}.`,
    "",
    "## Summary",
    `- Commitments: ${args.total}`,
    `- Left the shadow taxonomy: ${args.leftShadow}${args.total ? ` (${Math.round((args.leftShadow / args.total) * 100)}%)` : ""}`,
    `- Now on a real TEF: ${args.summaryCounts.real_tef + args.summaryCounts.recovered} (${args.summaryCounts.recovered} AI-recovered)`,
    `- Shadow elements (active, all plans): ${report.summary.shadowElementsBefore} → ${report.summary.shadowElementsAfter}`,
    `- Outcomes: ${OUTCOMES.filter((o) => args.summaryCounts[o.key] > 0)
      .map((o) => `${o.label} ${args.summaryCounts[o.key]}`)
      .join(", ")}`,
    `- Decisions: ${[...args.decisionCounts.entries()]
      .map(([k, n]) => `${decisionInfo(k).label} ${n}`)
      .join(", ")}`,
    "",
    `## Old shadow elements (${args.oldElements.length}), and where their commitments went`,
  );
  for (const el of args.oldElements) {
    out.push(
      "",
      `### ${el.shortLabel} (${el.status}, ${el.shifts.length} commitment${el.shifts.length === 1 ? "" : "s"})`,
      el.description,
    );
    if (el.comment) out.push(`Reviewer comment: ${el.comment}`);
    out.push("", ...el.shifts.map((s) => shiftMarkdown(s)));
  }
  if (args.reattached.length) {
    out.push(
      "",
      `## Previously reattached by a reviewer (${args.reattached.length})`,
      "",
      ...args.reattached.map((s) => shiftMarkdown(s, true)),
    );
  }
  if (args.broadenByElement.size) {
    out.push("", "## Broaden proposals");
    for (const [label, shifts] of args.broadenByElement) {
      out.push("", `### ${label} (${shifts.length})`);
      const exts = [
        ...new Set(
          shifts
            .map((s) => broadenExtensionOf(s.after.aiReviewExplanation))
            .filter(Boolean),
        ),
      ];
      for (const ext of exts) out.push(`- Proposed extension: ${ext}`);
      out.push("", ...shifts.map((s) => shiftMarkdown(s, true)));
    }
  }
  out.push(
    "",
    `## Shadow elements after the rematch (${args.newElements.length})`,
  );
  for (const el of args.newElements) {
    out.push(
      `- **${el.shortLabel}** (${el.qualityGrade}, ${args.shadowByNewId.get(el.id)} commitment${args.shadowByNewId.get(el.id) === 1 ? "" : "s"}): ${el.description}. From: ${el.fromOldElements.map((f) => `${f.shortLabel} (${f.count})`).join(", ")}`,
    );
  }
  return out.join("\n") + "\n";
}

const copyText = (text: string) => copyMarkdown(text, "rematch-report.md");

function ShiftRow({
  shift,
  showBefore,
}: {
  shift: RematchReportShift;
  showBefore?: boolean;
}) {
  const o = OUTCOME_BY_KEY[shift.after.outcome];
  return (
    <li className="rounded-md border border-gray-03/40 bg-gray-05/20 p-2 space-y-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <MunicipalityPill name={shift.municipalityName} />
        <span className="text-xs text-gray-02">
          {shift.shiftFrom} → {shift.shiftTo}
        </span>
      </div>
      <p
        className="text-xs text-gray-01 line-clamp-2"
        title={shift.measureText}
      >
        {shift.measureText}
      </p>
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        {showBefore && (
          <>
            <span className="text-gray-02">
              {shift.before.kind === "reattached"
                ? `Reviewer: ${shift.before.reattachedToLabel ?? "real TEF"}`
                : shift.before.shadowLabel}
            </span>
            <ArrowRight className="w-3 h-3 text-gray-02" />
          </>
        )}
        <span
          className={cn(
            "rounded-full border px-1.5 py-0.5 border-current/30",
            o.text,
          )}
        >
          {o.label}
        </span>
        {afterText(shift) && (
          <span className="text-gray-01">{afterText(shift)}</span>
        )}
      </div>
      {(() => {
        const d = decisionOf(shift);
        if (!d || d === "NONE") return null;
        const info = decisionInfo(d);
        return (
          <p className="text-[11px] text-gray-02">
            <span className={cn("font-semibold not-italic mr-1", info.text)}>
              {info.label}:
            </span>
            <span className="italic">{shift.after.aiReviewExplanation}</span>
          </p>
        );
      })()}
    </li>
  );
}

function Expandable({
  header,
  children,
}: {
  header: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-md border border-gray-03/50 bg-gray-05/30">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left p-2.5 flex gap-2 items-start"
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown className="w-4 h-4 mt-0.5 shrink-0 text-gray-02" />
        ) : (
          <ChevronRight className="w-4 h-4 mt-0.5 shrink-0 text-gray-02" />
        )}
        <div className="flex-1 min-w-0 space-y-1.5">{header}</div>
      </button>
      {open && <div className="px-2.5 pb-2.5 pl-8">{children}</div>}
    </div>
  );
}

export function RematchReportView({
  snapshotRunId,
  refreshToken,
  municipalityFilter,
}: {
  snapshotRunId: string | null;
  refreshToken?: number;
  /** Empty string means "all municipalities". */
  municipalityFilter?: string;
}) {
  const { report, isLoading, error } = useRematchReport(
    snapshotRunId,
    refreshToken,
  );
  const [outcomeFilter, setOutcomeFilter] = useState<RematchOutcome | "">("");
  const [decisionFilter, setDecisionFilter] = useState("");

  if (!snapshotRunId) {
    return (
      <p className="text-sm text-gray-02 py-4">
        No snapshot selected. Take one (or rebuild) to get a report.
      </p>
    );
  }
  if (isLoading && !report) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-02 py-4">
        <Loader2 className="w-4 h-4 animate-spin" />
        Building rematch report…
      </div>
    );
  }
  if (error) return <p className="text-sm text-red-03 py-4">{error}</p>;
  if (!report) return null;

  const keep = (s: RematchReportShift) =>
    (!municipalityFilter || s.municipalityName === municipalityFilter) &&
    (!outcomeFilter || s.after.outcome === outcomeFilter) &&
    (!decisionFilter || decisionOf(s) === decisionFilter);

  const countsOf = (shifts: RematchReportShift[]) => {
    const c = Object.fromEntries(OUTCOMES.map((o) => [o.key, 0])) as Record<
      RematchOutcome,
      number
    >;
    for (const s of shifts) c[s.after.outcome]++;
    return c;
  };

  const oldElements = report.oldElements
    .map((el) => ({ ...el, shifts: el.shifts.filter(keep) }))
    .filter((el) => el.shifts.length > 0);
  const reattached = report.reattachedBefore.filter(keep);
  const allShifts = [
    ...report.oldElements.flatMap((e) => e.shifts),
    ...report.reattachedBefore,
  ].filter(
    (s) => !municipalityFilter || s.municipalityName === municipalityFilter,
  );
  const summaryCounts = countsOf(allShifts);
  const total = allShifts.length;
  const leftShadow = total - summaryCounts.shadow;
  const isFiltered = Boolean(municipalityFilter);
  const shadowByNewId = new Map<string, number>();
  for (const s of allShifts.filter(
    (s) => !outcomeFilter || s.after.outcome === outcomeFilter,
  )) {
    if (s.after.shadowElementId) {
      shadowByNewId.set(
        s.after.shadowElementId,
        (shadowByNewId.get(s.after.shadowElementId) ?? 0) + 1,
      );
    }
  }
  const newElements = report.newElements.filter((e) => shadowByNewId.has(e.id));

  const decisionCounts = new Map<string, number>();
  for (const s of allShifts) {
    const d = decisionOf(s);
    if (d) decisionCounts.set(d, (decisionCounts.get(d) ?? 0) + 1);
  }
  // Broaden proposals grouped per existing TEF element -- what goes back to
  // the TEF reviewers.
  const broadenByElement = new Map<string, RematchReportShift[]>();
  for (const s of allShifts.filter(keep)) {
    if (s.after.aiReviewCategory !== "BROADEN") continue;
    const key = s.after.recoveredLabel ?? "(unknown element)";
    broadenByElement.set(key, [...(broadenByElement.get(key) ?? []), s]);
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-gray-03/60 bg-gray-05/30 p-4 space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-01">
            Rematch vs “{formatSnapshotName(report)}”
          </h3>
          <button
            type="button"
            onClick={() =>
              void copyText(
                reportMarkdown({
                  report,
                  filters: [
                    municipalityFilter &&
                      `municipality = ${municipalityFilter}`,
                    outcomeFilter &&
                      `outcome = ${OUTCOME_BY_KEY[outcomeFilter].label}`,
                    decisionFilter &&
                      `decision = ${decisionInfo(decisionFilter).label}`,
                  ].filter((f): f is string => Boolean(f)),
                  total,
                  leftShadow,
                  summaryCounts,
                  decisionCounts,
                  oldElements,
                  reattached,
                  broadenByElement,
                  newElements,
                  shadowByNewId,
                }),
              )
            }
            title="Copy the report, with the current filters, as Markdown"
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-03 px-2.5 py-1 text-xs text-gray-02 hover:text-gray-01 hover:bg-gray-04/50"
          >
            <ClipboardCopy className="w-3.5 h-3.5" />
            Copy as Markdown
          </button>
          {report.run && (
            <span className="text-xs text-gray-02">
              Rebuild {report.run.status}
              {report.run.finishedAt
                ? ` · ${new Date(report.run.finishedAt).toLocaleString("sv-SE", { dateStyle: "short", timeStyle: "short" })}`
                : ""}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat
            label={
              isFiltered ? "Commitments (filtered)" : "Commitments rematched"
            }
            value={total}
          />
          <Stat
            label="Left the shadow taxonomy"
            value={leftShadow}
            hint={
              total ? `${Math.round((leftShadow / total) * 100)}%` : undefined
            }
          />
          <Stat
            label="Now on a real TEF"
            value={summaryCounts.real_tef + summaryCounts.recovered}
            hint={
              summaryCounts.recovered
                ? `${summaryCounts.recovered} AI-recovered`
                : undefined
            }
          />
          <Stat
            label="Shadow elements"
            value={`${report.summary.shadowElementsBefore} → ${report.summary.shadowElementsAfter}`}
            hint="active (not rejected/merged), all plans"
          />
        </div>
        <OutcomeBar counts={summaryCounts} className="h-3" />
        <div className="flex flex-wrap gap-1.5">
          <FilterChip
            active={outcomeFilter === ""}
            onClick={() => setOutcomeFilter("")}
          >
            All
          </FilterChip>
          {OUTCOMES.filter((o) => summaryCounts[o.key] > 0).map((o) => (
            <FilterChip
              key={o.key}
              active={outcomeFilter === o.key}
              onClick={() =>
                setOutcomeFilter(outcomeFilter === o.key ? "" : o.key)
              }
            >
              <span
                className={cn(
                  "inline-block w-2 h-2 rounded-full mr-1.5",
                  o.bar,
                )}
              />
              {o.label} {summaryCounts[o.key]}
            </FilterChip>
          ))}
        </div>
        {decisionCounts.size > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-gray-02 mr-1">Decision:</span>
            <FilterChip
              active={decisionFilter === ""}
              onClick={() => setDecisionFilter("")}
            >
              All
            </FilterChip>
            {[...decisionCounts.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([key, count]) => (
                <FilterChip
                  key={key}
                  active={decisionFilter === key}
                  onClick={() =>
                    setDecisionFilter(decisionFilter === key ? "" : key)
                  }
                >
                  <span className={cn("mr-1", decisionInfo(key).text)}>●</span>
                  {decisionInfo(key).label} {count}
                </FilterChip>
              ))}
          </div>
        )}
      </section>

      {broadenByElement.size > 0 && (
        <section className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-blue-03">
            Broaden proposals ({broadenByElement.size} TEF elements)
          </h4>
          <p className="text-xs text-gray-02">
            Existing elements the review would extend to cover these
            commitments. Nothing is changed in the TEF; this is a list to review
            and pass on.
          </p>
          {[...broadenByElement.entries()]
            .sort((a, b) => b[1].length - a[1].length)
            .map(([label, shifts]) => (
              <Expandable
                key={label}
                header={
                  <>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-medium text-gray-01">
                        {label}
                      </span>
                      <span className="text-xs text-gray-02">
                        {shifts.length} commitment
                        {shifts.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <ul className="text-xs text-gray-02 list-disc pl-4">
                      {[
                        ...new Set(
                          shifts
                            .map((s) =>
                              broadenExtensionOf(s.after.aiReviewExplanation),
                            )
                            .filter(Boolean),
                        ),
                      ].map((ext) => (
                        <li key={ext}>{ext}</li>
                      ))}
                    </ul>
                  </>
                }
              >
                <ul className="space-y-1.5">
                  {shifts.map((s) => (
                    <ShiftRow key={s.shiftId} shift={s} showBefore />
                  ))}
                </ul>
              </Expandable>
            ))}
        </section>
      )}

      <section className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-02">
          Old shadow elements ({oldElements.length}) — where their commitments
          went
        </h4>
        {oldElements.length === 0 && (
          <p className="text-sm text-gray-02">Nothing matches these filters.</p>
        )}
        {oldElements.map((el) => {
          const counts = countsOf(el.shifts);
          return (
            <Expandable
              key={el.originalId}
              header={
                <>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-medium text-gray-01">
                      {el.shortLabel}
                    </span>
                    <span className="text-[11px] rounded-full border border-gray-03 px-1.5 text-gray-02">
                      {el.status}
                    </span>
                    <span className="text-xs text-gray-02">
                      {el.shifts.length} commitment
                      {el.shifts.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <OutcomeBar counts={counts} />
                  <OutcomeCounts counts={counts} />
                  {el.comment && (
                    <p className="text-xs text-gray-02">💬 {el.comment}</p>
                  )}
                </>
              }
            >
              <p className="text-xs text-gray-02 mb-2">{el.description}</p>
              <ul className="space-y-1.5">
                {el.shifts.map((s) => (
                  <ShiftRow key={s.shiftId} shift={s} />
                ))}
              </ul>
            </Expandable>
          );
        })}
      </section>

      {reattached.length > 0 && (
        <section className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-02">
            Previously reattached by a reviewer ({reattached.length})
          </h4>
          <Expandable
            header={
              <>
                <OutcomeBar counts={countsOf(reattached)} />
                <OutcomeCounts counts={countsOf(reattached)} />
              </>
            }
          >
            <ul className="space-y-1.5">
              {reattached.map((s) => (
                <ShiftRow key={s.shiftId} shift={s} showBefore />
              ))}
            </ul>
          </Expandable>
        </section>
      )}

      <section className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-purple-03">
          Shadow elements after the rematch ({newElements.length})
        </h4>
        {newElements.length === 0 && (
          <p className="text-sm text-gray-02">
            None of these commitments are on a shadow element now.
          </p>
        )}
        {newElements.map((el) => (
          <div
            key={el.id}
            className="rounded-md border border-purple-03/30 bg-purple-03/5 p-2.5 space-y-1"
          >
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm font-medium text-gray-01">
                {el.shortLabel}
              </span>
              <span className="text-[11px] rounded-full border border-gray-03 px-1.5 text-gray-02">
                {el.qualityGrade}
              </span>
              <span className="text-xs text-gray-02">
                {shadowByNewId.get(el.id)} commitment
                {shadowByNewId.get(el.id) === 1 ? "" : "s"}
              </span>
            </div>
            <p className="text-xs text-gray-02">{el.description}</p>
            <p className="text-xs text-gray-02">
              From:{" "}
              {el.fromOldElements
                .map((f) => `${f.shortLabel} (${f.count})`)
                .join(" · ")}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="rounded-md border border-gray-03/40 bg-gray-04/30 p-2.5">
      <div className="text-lg font-semibold text-gray-01 tabular-nums">
        {value}
      </div>
      <div className="text-xs text-gray-02">{label}</div>
      {hint && <div className="text-[11px] text-gray-02/80">{hint}</div>}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs",
        active
          ? "border-blue-03 bg-blue-03/15 text-blue-03"
          : "border-gray-03 text-gray-02 hover:text-gray-01",
      )}
    >
      {children}
    </button>
  );
}
