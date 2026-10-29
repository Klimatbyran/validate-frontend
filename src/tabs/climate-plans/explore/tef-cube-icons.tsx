import type { ReactNode } from "react";
import type { TefIconKind } from "../lib/tef-icon-kind";

/**
 * Original stroke glyphs for compact TEF cubes (not TEF website artwork).
 * Drawn in a 24×24 design space, scaled into the isometric front face.
 */
export function TefCubeIcon({
  kind,
  cx,
  cy,
  size,
  color = "rgba(255,255,255,0.95)",
}: {
  kind: TefIconKind;
  cx: number;
  cy: number;
  size: number;
  color?: string;
}) {
  const scale = size / 24;
  return (
    <g
      transform={`translate(${cx}, ${cy}) scale(${scale}) translate(-12, -12)`}
      fill="none"
      stroke={color}
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      pointerEvents="none"
    >
      {ICON_PATHS[kind]}
    </g>
  );
}

const ICON_PATHS: Record<TefIconKind, ReactNode> = {
  car: (
    <>
      <path d="M4 14h16l-1.2-4.2A2 2 0 0 0 16.9 8H7.1a2 2 0 0 0-1.9 1.8L4 14Z" />
      <path d="M6.5 14v1.5M17.5 14v1.5" />
      <circle cx="7.5" cy="16.5" r="1.4" />
      <circle cx="16.5" cy="16.5" r="1.4" />
      <path d="M8 8.2 9.2 6h5.6L16 8.2" />
    </>
  ),
  bus: (
    <>
      <rect x="5" y="4.5" width="14" height="13" rx="2" />
      <path d="M5 10h14M8 17.5v1.5M16 17.5v1.5" />
      <circle cx="8.5" cy="14.5" r="1.1" />
      <circle cx="15.5" cy="14.5" r="1.1" />
      <path d="M8 7h3M13 7h3" />
    </>
  ),
  bike: (
    <>
      <circle cx="6.5" cy="15.5" r="3" />
      <circle cx="17.5" cy="15.5" r="3" />
      <path d="M6.5 15.5 10 9h4l3.5 6.5M10 9l2.5 6.5M12.5 15.5H17" />
      <path d="M14 9V7.5h2" />
    </>
  ),
  train: (
    <>
      <rect x="5.5" y="4" width="13" height="12" rx="2.5" />
      <path d="M5.5 11h13M9 7.5h2M13 7.5h2" />
      <circle cx="9" cy="13.5" r="1.1" />
      <circle cx="15" cy="13.5" r="1.1" />
      <path d="M8 16v2.5M16 16v2.5M7 18.5h10" />
    </>
  ),
  plane: (
    <>
      <path d="M12 4v13" />
      <path d="M12 8 4.5 12.5v1.5L12 11.5" />
      <path d="M12 8l7.5 4.5v1.5L12 11.5" />
      <path d="M12 15.5 8.5 19h1.8L12 17.2 13.7 19h1.8L12 15.5Z" />
    </>
  ),
  ship: (
    <>
      <path d="M4 15.5h16l-2.2 3.2a2 2 0 0 1-1.7.9H8a2 2 0 0 1-1.7-.9L4 15.5Z" />
      <path d="M8 15.5V8.5l4-3 4 3v7" />
      <path d="M12 5.5V15" />
    </>
  ),
  truck: (
    <>
      <path d="M3.5 15.5V8.5h9.5V15.5" />
      <path d="M13 11h4.2l2.3 3v1.5H13V11Z" />
      <circle cx="7" cy="16.8" r="1.5" />
      <circle cx="16.5" cy="16.8" r="1.5" />
      <path d="M3.5 15.5h16" />
    </>
  ),
  wind: (
    <>
      <path d="M12 12V20" />
      <path d="M12 12c0-3 2.2-5.5 5.2-5.5.6 0 1 .5.7 1.1C17 10 14.8 12 12 12Z" />
      <path d="M12 12c-3 0-5.5-2.2-5.5-5.2 0-.6.5-1 1.1-.7C10 7 12 9.2 12 12Z" />
      <path d="M12 12c0 3-2.2 5.5-5.2 5.5-.6 0-1-.5-.7-1.1C7 14 9.2 12 12 12Z" />
    </>
  ),
  solar: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 4.5v2.2M12 17.3v2.2M4.5 12h2.2M17.3 12h2.2M6.6 6.6l1.6 1.6M15.8 15.8l1.6 1.6M17.4 6.6l-1.6 1.6M8.2 15.8l-1.6 1.6" />
    </>
  ),
  hydro: (
    <>
      <path d="M12 4.5c0 0-5.5 6.2-5.5 9.2a5.5 5.5 0 0 0 11 0c0-3-5.5-9.2-5.5-9.2Z" />
      <path d="M9.5 14.5c.6 1.2 1.5 1.8 2.5 1.8" />
    </>
  ),
  bio: (
    <>
      <path d="M12 19.5V10" />
      <path d="M12 14c-3.2-.2-5.5-2.2-6-5 3.2.2 5.5 2.2 6 5Z" />
      <path d="M12 11.5c3.2-.4 5.2-2.6 5.5-5.5-3.2.4-5.2 2.6-5.5 5.5Z" />
      <path d="M9.5 19.5h5" />
    </>
  ),
  hydrogen: (
    <>
      <circle cx="8" cy="10" r="2.4" />
      <circle cx="16" cy="10" r="2.4" />
      <circle cx="12" cy="16.5" r="2.4" />
      <path d="M9.8 11.4 10.8 14.2M14.2 11.4l-1 2.8M10.4 10h3.2" />
    </>
  ),
  heatPump: (
    <>
      <rect x="5" y="6" width="14" height="12" rx="2" />
      <path d="M9 10.5c0-1.2.9-2 2-2s2 .8 2 2c0 1.4-2 2.2-2 3.5" />
      <path d="M11 16.2h.01" />
      <path d="M16.5 9v6M16.5 9l1.2 1.2M16.5 9l-1.2 1.2M16.5 15l1.2-1.2M16.5 15l-1.2-1.2" />
    </>
  ),
  districtEnergy: (
    <>
      <path d="M5 18V9l5-3.5L15 9v9" />
      <path d="M8 18v-5h4v5" />
      <path d="M15 11h3.5v7H15" />
      <path d="M17 13.5v2" />
    </>
  ),
  fossil: (
    <>
      <path d="M12 19c-3.2 0-5-2.1-5-4.8 0-2.4 1.7-4.2 3.3-5.7.4 1.6 1.2 2.5 1.2 2.5S12.2 8.2 13 6c1.8 1.6 4 3.6 4 6.8 0 3.1-1.8 6.2-5 6.2Z" />
    </>
  ),
  grid: (
    <>
      <path d="M13 4 7.5 13h4L11 20l5.5-10h-4L13 4Z" />
    </>
  ),
  factory: (
    <>
      <path d="M3.5 19.5V10l4 3V10l4 3V8.5h9v11" />
      <path d="M15.5 8.5V5.5h2v3" />
      <path d="M3.5 19.5h17" />
      <path d="M7 16.5h2M12 16.5h2" />
    </>
  ),
  building: (
    <>
      <path d="M5 19.5V7.5l7-3.5 7 3.5v12" />
      <path d="M10 19.5v-5h4v5" />
      <path d="M8.5 10.5h2M13.5 10.5h2M8.5 13.5h2M13.5 13.5h2" />
    </>
  ),
  cooking: (
    <>
      <path d="M5 17.5h14" />
      <path d="M7 17.5V12a5 5 0 0 1 10 0v5.5" />
      <path d="M10 8.5V6.5M14 8.5V6.5M12 8V5.5" />
    </>
  ),
  lighting: (
    <>
      <path d="M9.5 14.5h5" />
      <path d="M10 14.5V16a2 2 0 0 0 4 0v-1.5" />
      <path d="M12 4.5a5 5 0 0 1 3.5 8.5H8.5A5 5 0 0 1 12 4.5Z" />
    </>
  ),
  recycle: (
    <>
      <path d="M7.5 9.5 9 6.5h6l1.2 2" />
      <path d="M16.5 9.5 18 12.5l-2.5 4.5H13" />
      <path d="M7.8 16.5 5.5 12.5 7 9.8" />
      <path d="M9 6.5 7.5 9.5l2.2.2" />
      <path d="M18 12.5h-2.4l.6 1.4" />
      <path d="M7.8 16.5h2.4l-.4-1.3" />
    </>
  ),
  nature: (
    <>
      <path d="M12 19.5V11" />
      <path d="M12 12c-3.5-.3-5.8-2.6-6-5.5 3.5.3 5.8 2.6 6 5.5Z" />
      <path d="M12 10.5c3.5-.5 5.5-2.8 5.8-5.5-3.5.5-5.5 2.8-5.8 5.5Z" />
      <path d="M9 19.5h6" />
    </>
  ),
  water: (
    <>
      <path d="M4.5 13c1.8-1 3.6-1.5 5.5-.6 2.2 1 3.8.9 5.5-.2 1.4-.9 2.8-1 4 .1" />
      <path d="M4.5 16.5c1.8-1 3.6-1.5 5.5-.6 2.2 1 3.8.9 5.5-.2 1.4-.9 2.8-1 4 .1" />
      <path d="M12 4.5c0 0-3.2 3.6-3.2 5.4a3.2 3.2 0 0 0 6.4 0c0-1.8-3.2-5.4-3.2-5.4Z" />
    </>
  ),
  food: (
    <>
      <path d="M8 5.5v6.5a2.5 2.5 0 0 0 5 0V5.5" />
      <path d="M8 8.5h5" />
      <path d="M16.5 5.5v13" />
      <path d="M15 5.5h3" />
    </>
  ),
  renewable: (
    <>
      <path d="M16.5 8.5A5.5 5.5 0 1 0 18 13" />
      <path d="M16.5 5.5v3h3" />
      <circle cx="12" cy="13" r="2" />
    </>
  ),
  planning: (
    <>
      <circle cx="7" cy="8" r="2" />
      <circle cx="17" cy="8" r="2" />
      <circle cx="12" cy="16.5" r="2" />
      <path d="M8.8 9.2 10.5 14.5M15.2 9.2 13.5 14.5M9 8h6" />
    </>
  ),
  resource: (
    <>
      <rect x="4.5" y="6" width="6.5" height="5" rx="1" />
      <rect x="13" y="6" width="6.5" height="5" rx="1" />
      <rect x="8.75" y="13.5" width="6.5" height="5" rx="1" />
      <path d="M11 11v2.5M7.8 11 10 13.5M16.2 11 14 13.5" />
    </>
  ),
  generic: (
    <>
      <path d="M12 4.5 18.5 8v8L12 19.5 5.5 16V8L12 4.5Z" />
      <circle cx="12" cy="12" r="2" />
    </>
  ),
};
