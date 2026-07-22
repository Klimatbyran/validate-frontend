/**
 * Errors tab: save a reviewer's error reason for a specific stage datapoint.
 * The pipeline list endpoint strips all datapoint ids (Unearth's Minimal* schemas),
 * so we resolve the real Scope1/Scope2/etc id via the staff detail route on demand,
 * then POST a DatapointNote to Unearth's staff API (stage host only - this tab is
 * about staging accuracy, not prod corrections).
 */
import { garboAuthFetch, throwIfAuthError } from "@/lib/garbo-auth-fetch";
import type { ErrorBrowserStageSource } from "@/config/api-env";
import { getStageUnearthUrl } from "@/config/api-env";
import { CompanyRow } from "../types";

/**
 * Same "stage" vs "local" switch as the Errors tab's list reads
 * (see `getErrorBrowserStagePipelineCompaniesListUrl`) - when developing against a
 * locally running Unearth API, both the id lookup and the note write need to go
 * there too, since a token issued by your local login won't validate against the
 * real stage host's database.
 */
function errorBrowserStageUnearthUrl(
  path: string,
  source: ErrorBrowserStageSource,
): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (source === "local" && import.meta.env.DEV) {
    return `/unearth-local${p}`;
  }
  return getStageUnearthUrl(path);
}

export type DatapointNoteType =
  | "scope1"
  | "scope2"
  | "scope3"
  | "category"
  | "scope1And2"
  | "statedTotalEmissions"
  | "biogenicEmissions"
  | "turnover"
  | "employees";

export interface DatapointNoteTarget {
  datapointType: DatapointNoteType;
  category?: number;
}

/**
 * Maps an Errors-tab `selectedDataPoint` id to the backend's datapointType.
 * Returns null for data points with no underlying id to attach a note to
 * (scope3/overall calculated totals are plain computed numbers, no FK target).
 */
export function mapDataPointToNoteTarget(
  selectedDataPoint: string,
): DatapointNoteTarget | null {
  if (selectedDataPoint === "scope1-total") {
    return { datapointType: "scope1" };
  }
  if (
    selectedDataPoint === "scope2-mb" ||
    selectedDataPoint === "scope2-lb" ||
    selectedDataPoint === "scope2-unknown"
  ) {
    return { datapointType: "scope2" };
  }
  if (
    selectedDataPoint === "scope3-stated-total" ||
    selectedDataPoint === "stated-total"
  ) {
    return { datapointType: "statedTotalEmissions" };
  }
  const categoryMatch = /^cat-(\d+)$/.exec(selectedDataPoint);
  if (categoryMatch) {
    return { datapointType: "category", category: Number(categoryMatch[1]) };
  }
  return null;
}

export interface ExistingDatapointNote {
  comment: string | null;
  errorReason: string | null;
  status?: DatapointErrorStatus | null;
}

interface StageDatapointPayload {
  id: string;
  note?: ExistingDatapointNote | null;
}

interface StageReportingPeriod {
  id: string;
  year?: string;
  companyReportId?: string;
  emissions?: {
    scope1?: StageDatapointPayload | null;
    scope2?: StageDatapointPayload | null;
    scope1And2?: StageDatapointPayload | null;
    statedTotalEmissions?: StageDatapointPayload | null;
    biogenicEmissions?: StageDatapointPayload | null;
    scope3?: {
      id: string;
      statedTotalEmissions?: StageDatapointPayload | null;
      categories?: (StageDatapointPayload & { category: number })[];
    } | null;
  } | null;
}

interface StageCompanyDetails {
  reportingPeriods?: StageReportingPeriod[];
}

export interface ResolvedStageDatapoint {
  datapointId: string;
  note: ExistingDatapointNote | null;
}

/**
 * Finds the real stage-side datapoint (id + any existing reviewer note) for a row +
 * target. Requires a wikidataId (unpaired/report-identity-only rows can't be resolved
 * this way) and a matching reporting period on the stage company detail payload.
 */
export async function resolveStageDatapoint(
  row: Pick<CompanyRow, "wikidataId" | "companyReportId" | "reportYear">,
  target: DatapointNoteTarget,
  source: ErrorBrowserStageSource = "stage",
): Promise<ResolvedStageDatapoint | null> {
  if (!row.wikidataId) return null;

  const res = await garboAuthFetch(
    errorBrowserStageUnearthUrl(
      `/api/pipeline/companies/${row.wikidataId}`,
      source,
    ),
    { headers: { Accept: "application/json" } },
  );
  throwIfAuthError(res.status);
  if (!res.ok) return null;

  const company: StageCompanyDetails = await res.json();
  const period = (company.reportingPeriods ?? []).find(
    (p) =>
      p.companyReportId === row.companyReportId &&
      p.year === String(row.reportYear ?? ""),
  );
  const emissions = period?.emissions;
  if (!emissions) return null;

  const datapoint: StageDatapointPayload | null | undefined = (() => {
    switch (target.datapointType) {
      case "scope1":
        return emissions.scope1;
      case "scope2":
        return emissions.scope2;
      case "scope1And2":
        return emissions.scope1And2;
      case "biogenicEmissions":
        return emissions.biogenicEmissions;
      case "statedTotalEmissions":
        return (
          emissions.statedTotalEmissions ??
          emissions.scope3?.statedTotalEmissions
        );
      case "category":
        return emissions.scope3?.categories?.find(
          (c) => c.category === target.category,
        );
      default:
        return null;
    }
  })();

  if (!datapoint) return null;
  return { datapointId: datapoint.id, note: datapoint.note ?? null };
}

/** Matches Prisma's DatapointErrorStatus enum. */
export type DatapointErrorStatus = "OPEN" | "RESOLVED" | "WONT_FIX";

export interface SaveDatapointNoteInput {
  datapointType: DatapointNoteType;
  datapointId: string;
  errorReason?: string;
  comment?: string;
  status?: DatapointErrorStatus;
  /** Only meaningful when status is RESOLVED - what the value changed from/to. */
  previousValue?: number | null;
  newValue?: number | null;
}

/** Saves a reviewer's error reason for a stage datapoint. */
export async function saveDatapointNote(
  input: SaveDatapointNoteInput,
  source: ErrorBrowserStageSource = "stage",
): Promise<void> {
  const res = await garboAuthFetch(
    errorBrowserStageUnearthUrl("/api/datapoint-notes", source),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(input),
    },
  );
  throwIfAuthError(res.status);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to save datapoint note: ${res.status} ${text}`);
  }
}
