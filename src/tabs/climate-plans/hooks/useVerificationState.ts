import { useMemo, useState, useSyncExternalStore } from "react";
import type { MunicipalityClimatePlan } from "../lib/types";
import type { MeasureType } from "../lib/types";
import type {
  MunicipalityVerificationState,
  MunicipalityVerificationSummary,
  VerificationRecord,
  VerificationStatus,
} from "../lib/verification-types";

const STORAGE_PREFIX = "validate:climate-plans:verification:v1:";

function storageKey(municipalityId: string) {
  return `${STORAGE_PREFIX}${municipalityId}`;
}

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function readMunicipalityVerificationState(
  municipalityId: string,
): MunicipalityVerificationState | null {
  const raw = localStorage.getItem(storageKey(municipalityId));
  const parsed = safeJsonParse<MunicipalityVerificationState>(raw);
  if (!parsed || parsed.version !== 1 || typeof parsed.items !== "object") return null;
  return parsed;
}

export function writeMunicipalityVerificationState(
  municipalityId: string,
  state: MunicipalityVerificationState,
) {
  localStorage.setItem(storageKey(municipalityId), JSON.stringify(state));
  notify();
}

function ensureState(municipalityId: string): MunicipalityVerificationState {
  return (
    readMunicipalityVerificationState(municipalityId) ?? {
      version: 1,
      updatedAt: new Date().toISOString(),
      items: {},
    }
  );
}

// --- external store plumbing (in-app updates + multi-tab storage events) ---

