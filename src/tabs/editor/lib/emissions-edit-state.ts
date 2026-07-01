import { assignNullableStringKey } from "./reporting-period-ui";
import type { EditedPeriodEmissions } from "./emissions-edit";

export type EditedEmissionsByPeriodId = Record<string, EditedPeriodEmissions>;

function dropPeriodIfEmpty(
  prev: EditedEmissionsByPeriodId,
  rpId: string,
  nextForRp: EditedPeriodEmissions,
): EditedEmissionsByPeriodId {
  const hasAny = Object.keys(nextForRp).length > 0;
  if (hasAny) return { ...prev, [rpId]: nextForRp };
  const next = { ...prev };
  delete next[rpId];
  return next;
}

export function applyNullableStringEdit(
  prev: EditedEmissionsByPeriodId,
  rpId: string,
  key: keyof EditedPeriodEmissions,
  value: string,
  hadOriginalValue: boolean,
): EditedEmissionsByPeriodId {
  const current = { ...(prev[rpId] ?? {}) } as Record<string, unknown>;
  const nextForRp = assignNullableStringKey(
    current,
    String(key),
    value,
    hadOriginalValue,
  ) as EditedPeriodEmissions;
  return dropPeriodIfEmpty(prev, rpId, nextForRp);
}

export function applyScope3CategoryValueEdit(
  prev: EditedEmissionsByPeriodId,
  rpId: string,
  category: number,
  value: string,
  hadOriginalValue: boolean,
): EditedEmissionsByPeriodId {
  const key = String(category);
  const current = prev[rpId] ?? {};
  const nextForRp: EditedPeriodEmissions = { ...current };
  const nextCats = { ...(current.scope3Categories ?? {}) };

  if (value.trim() === "" && !hadOriginalValue) {
    delete nextCats[key];
  } else {
    nextCats[key] = value.trim() === "" ? "" : value;
  }

  nextForRp.scope3Categories = Object.keys(nextCats).length
    ? nextCats
    : undefined;
  return dropPeriodIfEmpty(prev, rpId, nextForRp);
}

export function applyScope3CategoryVerifiedEdit(
  prev: EditedEmissionsByPeriodId,
  rpId: string,
  category: number,
  verified: boolean,
): EditedEmissionsByPeriodId {
  const key = String(category);
  const current = prev[rpId] ?? {};
  const next = { ...(current.scope3CategoriesVerified ?? {}), [key]: verified };
  return { ...prev, [rpId]: { ...current, scope3CategoriesVerified: next } };
}

export function applyScope3CategoryClear(
  prev: EditedEmissionsByPeriodId,
  rpId: string,
  category: number,
): EditedEmissionsByPeriodId {
  const current = prev[rpId];
  if (!current) return prev;
  const key = String(category);
  const nextForRp: EditedPeriodEmissions = { ...current };

  if (nextForRp.scope3Categories) {
    const nextCats = { ...nextForRp.scope3Categories };
    delete nextCats[key];
    nextForRp.scope3Categories = Object.keys(nextCats).length
      ? nextCats
      : undefined;
  }
  if (nextForRp.scope3CategoriesVerified) {
    const nextV = { ...nextForRp.scope3CategoriesVerified };
    delete nextV[key];
    nextForRp.scope3CategoriesVerified = Object.keys(nextV).length
      ? nextV
      : undefined;
  }

  return dropPeriodIfEmpty(prev, rpId, nextForRp);
}
