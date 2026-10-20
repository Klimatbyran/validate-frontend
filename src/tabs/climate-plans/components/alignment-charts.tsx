import { cn } from "@/lib/utils";
import { EMISSION_BUCKET_LABEL, type EmissionBucket } from "../lib/tef-groups";
import type { AlignmentRow, AlignmentValueMode } from "../lib/explore-types";

/** Stable colours per bucket so pies / stacks stay comparable. */
export const BUCKET_FILL: Record<EmissionBucket, string> = {
  transport: "#22c55e",
  industry: "#3b82f6",
  energy: "#eab308",
  heating: "#ef4444",
  agriculture: "#f97316",
  machinery: "#a855f7",
  waste: "#14b8a6",
  product: "#64748b",
  other: "#6b7280",
};

function formatShare(share: number): string {
  return `${(share * 100).toFixed(0)}%`;
}

export function formatTonnes(tonnes: number): string {
  if (tonnes >= 10_000) return `${(tonnes / 1000).toFixed(0)} kt`;
  if (tonnes >= 1000) return `${(tonnes / 1000).toFixed(1)} kt`;
  return `${Math.round(tonnes).toLocaleString()} t`;
}

export function emissionLabel(
  row: AlignmentRow,
  mode: AlignmentValueMode,
): string {
  return mode === "absolute"
    ? formatTonnes(row.emissionTonnes)
    : formatShare(row.emissionShare);
}

export function tefLabel(row: AlignmentRow, mode: AlignmentValueMode): string {
  return mode === "absolute"
    ? `${row.tefCount} hit${row.tefCount === 1 ? "" : "s"}`
    : formatShare(row.tefShare);
}

export function BucketLegend({ rows }: { rows: AlignmentRow[] }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-02">
      {rows.map((row) => (
        <span key={row.bucket} className="inline-flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-sm shrink-0"
            style={{ backgroundColor: BUCKET_FILL[row.bucket] }}
          />
          {EMISSION_BUCKET_LABEL[row.bucket]}
        </span>
      ))}
    </div>
  );
}

