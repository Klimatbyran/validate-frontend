import { useState, useEffect } from "react";
import type {
  ClimatePlanIndex,
  MunicipalityClimatePlan,
  PlanScopeData,
  EmissionTargetsData,
} from "../lib/types";

export function useClimatePlans() {
  const [municipalities, setMunicipalities] = useState<MunicipalityClimatePlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const indexRes = await fetch("/climate-plans/index.json");
        if (!indexRes.ok) {
          throw new Error("Climate plans index not found. Add public/climate-plans/ with municipality subfolders and JSON data.");
        }
        const text = await indexRes.text();
        if (!text.trim().startsWith("{")) {
          throw new Error("Climate plans index not found. Add public/climate-plans/ with municipality subfolders and JSON data.");
        }
        const index: ClimatePlanIndex = JSON.parse(text);

        const plans: MunicipalityClimatePlan[] = [];

        for (const entry of index.municipalities) {
          const base = `/climate-plans/${entry.folder}`;

          const fetches = await Promise.all([
            entry.files.plan_scope ? fetch(`${base}/${entry.files.plan_scope}`) : null,
            entry.files.emission_targets ? fetch(`${base}/${entry.files.emission_targets}`) : null,
          ]);

          const [planScopeRes, emissionTargetsRes] = fetches;

          if ((!planScopeRes || !planScopeRes.ok) && (!emissionTargetsRes || !emissionTargetsRes.ok)) {
            console.warn(`Failed to load data for ${entry.id}, skipping`);
            continue;
          }

          let planScopeRaw: unknown = null;
          let emissionTargetsRaw: unknown = null;
          if (planScopeRes?.ok) {
            const t = await planScopeRes.text();
            if (t.trim().startsWith("{")) planScopeRaw = JSON.parse(t);
          }
          if (emissionTargetsRes?.ok) {
            const t = await emissionTargetsRes.text();
            if (t.trim().startsWith("{")) emissionTargetsRaw = JSON.parse(t);
          }

          // Extract municipality data from top-level key (first non-_version key)
          const planScopeObj = planScopeRaw && typeof planScopeRaw === "object" ? (planScopeRaw as Record<string, unknown>) : null;
          const emissionTargetsObj = emissionTargetsRaw && typeof emissionTargetsRaw === "object" ? (emissionTargetsRaw as Record<string, unknown>) : null;
          const planScopeKey = planScopeObj ? Object.keys(planScopeObj).find((k) => k !== "_version") ?? null : null;
          const emissionTargetsKey = emissionTargetsObj ? Object.keys(emissionTargetsObj).find((k) => k !== "_version") ?? null : null;

          // Use the JSON top-level key as display name, fall back to manifest name
          const displayName = planScopeKey || emissionTargetsKey || entry.name;

          plans.push({
            id: entry.id,
            name: displayName,
            planScope: planScopeKey && planScopeObj ? (planScopeObj[planScopeKey] as PlanScopeData) : null,
            emissionTargets: emissionTargetsKey && emissionTargetsObj ? (emissionTargetsObj[emissionTargetsKey] as EmissionTargetsData) : null,
          });
        }

        if (!cancelled) {
          setMunicipalities(plans);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
          setIsLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { municipalities, isLoading, error };
}
