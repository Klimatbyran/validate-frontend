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
        if (!indexRes.ok) throw new Error("Failed to load climate plans index");
        const index: ClimatePlanIndex = await indexRes.json();

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

          const planScopeRaw = planScopeRes?.ok ? await planScopeRes.json() : null;
          const emissionTargetsRaw = emissionTargetsRes?.ok ? await emissionTargetsRes.json() : null;

          // Extract municipality data from top-level key (first non-_version key)
          const planScopeKey = planScopeRaw
            ? Object.keys(planScopeRaw).find((k) => k !== "_version")
            : null;
          const emissionTargetsKey = emissionTargetsRaw
            ? Object.keys(emissionTargetsRaw).find((k) => k !== "_version")
            : null;

          // Use the JSON top-level key as display name, fall back to manifest name
          const displayName = planScopeKey || emissionTargetsKey || entry.name;

          plans.push({
            id: entry.id,
            name: displayName,
            planScope: planScopeKey ? planScopeRaw[planScopeKey] as PlanScopeData : null as unknown as PlanScopeData,
            emissionTargets: emissionTargetsKey ? emissionTargetsRaw[emissionTargetsKey] as EmissionTargetsData : null as unknown as EmissionTargetsData,
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
