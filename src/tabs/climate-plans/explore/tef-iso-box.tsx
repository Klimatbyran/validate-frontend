import type { TefIconKind } from "../lib/tef-icon-kind";
import { tefCellFill } from "../lib/tef-framework";
import { TefCubeIcon } from "./tef-cube-icons";

/**
 * Forward-pitched isometric depth → screen offset.
 * Higher dy than classic iso so top faces tip toward the viewer.
 */
export function isoDepthOffset(d: number): { dx: number; dy: number } {
  return { dx: d * 0.55, dy: d * 0.68 };
}

/** Front-face height scale under the same pitch (keeps pillar height ratios). */
export const ISO_FRONT_H_SCALE = 0.9;

/** Flat isometric box: front, right, top faces as SVG polygons. */
export function IsoBox({
  x,
  y,
  w,
  h,
  d,
  rgb,
  intensity,
  selected,
  frontIcon,
  frontValue,
  frontTitle,
  frontMeta,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  d: number;
  rgb: readonly [number, number, number];
  intensity: number;
  selected: boolean;
  /** Compact overview: glyph instead of TE index code. */
  frontIcon?: TefIconKind;
  frontValue?: string;
  /** Multi-line TEF name for expanded cubes (HTML via foreignObject). */
  frontTitle?: string;
  frontMeta?: string;
}) {
  const { dx, dy } = isoDepthOffset(d);
  // Mild forward pitch: front face foreshortens uniformly so pillar height ratios stay comparable.
  const frontH = h * ISO_FRONT_H_SCALE;
  // Lean the front face slightly toward the viewer (top edge closer than bottom).
  const lean = d * 0.12;

  const front = tefCellFill(rgb, intensity);
  const side = tefCellFill(rgb, Math.max(0.15, intensity - 0.22));
  const top = tefCellFill(rgb, Math.min(1, intensity + 0.18));
  const stroke = selected ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.35)";
  const strokeW = selected ? 1.25 : 0.75;

  // Front: parallelogram — top edge pulled toward camera (down-screen less than bottom).
  const f0 = `${x + lean},${y + dy}`;
  const f1 = `${x + w - lean},${y + dy}`;
  const f2 = `${x + w},${y + dy + frontH}`;
  const f3 = `${x},${y + dy + frontH}`;

  const r0 = `${x + w - lean},${y + dy}`;
  const r1 = `${x + w - lean + dx},${y}`;
  const r2 = `${x + w + dx},${y + frontH}`;
  const r3 = `${x + w},${y + dy + frontH}`;

  const t0 = `${x + lean},${y + dy}`;
  const t1 = `${x + lean + dx},${y}`;
  const t2 = `${x + w - lean + dx},${y}`;
  const t3 = `${x + w - lean},${y + dy}`;

  const textX = x + w / 2;
  const valueY = y + dy + frontH * 0.68;
  const iconCy = frontValue ? y + dy + frontH * 0.34 : y + dy + frontH * 0.5;
  const iconSize = Math.max(14, Math.min(20, w * 0.42));
  const pad = 6;

  return (
    <g>
      <polygon
        points={`${t0} ${t1} ${t2} ${t3}`}
        fill={top}
        stroke={stroke}
        strokeWidth={strokeW}
        strokeLinejoin="miter"
      />
      <polygon
        points={`${r0} ${r1} ${r2} ${r3}`}
        fill={side}
        stroke={stroke}
        strokeWidth={strokeW}
        strokeLinejoin="miter"
      />
      <polygon
        points={`${f0} ${f1} ${f2} ${f3}`}
        fill={front}
        stroke={stroke}
        strokeWidth={strokeW}
        strokeLinejoin="miter"
      />
      {frontTitle ? (
        <foreignObject
          x={x + pad + lean * 0.5}
          y={y + dy + pad}
          width={Math.max(0, w - pad * 2 - lean)}
          height={Math.max(0, frontH - pad * 2)}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              color: "#fff",
              overflow: "hidden",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                fontWeight: 600,
                lineHeight: 1.25,
                display: "-webkit-box",
                WebkitLineClamp: 4,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {frontTitle}
            </div>
            {frontMeta ? (
              <div
                style={{
                  fontSize: "10px",
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  opacity: 0.9,
                  marginTop: 4,
                }}
              >
                {frontMeta}
              </div>
            ) : null}
          </div>
        </foreignObject>
      ) : frontIcon || frontValue ? (
        <g
          style={{
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          }}
        >
          {frontIcon ? (
            <TefCubeIcon
              kind={frontIcon}
              cx={textX}
              cy={iconCy}
              size={iconSize}
            />
          ) : null}
          {frontValue ? (
            <text
              x={textX}
              y={valueY}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#ffffff"
              fontSize={Math.max(10, Math.min(13, w * 0.26))}
              fontWeight={700}
            >
              {frontValue}
            </text>
          ) : null}
        </g>
      ) : null}
    </g>
  );
}
