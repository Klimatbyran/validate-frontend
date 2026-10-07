import { isAIGenerated } from "@/tabs/editor/lib/verification";
import { DATA_POINTS, type ReportingPeriod } from "@/tabs/errors/types";
import type { DataPointMetadata, SuspicionOrigin } from "../types";

type Emissions = ReportingPeriod["emissions"];

/**
 * The prod list types metadata as `{ verifiedBy }` only, but the API also
 * returns `user`, which the Editor's AI-vs-human rule reads.
 */
function readMetadata(node: unknown): DataPointMetadata | null {
  if (node === null || typeof node !== "object") return null;
  const metadata = (node as { metadata?: unknown }).metadata;
  if (metadata === null || typeof metadata !== "object") return null;
  return metadata as DataPointMetadata;
}

/** Metadata for a data point id. Mirrors `getDataPointValue`'s dispatch. */
export function getDataPointMetadata(
  emissions: Emissions | null | undefined,
  dataPointId: string,
): DataPointMetadata | null {
  if (!emissions) return null;

  if (dataPointId === "scope1-total") return readMetadata(emissions.scope1);
  if (
    dataPointId === "scope2-mb" ||
    dataPointId === "scope2-lb" ||
    dataPointId === "scope2-unknown"
  ) {
    return readMetadata(emissions.scope2);
  }
  if (dataPointId === "stated-total") {
    return readMetadata(emissions.statedTotalEmissions);
  }
  // calculated totals are derived server-side and carry no metadata
  if (dataPointId === "calculated-total") return null;

  const scope3 = emissions.scope3;
  if (!scope3) return null;

  if (dataPointId === "scope3-stated-total") {
    return readMetadata(scope3.statedTotalEmissions);
  }
  if (dataPointId === "scope3-calculated-total") return readMetadata(scope3);

  const dataPoint = DATA_POINTS.find((dp) => dp.id === dataPointId);
  if (dataPoint?.category && Array.isArray(scope3.categories)) {
    const category = scope3.categories.find(
      (c) => c.category === dataPoint.category,
    );
    return readMetadata(category);
  }

  return null;
}

/**
 * Whether a value was manually validated or left as Garbo produced it.
 *
 * Uses the Editor's `isAIGenerated` so both tabs agree on what "verified"
 * means: a non-empty `verifiedBy` that is not Garbo itself.
 */
export function resolveOrigin(
  metadata: DataPointMetadata | null,
): SuspicionOrigin {
  if (!metadata) return "ai";
  return isAIGenerated(metadata) ? "ai" : "verified";
}

export function resolveVerifierName(
  metadata: DataPointMetadata | null,
): string | null {
  const name = metadata?.verifiedBy?.name?.trim();
  return name ? name : null;
}
