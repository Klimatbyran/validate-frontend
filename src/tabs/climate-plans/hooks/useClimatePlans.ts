import { useEffect, useMemo, useState } from "react";
import type {
  MunicipalityClimatePlan,
  PlanScopeData,
  EmissionTargetsData,
  Measure,
  MeasureType,
} from "../lib/types";

type FileKind = "plan_scope" | "emission_targets" | "plan_measures";

type ParsedPath = {
  folder: string;
  kind: FileKind;
  version: number;
};

function parseClimatePlanFilePath(path: string): ParsedPath | null {
  // Expect: /Users/.../public/climate-plans/<folder>/<kind>_<folder>_v<version>.json
  const normalized = path.replaceAll("\\", "/");
  const m =
    normalized.match(/\/public\/climate-plans\/([^/]+)\/(plan_scope|emission_targets|plan_measures)_[^/]+_v(\d+)\.json$/);
  if (!m) return null;
  return {
    folder: m[1],
    kind: m[2] as FileKind,
    version: Number(m[3]) || 0,
  };
}

function extractTopLevelMunicipalityKey(obj: unknown): string | null {
  if (!obj || typeof obj !== "object") return null;
  const keys = Object.keys(obj as Record<string, unknown>);
  return keys.find((k) => k !== "_version") ?? null;
}

function normalizeMeasureType(raw: unknown): MeasureType {
  // New v4 files use "objective" | "intervention" (and may evolve).
  const s = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (s === "objective" || s === "outcome") return "outcome";
  if (s === "activity_shift" || s === "activity shift") return "activity_shift";
  if (s === "intervention") return "intervention";
  return "uncategorized";
}

function normalizeMeasures(rawMeasures: unknown): Measure[] {
  if (!Array.isArray(rawMeasures)) return [];
  return rawMeasures
    .map((m) => {
      const r = (m ?? {}) as Record<string, unknown>;
      const measure_text = typeof r.measure_text === "string" ? r.measure_text : "";
      if (!measure_text) return null;
      const normalized: Measure = {
        measure_text,
        measure_text_english:
          typeof r.measure_text_english === "string" ? r.measure_text_english : undefined,
        measure_type_reasoning:
          typeof r.measure_type_reasoning === "string" ? r.measure_type_reasoning : undefined,
        measure_type: normalizeMeasureType(r.measure_type),
        climate_relevance:
          typeof r.climate_relevance === "string" ? r.climate_relevance : undefined,
        sector: typeof r.sector === "string" ? r.sector : undefined,
        instrument_type:
          typeof r.instrument_type === "string" ? r.instrument_type : undefined,
        has_attached_target:
          typeof r.has_attached_target === "boolean" ? r.has_attached_target : undefined,
        // v4 uses `activity_shift_indicated`/`activity_shift_explicit`; older uses `activity_shift_type`
        activity_shift_type:
          typeof r.activity_shift_type === "string"
            ? r.activity_shift_type
            : typeof r.activity_shift_indicated === "string"
              ? r.activity_shift_indicated
              : undefined,
        intervention_type:
          typeof r.intervention_type === "string" ? r.intervention_type : undefined,
        classification_note:
          typeof r.classification_note === "string" ? r.classification_note : undefined,
      };
      return normalized;
    })
    .filter((x): x is Measure => Boolean(x));
}

export function useClimatePlans() {
  const [municipalities, setMunicipalities] = useState<MunicipalityClimatePlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const allFiles = useMemo(() => {
    // Build-time discovery of ALL JSON files under public/climate-plans/**.
    // This removes the need to keep `index.json` updated manually.
    return import.meta.glob("../../../../public/climate-plans/**/*.json", {
      eager: true,
      query: "?raw",
      import: "default",
    }) as Record<string, string>;
  }, []);

  useEffect(() => {
    try {
      const grouped = new Map<
        string,
        Partial<Record<FileKind, { version: number; raw: unknown; key: string | null; obj: Record<string, unknown> | null }>>
      >();

      for (const [path, rawText] of Object.entries(allFiles)) {
        const info = parseClimatePlanFilePath(path);
        if (!info) continue;
        const parsed = JSON.parse(rawText) as unknown;
        const obj = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
        const key = extractTopLevelMunicipalityKey(obj);

        const byFolder = grouped.get(info.folder) ?? {};
        const existing = byFolder[info.kind];
        if (!existing || info.version > existing.version) {
          byFolder[info.kind] = { version: info.version, raw: parsed, key, obj };
          grouped.set(info.folder, byFolder);
        }
      }

      const plans: MunicipalityClimatePlan[] = [];

      for (const [folder, files] of grouped.entries()) {
        const planScopeKey = files.plan_scope?.key ?? null;
        const emissionTargetsKey = files.emission_targets?.key ?? null;
        const measuresKey = files.plan_measures?.key ?? null;

        const planScope =
          planScopeKey && files.plan_scope?.obj
            ? (files.plan_scope.obj[planScopeKey] as PlanScopeData)
            : null;
        const emissionTargets =
          emissionTargetsKey && files.emission_targets?.obj
            ? (files.emission_targets.obj[emissionTargetsKey] as EmissionTargetsData)
            : null;

        let measures: Measure[] | undefined;
        if (measuresKey && files.plan_measures?.obj) {
          const payload = files.plan_measures.obj[measuresKey] as unknown;
          const measuresArr =
            payload && typeof payload === "object"
              ? (payload as Record<string, unknown>).measures
              : undefined;
          const normalized = normalizeMeasures(measuresArr);
          if (normalized.length > 0) measures = normalized;
        }

        const displayName = planScopeKey || emissionTargetsKey || measuresKey || folder;

        // Merge measures into emissionTargets when present, while also exposing `municipality.measures`.
        const mergedEmissionTargets =
          emissionTargets && measures && (!emissionTargets.measures || emissionTargets.measures.length === 0)
            ? { ...emissionTargets, measures }
            : emissionTargets;

        plans.push({
          id: folder,
          name: displayName,
          planScope,
          emissionTargets: mergedEmissionTargets,
          measures,
        });
      }

      plans.sort((a, b) => a.name.localeCompare(b.name));
      setMunicipalities(plans);
      setIsLoading(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setIsLoading(false);
    }
  }, [allFiles]);

  return { municipalities, isLoading, error };
}
