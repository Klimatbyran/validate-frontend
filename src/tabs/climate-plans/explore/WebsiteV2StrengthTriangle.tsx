import { cn } from "@/lib/utils";
import {
  TRIANGLE_VERTICES,
  buildStrengthTriangleModel,
  guideRingPoints,
  strengthPolygonPoints,
  type StrengthTriangleModel,
} from "../lib/website-v2-strength-triangle";
import type { FocusMatchVerdict } from "../lib/website-kpis";

const AXIS_COLORS = [
  "text-blue-03",
  "text-green-03",
  "text-orange-02",
] as const;

const LABEL_ANCHORS = [
  { x: 50, y: 2, anchor: "middle" as const },
  { x: 98, y: 96, anchor: "end" as const },
  { x: 2, y: 96, anchor: "start" as const },
];

function TriangleSvg({ model }: { model: StrengthTriangleModel }) {
  const strengths = model.axes.map((a) => a.strength) as [
    number | null,
    number | null,
    number | null,
  ];
  const polygon = strengthPolygonPoints(strengths);

  return (
    <svg
      viewBox="0 0 100 100"
      className="w-full max-w-[280px] mx-auto aspect-square"
      role="img"
      aria-label="Three-axis strength diagram for action detail, biggest-source fit, and actions found"
    >
      {[0.33, 0.66, 1].map((f) => (
        <polygon
          key={f}
          points={guideRingPoints(f)}
          fill="none"
          className="stroke-gray-03/50"
          strokeWidth={0.6}
        />
      ))}
      <polygon
        points={guideRingPoints(1)}
        fill="none"
        className="stroke-gray-03/80"
        strokeWidth={1}
      />
      {TRIANGLE_VERTICES.map((v, i) => (
        <line
          key={`spoke-${i}`}
          x1={50}
          y1={61.333}
          x2={v.x}
          y2={v.y}
          className="stroke-gray-03/40"
          strokeWidth={0.5}
        />
      ))}
      <polygon
        points={polygon}
        className="fill-blue-03/25 stroke-blue-03"
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      {TRIANGLE_VERTICES.map((v, i) => (
        <circle
          key={`vertex-${i}`}
          cx={v.x}
          cy={v.y}
          r={1.6}
          className="fill-gray-02"
        />
      ))}
      {LABEL_ANCHORS.map((anchor, i) => {
        const axis = model.axes[i]!;
        return (
          <text
            key={axis.id}
            x={anchor.x}
            y={anchor.y}
            textAnchor={anchor.anchor}
            className={cn("fill-current text-[4.2px]", AXIS_COLORS[i])}
          >
            <tspan x={anchor.x} dy="0" className="font-medium">
              {axis.label}
            </tspan>
            <tspan x={anchor.x} dy="5.2" className="fill-gray-02 text-[3.6px]">
              {axis.display}
              {axis.volumeOnly ? " · volume" : ""}
              {axis.strength == null ? " · n/a" : ""}
            </tspan>
          </text>
        );
      })}
    </svg>
  );
}

export function WebsiteV2StrengthTriangle({
  concretenessScore,
  focusVerdict,
  focusShortLabel,
  uniqueMeasureCount,
  className,
}: {
  concretenessScore: number | null;
  focusVerdict: FocusMatchVerdict;
  focusShortLabel: string;
  uniqueMeasureCount: number;
  className?: string;
}) {
  const model = buildStrengthTriangleModel({
    concretenessScore,
    focusVerdict,
    focusShortLabel,
    uniqueMeasureCount,
  });

  return (
    <section
      className={cn(
        "rounded-[24px] border border-gray-03/40 bg-gray-05/30 px-5 py-5 space-y-4",
        className,
      )}
    >
      <div className="max-w-2xl">
        <div className="text-[11px] uppercase tracking-wide text-gray-02">
          Strength snapshot
        </div>
        <h3 className="text-lg text-gray-01 font-medium mt-0.5">
          Three views of the same plan — not one quality score
        </h3>
        <p className="text-sm text-gray-02 mt-1 leading-relaxed">
          Each spoke is an independent signal. A large triangle does not mean
          the plan is effective; a small one does not mean it fails. Read the
          shape with the detail cards below.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,280px)_1fr] items-center">
        <TriangleSvg model={model} />
        <ul className="space-y-3">
          {model.axes.map((axis, i) => (
            <li
              key={axis.id}
              className="rounded-2xl border border-gray-03/40 bg-gray-04/40 px-3.5 py-3"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span
                  className={cn(
                    "text-sm font-medium",
                    AXIS_COLORS[i] ?? "text-gray-01",
                  )}
                >
                  {axis.label}
                </span>
                <span className="text-sm tabular-nums text-gray-01">
                  {axis.display}
                </span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-gray-03/50 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full",
                    i === 0
                      ? "bg-blue-03/80"
                      : i === 1
                        ? "bg-green-03/80"
                        : "bg-orange-02/80",
                    axis.strength == null && "bg-gray-03",
                  )}
                  style={{
                    width: `${Math.round((axis.strength ?? 0) * 100)}%`,
                  }}
                />
              </div>
              <p className="text-[11px] text-gray-02 mt-1.5">
                {axis.id === "actionDetail"
                  ? "How fully actions are written up — not impact."
                  : axis.id === "biggestSource"
                    ? "Whether actions meet the largest emission source."
                    : "Volume only. More actions is not automatically better."}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