const listeners = new Set<() => void>();
function notify() {
  for (const l of listeners) l();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function subscribeWithStorageEvents(cb: () => void) {
  const unsub = subscribe(cb);
  const onStorage = (e: StorageEvent) => {
    if (!e.key) return;
    if (e.key.startsWith(STORAGE_PREFIX)) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener("storage", onStorage);
    unsub();
  };
}

function getSnapshotKeyed(municipalityId: string) {
  // Return stable string snapshot for change detection.
  return localStorage.getItem(storageKey(municipalityId)) ?? "";
}

function getServerSnapshot() {
  return "";
}

// --- domain helpers ---

export function getMunicipalityVerifiableItemIds(
  municipality: MunicipalityClimatePlan,
): string[] {
  const ids: string[] = [];
  const et = municipality.emissionTargets;
  const ts = municipality.planScope?.temporal_scope;
  if (ts?.plan_period_start && ts.plan_period_end) ids.push("plan_period");
  if (et?.primary_target?.exists) ids.push("primary_target");
  const measures = municipality.measures ?? et?.measures ?? [];
  if (measures.length > 0) {
    measures.forEach((_, i) => ids.push(`measure:${i}`));
  } else {
    (et?.own_commitments ?? []).forEach((_, i) =>
      ids.push(`own_commitment:${i}`),
    );
  }
  return ids;
}

export function getMunicipalityVerificationSummarySnapshot(
  municipality: MunicipalityClimatePlan,
): MunicipalityVerificationSummary {
  const ids = getMunicipalityVerifiableItemIds(municipality);
  const state = readMunicipalityVerificationState(municipality.id);

  let correct = 0;
  let incorrect = 0;

  if (state) {
    for (const id of ids) {
      const r = state.items[id];
      if (!r) continue;
      if (r.status === "correct") correct += 1;
      if (r.status === "incorrect") incorrect += 1;
    }
  }

  const reviewed = correct + incorrect;

  const et = municipality.emissionTargets;
  const counts = (() => {
    const base = { outcomes: 0, activityShifts: 0, interventions: 0 };
    const measures = municipality.measures ?? et?.measures ?? [];
    if (measures.length === 0) return base;
    const map: Record<MeasureType, keyof typeof base> = {
      outcome: "outcomes",
      activity_shift: "activityShifts",
      intervention: "interventions",
      uncategorized: "outcomes",
    };
    for (const m of measures) {
      const key = map[m.measure_type] ?? "outcomes";
      base[key] += 1;
    }
    return base;
  })();

  return {
    total: ids.length,
    reviewed,
    correct,
    incorrect,
    counts,
  };
}

export function useMunicipalityVerificationSummary(
  municipality: MunicipalityClimatePlan,
) {
  const _snapshot = useSyncExternalStore(
    subscribeWithStorageEvents,
    () => getSnapshotKeyed(municipality.id),
    getServerSnapshot,
  );

  return useMemo(
    () => getMunicipalityVerificationSummarySnapshot(municipality),
    [municipality, _snapshot],
  );
}

export function useMunicipalityVerificationItem(
  municipalityId: string,
  itemId: string,
): {
  record: VerificationRecord;
  setStatus: (s: VerificationStatus) => void;
  setRecord: (r: VerificationRecord) => void;
} {
  const _snapshot = useSyncExternalStore(
    subscribeWithStorageEvents,
    () => getSnapshotKeyed(municipalityId),
    getServerSnapshot,
  );

  const state = useMemo(() => ensureState(municipalityId), [municipalityId, _snapshot]);
  const record: VerificationRecord =
    state.items[itemId] ?? { status: "unreviewed" };

  const setRecord = (r: VerificationRecord) => {
    const next = ensureState(municipalityId);
    next.items[itemId] = r;
    next.updatedAt = new Date().toISOString();
    writeMunicipalityVerificationState(municipalityId, next);
  };

  const setStatus = (s: VerificationStatus) => {
    setRecord({ ...record, status: s });
  };

  return { record, setStatus, setRecord };
}

export function useMunicipalityVerificationDraft(municipality: MunicipalityClimatePlan) {
  const itemIds = getMunicipalityVerifiableItemIds(municipality);
  const persistedSnapshot = useSyncExternalStore(
    subscribeWithStorageEvents,
    () => getSnapshotKeyed(municipality.id),
    getServerSnapshot,
  );

  const persisted = useMemo(
    () => ensureState(municipality.id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [municipality.id, persistedSnapshot],
  );

  const [draft, setDraft] = useState<Record<string, VerificationRecord>>(() => ({
    ...persisted.items,
  }));

  // If persisted changes externally (e.g. other tab), merge in anything not modified locally.
  // We define "modified locally" as draft differing from persisted for that key.
  useMemo(() => {
    setDraft((prev) => {
      const next = { ...prev };
      for (const id of itemIds) {
        const p = persisted.items[id] ?? { status: "unreviewed" as const };
        const d = prev[id] ?? { status: "unreviewed" as const };
        if (JSON.stringify(d) === JSON.stringify(p)) {
          next[id] = p;
        }
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistedSnapshot, municipality.id]);

  const getRecord = (id: string): VerificationRecord =>
    draft[id] ?? { status: "unreviewed" };

  const setRecord = (id: string, r: VerificationRecord) => {
    setDraft((prev) => ({ ...prev, [id]: r }));
  };

  const changedCount = itemIds.reduce((acc, id) => {
    const p = persisted.items[id] ?? { status: "unreviewed" as const };
    const d = getRecord(id);
    return JSON.stringify(p) === JSON.stringify(d) ? acc : acc + 1;
  }, 0);

  const summary = itemIds.reduce(
    (acc, id) => {
      const r = getRecord(id);
      if (r.status === "correct") acc.correct += 1;
      if (r.status === "incorrect") acc.incorrect += 1;
      return acc;
    },
    { correct: 0, incorrect: 0 },
  );

  const reviewed = summary.correct + summary.incorrect;

  const save = () => {
    const next: MunicipalityVerificationState = {
      version: 1,
      updatedAt: new Date().toISOString(),
      items: { ...draft },
    };
    writeMunicipalityVerificationState(municipality.id, next);
  };

  return {
    itemIds,
    getRecord,
    setRecord,
    changedCount,
    reviewed,
    correct: summary.correct,
    incorrect: summary.incorrect,
    total: itemIds.length,
    save,
  };
}

