import {
  getClimatePlansPipelineApiUrl,
  getUnearthApiBaseUrl,
} from "@/config/api-env";
import { fetchPipelineMeasures } from "./pipeline-measures";
import { loadStaticMeasures } from "./static-measures";
import type { Measure, MunicipalityMeasures } from "./measures-types";
import type {
  ExploreDataSource,
  ExploreDataset,
  ExploreMunicipalityRecord,
  QuantifiedGoal,
  SectorYearEmissions,
} from "./explore-types";
import { collectTefHits, parsePercent, parseYear } from "./explore-aggregates";
import {
  foldPlaceName,
  lookupByFoldedName,
  namesMatch,
} from "./municipality-names";

interface StaticPlanIndexEntry {
  id: string;
  name: string;
  folder: string;
  files: { plan_scope?: string; emission_targets?: string };
}

interface MunicipalitySourceRow {
  municipality: string;
  county: string;
  url: string | null;
  adoptedYear: number | null;
  planName: string | null;
}

function firstNamedPayload(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith("_")) continue;
    if (value && typeof value === "object")
      return value as Record<string, unknown>;
  }
  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function parseGoals(payload: Record<string, unknown> | null): QuantifiedGoal[] {
  const list = payload?.own_commitments;
  if (!Array.isArray(list)) return [];
  return list.map((item) => {
    const row = asRecord(item) ?? {};
    return {
      description: asString(row.goal_description) ?? "",
      reductionPercent: parsePercent(
        row.reduction_percentage as string | number | null,
      ),
      baselineYear: parseYear(row.baseline_year as string | number | null),
      targetYear: parseYear(row.target_year as string | number | null),
      scope: asString(row.scope) ?? "",
      sector: asString(row.sector) ?? "",
      commitmentStrength: asString(row.commitment_strength) ?? "",
      goalType: asString(row.goal_type) ?? "",
      sourceQuote: asString(row.source_quote) ?? "",
    };
  });
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
    markdownChars: null,
    tefHits: [],
    goals: [],
    hasQuantifiedTargets: null,
    parisMentioned: null,
    onePointFiveMentioned: null,
    carbonBudgetReferenced: null,
    documentTitle: null,
    documentType: null,
    adoptionDate: null,
    planPeriodStart: null,
    planPeriodEnd: null,
    primaryFocus: null,
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

async function loadJson(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const text = await res.text();
    if (!text.trim()) return null;
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

async function loadStaticPlanFiles(): Promise<{
  targets: { name: string; payload: Record<string, unknown> }[];
  scopes: { name: string; payload: Record<string, unknown> }[];
}> {
  const index = (await loadJson("/climate-plans/index.json")) as {
    municipalities?: StaticPlanIndexEntry[];
  } | null;
  const entries = index?.municipalities ?? [];
  const targets: { name: string; payload: Record<string, unknown> }[] = [];
  const scopes: { name: string; payload: Record<string, unknown> }[] = [];

  for (const entry of entries) {
    if (entry.files.emission_targets) {
      const raw = await loadJson(
        `/climate-plans/${entry.folder}/${entry.files.emission_targets}`,
      );
      const payload = firstNamedPayload(raw);
      if (payload) targets.push({ name: entry.name, payload });
    }
    if (entry.files.plan_scope) {
      const raw = await loadJson(
        `/climate-plans/${entry.folder}/${entry.files.plan_scope}`,
      );
      const payload = firstNamedPayload(raw);
      if (payload) scopes.push({ name: entry.name, payload });
    }
  }
  return { targets, scopes };
}

interface PipelinePlanListItem {
  id: string;
  extractedMunicipalityName: string | null;
  municipality: { id: string; name: string } | null;
  markdown?: string | null;
  commitments?: Array<{
    text: string;
    climateRelevant: boolean | null;
  }>;
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
  const [staticMeasures, pipelineMeasures, planFiles, pipelineExtras, sources] =
    await Promise.all([
      loadStaticMeasures(),
      fetchPipelineMeasures(),
      loadStaticPlanFiles(),
      loadPipelineExtras(),
      loadMunicipalitySources(),
    ]);

  const byKey = new Map<string, ExploreMunicipalityRecord>();
  const measuresOnly: MunicipalityMeasures[] = [
    ...staticMeasures,
    ...pipelineMeasures,
  ];

  for (const row of staticMeasures) {
    const record = upsert(byKey, row.name, row.id);
    record.id = row.id;
    record.name = row.name;
    applyMeasures(record, row.measures, "static-measures");
  }

  for (const row of pipelineMeasures) {
    const record = upsert(byKey, row.name, row.id);
    if (record.measures.length === 0) {
      applyMeasures(record, row.measures, "pipeline-measures");
    } else {
      addSource(record, "pipeline-measures");
    }
  }

  for (const extra of pipelineExtras) {
    const name = extra.municipality?.name ?? extra.extractedMunicipalityName;
    if (!name) continue;
    const record = upsert(byKey, name, extra.id);
    if (typeof extra.markdown === "string" && extra.markdown.length > 0) {
      record.markdownChars = extra.markdown.length;
      addSource(record, "pipeline-markdown");
    }
    if (Array.isArray(extra.commitments) && extra.commitments.length > 0) {
      const unique = new Set(extra.commitments.map((c) => c.text));
      record.commitmentCount = unique.size;
      record.commitmentSource = "pipeline-commitments";
      record.climateRelevantCommitmentCount = extra.commitments.filter(
        (c) => c.climateRelevant !== false,
      ).length;
      addSource(record, "pipeline-commitments");
    }
  }

  for (const { name, payload } of planFiles.targets) {
    const record = upsert(byKey, name, foldPlaceName(name));
    record.goals = parseGoals(payload);
    const summary = asRecord(payload.summary);
    const alignment = asRecord(payload.framework_alignment);
    record.hasQuantifiedTargets = asBoolean(summary?.has_quantified_targets);
    record.parisMentioned = asBoolean(alignment?.paris_agreement_mentioned);
    record.onePointFiveMentioned = asBoolean(
      alignment?.one_point_five_mentioned,
    );
    record.carbonBudgetReferenced = asBoolean(
      alignment?.carbon_budget_referenced,
    );
    addSource(record, "static-emission-targets");
  }

  for (const { name, payload } of planFiles.scopes) {
    const record = upsert(byKey, name, foldPlaceName(name));
    const summary = asRecord(payload.summary);
    const temporal = asRecord(payload.temporal_scope);
    const domain = asRecord(payload.policy_domain);
    record.documentTitle = asString(summary?.document_title);
    record.documentType = asString(summary?.document_type);
    record.adoptionDate = asString(summary?.adoption_date);
    record.planPeriodStart = asString(temporal?.plan_period_start);
    record.planPeriodEnd = asString(temporal?.plan_period_end);
    record.primaryFocus = asString(domain?.primary_focus);
    if (record.adoptedYear == null) {
      record.adoptedYear = parseYear(record.adoptionDate);
    }
    addSource(record, "static-plan-scope");
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
        m.goals.length > 0 ||
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
