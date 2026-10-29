import {
  getClimatePlansPipelineApiUrl,
  getUnearthApiBaseUrl,
} from "@/config/api-env";
import { fetchPipelineMeasures } from "./pipeline-measures";
import type { Measure, MunicipalityMeasures } from "./measures-types";
import type {
  ExploreDataSource,
  ExploreDataset,
  ExploreMunicipalityRecord,
  PipelineCommitment,
  SectorYearEmissions,
} from "./explore-types";
import {
  collectTefHits,
  countAdaptationCommitments,
  countClimateCommitmentGroups,
  countClimateRelevantCommitments,
  countOwnCommitments,
} from "./explore-aggregates";
import {
  foldPlaceName,
  lookupByFoldedName,
  namesMatch,
} from "./municipality-names";

interface MunicipalitySourceRow {
  municipality: string;
  county: string;
  url: string | null;
  adoptedYear: number | null;
  planName: string | null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function emptyRecord(id: string, name: string): ExploreMunicipalityRecord {
  return {
    id,
    name,
    regionName: null,
    measures: [],
    commitmentCount: 0,
    commitmentSource: "measures-as-proxy",
    climateRelevantCommitmentCount: null,
    climateCommitmentGroupCount: null,
    adaptationCommitmentCount: null,
    ownCommitmentCount: null,
    companionReferenceCount: null,
    planApproved: null,
    markdownChars: null,
    tefHits: [],
    documentTitle: null,
    adoptedYear: null,
    sourceUrl: null,
    county: null,
    dataSources: [],
  };
}

function upsert(
  byKey: Map<string, ExploreMunicipalityRecord>,
  name: string,
  idHint: string,
): ExploreMunicipalityRecord {
  const existing = lookupByFoldedName(
    [...byKey.values()],
    (row) => row.name,
    name,
  );
  if (existing) return existing;
  const record = emptyRecord(idHint, name);
  byKey.set(foldPlaceName(name) || idHint, record);
  return record;
}

function addSource(
  record: ExploreMunicipalityRecord,
  source: ExploreDataSource,
) {
  if (!record.dataSources.includes(source)) record.dataSources.push(source);
}

interface PipelinePlanListItem {
  id: string;
  status?: "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | string;
  extractedMunicipalityName: string | null;
  municipality: { id: string; name: string } | null;
  markdown?: string | null;
  companionReferenceCount?: number;
  documentReferences?: Array<{
    id: string;
    groupId?: string | null;
    relationship: string;
  }>;
  commitments?: Array<{
    text: string;
    climateRelevant: boolean | null;
    actionable?: boolean | null;
    similarGroupId?: string | null;
    adaptation?: boolean | null;
    originatesFrom?: string[] | null;
  }>;
}

function companionRefCount(extra: PipelinePlanListItem): number {
  if (typeof extra.companionReferenceCount === "number") {
    return extra.companionReferenceCount;
  }
  const refs = extra.documentReferences ?? [];
  const companions = refs.filter((r) => r.relationship === "companion");
  return new Set(companions.map((r) => r.groupId ?? r.id)).size;
}

async function loadPipelineExtras(): Promise<PipelinePlanListItem[]> {
  const base = getClimatePlansPipelineApiUrl();
  try {
    const res = await fetch(`${base}/plans`);
    if (!res.ok) return [];
    const plans = (await res.json()) as PipelinePlanListItem[];
    const details = await Promise.all(
      plans.map(async (plan) => {
        const detailRes = await fetch(`${base}/plans/${plan.id}`);
        if (!detailRes.ok) return null;
        return (await detailRes.json()) as PipelinePlanListItem;
      }),
    );
    return details.filter((d): d is PipelinePlanListItem => d != null);
  } catch {
    return [];
  }
}

async function loadMunicipalitySources(): Promise<MunicipalitySourceRow[]> {
  try {
    const res = await fetch(
      `${getClimatePlansPipelineApiUrl()}/municipality-sources`,
    );
    if (!res.ok) return [];
    return (await res.json()) as MunicipalitySourceRow[];
  } catch {
    return [];
  }
}

function parseSectorEmissionsPayload(
  raw: unknown,
  name: string,
): SectorYearEmissions | null {
  const root = asRecord(raw);
  const sectors = asRecord(root?.sectors) ?? asRecord(raw);
  if (!sectors) return null;
  const byYear: Record<string, Record<string, number>> = {};
  const keys = Object.keys(sectors);
  const yearLike =
    keys.filter((k) => /^\d{4}$/.test(k)).length >= keys.length / 2;

  if (yearLike) {
    for (const [year, inner] of Object.entries(sectors)) {
      const innerRec = asRecord(inner);
      if (!innerRec) continue;
      byYear[year] = {};
      for (const [sector, value] of Object.entries(innerRec)) {
        if (typeof value === "number") byYear[year][sector] = value;
      }
    }
  } else {
    for (const [sector, inner] of Object.entries(sectors)) {
      const innerRec = asRecord(inner);
      if (!innerRec) continue;
      for (const [year, value] of Object.entries(innerRec)) {
        if (typeof value !== "number") continue;
        byYear[year] ??= {};
        byYear[year][sector] = value;
      }
    }
  }

  if (Object.keys(byYear).length === 0) return null;
  return { municipalityName: name, byYear };
}

async function loadSectorEmissions(
  names: string[],
): Promise<{ rows: SectorYearEmissions[]; error: string | null }> {
  const unique = [...new Set(names.filter(Boolean))];
  if (unique.length === 0) return { rows: [], error: null };
  const base = getUnearthApiBaseUrl();
  const rows: SectorYearEmissions[] = [];
  let error: string | null = null;
  await Promise.all(
    unique.map(async (name) => {
      try {
        const res = await fetch(
          `${base}/municipalities/${encodeURIComponent(name)}/sector-emissions`,
        );
        if (!res.ok) {
          if (res.status !== 404)
            error = `${res.status} loading sector emissions`;
          return;
        }
        const parsed = parseSectorEmissionsPayload(await res.json(), name);
        if (parsed) rows.push(parsed);
      } catch (err) {
        error =
          err instanceof Error ? err.message : "Sector emissions unreachable";
      }
    }),
  );
  return { rows, error };
}

function applyMeasures(
  record: ExploreMunicipalityRecord,
  measures: Measure[],
  source: ExploreDataSource,
) {
  if (measures.length === 0) return;
  record.measures = measures;
  record.tefHits = collectTefHits(measures);
  if (record.commitmentCount === 0) {
    record.commitmentCount = new Set(measures.map((m) => m.measure_text)).size;
    record.commitmentSource = "measures-as-proxy";
  }
  addSource(record, source);
}

export async function loadExploreDataset(): Promise<ExploreDataset> {
  const [pipelineMeasures, pipelineExtras, sources] = await Promise.all([
    fetchPipelineMeasures(),
    loadPipelineExtras(),
    loadMunicipalitySources(),
  ]);

  const byKey = new Map<string, ExploreMunicipalityRecord>();
  const measuresOnly: MunicipalityMeasures[] = [...pipelineMeasures];

  for (const row of pipelineMeasures) {
    const record = upsert(byKey, row.name, row.id);
    applyMeasures(record, row.measures, "pipeline-measures");
  }

  for (const extra of pipelineExtras) {
    const name = extra.municipality?.name ?? extra.extractedMunicipalityName;
    if (!name) continue;
    const record = upsert(byKey, name, extra.id);
    if (typeof extra.markdown === "string" && extra.markdown.length > 0) {
      record.markdownChars = extra.markdown.length;
      addSource(record, "pipeline-markdown");
    }
    if (extra.status != null) {
      record.planApproved = extra.status === "APPROVED";
    }
    record.companionReferenceCount = companionRefCount(extra);
    if (Array.isArray(extra.commitments) && extra.commitments.length > 0) {
      const unique = new Set(extra.commitments.map((c) => c.text));
      const pipelineCommitments: PipelineCommitment[] = extra.commitments.map(
        (c) => ({
          text: c.text,
          climateRelevant: c.climateRelevant,
          actionable: c.actionable ?? null,
          similarGroupId: c.similarGroupId ?? null,
          adaptation: c.adaptation ?? null,
          originatesFrom: Array.isArray(c.originatesFrom)
            ? c.originatesFrom
            : [],
        }),
      );
      record.commitmentCount = unique.size;
      record.commitmentSource = "pipeline-commitments";
      record.climateRelevantCommitmentCount =
        countClimateRelevantCommitments(pipelineCommitments);
      record.climateCommitmentGroupCount =
        countClimateCommitmentGroups(pipelineCommitments);
      record.adaptationCommitmentCount =
        countAdaptationCommitments(pipelineCommitments);
      record.ownCommitmentCount = countOwnCommitments(pipelineCommitments);
      addSource(record, "pipeline-commitments");
    }
  }

  for (const source of sources) {
    const record = lookupByFoldedName(
      [...byKey.values()],
      (row) => row.name,
      source.municipality,
    );
    if (!record) continue;
    record.county = source.county;
    record.regionName = source.county.replace(/\s+län$/i, "");
    record.sourceUrl = source.url;
    if (source.adoptedYear != null) record.adoptedYear = source.adoptedYear;
    if (source.planName && !record.documentTitle)
      record.documentTitle = source.planName;
    addSource(record, "municipality-sources");
  }

  const municipalities = [...byKey.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "sv"),
  );
  const namesForEmissions = municipalities
    .filter(
      (m) =>
        m.measures.length > 0 ||
        m.commitmentCount > 0 ||
        m.tefHits.length > 0,
    )
    .map((m) => m.name);
  const { rows: sectorEmissions, error: sectorEmissionsError } =
    await loadSectorEmissions(namesForEmissions);
  if (sectorEmissions.length > 0) {
    for (const record of municipalities) {
      if (
        sectorEmissions.some((row) =>
          namesMatch(row.municipalityName, record.name),
        )
      ) {
        addSource(record, "unearth-sector-emissions");
      }
    }
  }

  return {
    municipalities,
    measuresOnly,
    sectorEmissions,
    sectorEmissionsError,
  };
}