/** Simple SVG pie (share-based slices). */
export function SharePie({
  rows,
  valueKey,
  title,
  subtitle,
}: {
  rows: AlignmentRow[];
  valueKey: "emissionShare" | "tefShare";
  title: string;
  subtitle?: string;
}) {
  const slices = rows
    .map((row) => ({
      bucket: row.bucket,
      share: row[valueKey],
      color: BUCKET_FILL[row.bucket],
    }))
    .filter((s) => s.share > 0);
  const total = slices.reduce((s, x) => s + x.share, 0);

  const size = 160;
  const r = 68;
  const cx = size / 2;
  const cy = size / 2;

  let angle = -Math.PI / 2;
  const paths: { d: string; color: string; bucket: EmissionBucket }[] = [];
  if (total > 0) {
    for (const slice of slices) {
      const sweep = (slice.share / total) * Math.PI * 2;
      if (sweep <= 0) continue;
      const end = angle + sweep;
      if (slices.length === 1 || sweep >= Math.PI * 2 - 1e-6) {
        paths.push({
          bucket: slice.bucket,
          color: slice.color,
          d: `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`,
        });
      } else {
        const x1 = cx + r * Math.cos(angle);
        const y1 = cy + r * Math.sin(angle);
        const x2 = cx + r * Math.cos(end);
        const y2 = cy + r * Math.sin(end);
        const large = sweep > Math.PI ? 1 : 0;
        paths.push({
          bucket: slice.bucket,
          color: slice.color,
          d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`,
        });
      }
      angle = end;
    }
  }

  return (
    <div className="flex flex-col items-center gap-2 min-w-[10rem]">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="shrink-0"
        role="img"
        aria-label={title}
      >
        {paths.length === 0 ? (
          <circle cx={cx} cy={cy} r={r} className="fill-gray-03/30" />
        ) : (
          paths.map((p) => (
            <path
              key={p.bucket}
              d={p.d}
              fill={p.color}
              className="stroke-gray-05/40"
              strokeWidth={1}
            >
              <title>
                {EMISSION_BUCKET_LABEL[p.bucket]}:{" "}
                {formatShare(
                  slices.find((s) => s.bucket === p.bucket)?.share ?? 0,
                )}
              </title>
            </path>
          ))
        )}
      </svg>
      <div className="text-center">
        <div className="text-sm font-semibold text-gray-01">{title}</div>
        {subtitle ? (
          <div className="text-xs text-gray-02 mt-0.5">{subtitle}</div>
        ) : null}
      </div>
    </div>
  );
}

export function DualBar({ emission, tef }: { emission: number; tef: number }) {
  return (
    <div className="space-y-1">
      <div className="h-2 rounded-full bg-gray-03/30">
        <div
          className="h-2 rounded-full bg-orange-03/80"
          style={{ width: `${Math.round(emission * 100)}%` }}
        />
      </div>
      <div className="h-2 rounded-full bg-gray-03/30">
        <div
          className="h-2 rounded-full bg-blue-03/80"
          style={{ width: `${Math.round(tef * 100)}%` }}
        />
      </div>
    </div>
  );
}

/** 100% stacked bars — emissions mix vs TEF mix. */
export function StackedCompare({ rows }: { rows: AlignmentRow[] }) {
  const tracks = [
    {
      key: "emissions",
      label: "Territorial emissions",
      shares: rows.map((r) => ({
        bucket: r.bucket,
        share: r.emissionShare,
      })),
    },
    {
      key: "tefs",
      label: "TEF hits in plan",
      shares: rows.map((r) => ({ bucket: r.bucket, share: r.tefShare })),
    },
  ] as const;

  return (
    <div className="space-y-4">
      {tracks.map((track) => (
        <div key={track.key} className="space-y-1.5">
          <div className="text-xs font-medium text-gray-02">{track.label}</div>
          <div className="flex h-8 rounded-md overflow-hidden border border-gray-03/30">
            {track.shares
              .filter((s) => s.share > 0)
              .map((s) => (
                <div
                  key={s.bucket}
                  className="h-full min-w-[2px]"
                  style={{
                    width: `${s.share * 100}%`,
                    backgroundColor: BUCKET_FILL[s.bucket],
                  }}
                  title={`${EMISSION_BUCKET_LABEL[s.bucket]}: ${formatShare(s.share)}`}
                />
              ))}
          </div>
        </div>
      ))}
      <BucketLegend rows={rows} />
    </div>
  );
}

/** Dumbbell: emission % vs TEF % with a connecting gap line. */
export function GapDumbbells({ rows }: { rows: AlignmentRow[] }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-3 text-[11px] text-gray-02">
        <span className="inline-flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-03/80" />{" "}
          emissions %
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-03/80" /> TEF %
        </span>
      </div>
      {rows.map((row) => {
        const left = Math.min(row.emissionShare, row.tefShare);
        const width = Math.abs(row.gap);
        const tefHigher = row.tefShare >= row.emissionShare;
        return (
          <div key={row.bucket} className="space-y-1">
            <div className="flex justify-between text-sm gap-2">
              <span className="text-gray-01 truncate">
                {EMISSION_BUCKET_LABEL[row.bucket]}
              </span>
              <span
                className={cn(
                  "tabular-nums text-xs shrink-0",
                  Math.abs(row.gap) < 0.05
                    ? "text-gray-02"
                    : tefHigher
                      ? "text-blue-03"
                      : "text-orange-03",
                )}
              >
                {tefHigher ? "+" : ""}
                {(row.gap * 100).toFixed(0)} pp
              </span>
            </div>
            <div className="relative h-4">
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-gray-03/40" />
              <div
                className="absolute top-1/2 -translate-y-1/2 h-0.5 bg-gray-03/70"
                style={{
                  left: `${left * 100}%`,
                  width: `${width * 100}%`,
                }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-orange-03 border border-gray-05"
                style={{ left: `calc(${row.emissionShare * 100}% - 5px)` }}
                title={`Emissions ${formatShare(row.emissionShare)}`}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-blue-03 border border-gray-05"
                style={{ left: `calc(${row.tefShare * 100}% - 5px)` }}
                title={`TEFs ${formatShare(row.tefShare)}`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
