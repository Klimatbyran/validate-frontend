import { isAIGenerated } from "@/tabs/editor/lib/verification";
import { DATA_POINTS, type ReportingPeriod } from "@/tabs/errors/types";
import type { DataPointMetadata, SuspicionOrigin } from "../types";

type Emissions = ReportingPeriod["emissions"];

export const DEFAULT_EMISSION_UNIT = "tCO2e";

/**
 * The prod list types metadata as `{ verifiedBy }` only, but the API also
 * returns `user` / source fields, which the Editor reads.
 */
function readMetadata(node: unknown): DataPointMetadata | null {
  if (node === null || typeof node !== "object") return null;
  const metadata = (node as { metadata?: unknown }).metadata;
  if (metadata === null || typeof metadata !== "object") return null;
  return metadata as DataPointMetadata;
}

function readUnit(node: unknown): string | null {
  if (node === null || typeof node !== "object") return null;
  const unit = (node as { unit?: unknown }).unit;
  return typeof unit === "string" && unit.trim() ? unit.trim() : null;
}

function emissionNodeForDataPoint(
  emissions: Emissions,
  dataPointId: string,
): unknown {
  if (dataPointId === "scope1-total") return emissions.scope1;
  if (
    dataPointId === "scope2-mb" ||
    dataPointId === "scope2-lb" ||
    dataPointId === "scope2-unknown"
  ) {
    return emissions.scope2;
  }
  if (dataPointId === "stated-total") return emissions.statedTotalEmissions;
  if (dataPointId === "calculated-total") return null;

  const scope3 = emissions.scope3;
  if (!scope3) return null;

  if (dataPointId === "scope3-stated-total") return scope3.statedTotalEmissions;
  if (dataPointId === "scope3-calculated-total") return scope3;

  const dataPoint = DATA_POINTS.find((dp) => dp.id === dataPointId);
  if (dataPoint?.category && Array.isArray(scope3.categories)) {
    return scope3.categories.find((c) => c.category === dataPoint.category);
  }

  return null;
}

/** Metadata for a data point id. Mirrors `getDataPointValue`'s dispatch. */
export function getDataPointMetadata(
  emissions: Emissions | null | undefined,
  dataPointId: string,
): DataPointMetadata | null {
  if (!emissions) return null;
  return readMetadata(emissionNodeForDataPoint(emissions, dataPointId));
}

export function getDataPointUnit(
  emissions: Emissions | null | undefined,
  dataPointId: string,
): string {
  if (!emissions) return DEFAULT_EMISSION_UNIT;
  return (
    readUnit(emissionNodeForDataPoint(emissions, dataPointId)) ??
    DEFAULT_EMISSION_UNIT
  );
}

/**
 * Whether a value was manually validated or left as Garbo produced it.
 *
 * Uses the Editor's `isAIGenerated` so both tabs agree on what "verified"
 * means — including the null-metadata case (`isAIGenerated(null)` is false,
 * treated as verified rather than AI-generated).
 */
export function resolveOrigin(
  metadata: DataPointMetadata | null,
): SuspicionOrigin {
  return isAIGenerated(metadata) ? "ai" : "verified";
}

export function resolveVerifierName(
  metadata: DataPointMetadata | null,
): string | null {
  const name = metadata?.verifiedBy?.name?.trim();
  return name ? name : null;
}

export function trimMetaField(
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
