#!/usr/bin/env npx tsx
/**
 * analyze-error-clusters.ts
 *
 * Explores whether errors cluster within reports and whether "hard to parse"
 * companies share observable patterns in their stage extraction.
 *
 * Key questions:
 *   1. How are errors distributed across companies? (1 error vs many)
 *   2. When a company has errors, do they spread across scopes or cluster in one?
 *   3. For companies with many errors, are there signals visible in stage data
 *      that could identify them WITHOUT knowing the ground truth?
 *
 * Usage:
 *   npx tsx scripts/analyze-error-clusters.ts
 *   npx tsx scripts/analyze-error-clusters.ts --year 2023
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

function loadEnvironmentFile(filePath: string) {
  if (!existsSync(filePath)) return;
  const lines = readFileSync(filePath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const equalsIndex = trimmed.indexOf('=');
    if (equalsIndex === -1) continue;
    const key = trimmed.slice(0, equalsIndex).trim();
    const value = trimmed.slice(equalsIndex + 1).trim().replace(/^["']|["']$/g, '');
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnvironmentFile(join(import.meta.dirname, '..', '.env.development'));

const STAGE_API_URL = 'https://stage-api.klimatkollen.se/api/companies';
const PROD_API_URL  = 'https://api.klimatkollen.se/api/companies';
const STAGE_API_KEY = process.env.GARBO_STAGE_ALL_ACCESS_API_KEY ?? '';
const PROD_API_KEY  = process.env.GARBO_PROD_ALL_ACCESS_API_KEY ?? '';

// ── Types (minimal, same shape as prod API) ───────────────────────────────────

type DiscrepancyType =
  | 'identical' | 'rounding' | 'both-null'
  | 'small-error' | 'error' | 'unit-error'
  | 'hallucination' | 'missing' | 'category-error';

const IS_ERROR: Record<DiscrepancyType, boolean> = {
  identical: false, rounding: false, 'both-null': false,
  'small-error': true, error: true, 'unit-error': true,
  hallucination: true, missing: true, 'category-error': true,
};

interface WithVerification { metadata?: { verifiedBy?: { name: string } | null } }
interface Emissions {
  statedTotalEmissions?: ({ total?: number | null } & WithVerification) | number | null;
  calculatedTotalEmissions?: number | null;
  scope1?: ({ total?: number | null } & WithVerification) | null;
  scope2?: ({ mb?: number | null; lb?: number | null; unknown?: number | null } & WithVerification) | null;
  scope3?: ({
    statedTotalEmissions?: ({ total?: number | null } & WithVerification) | null;
    calculatedTotalEmissions?: number | null;
    categories?: Array<{ category: number; total: number | null } & WithVerification>;
  } & WithVerification) | null;
}
interface ReportingPeriod { startDate: string; endDate: string; emissions?: Emissions }
interface Company { wikidataId: string; name: string; tags?: string[]; reportingPeriods?: ReportingPeriod[] }

// ── Helpers ───────────────────────────────────────────────────────────────────

function numVal(v: number | { total?: number | null } | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return v;
  return typeof v?.total === 'number' ? v.total : null;
}

function isVerified(v: WithVerification | null | undefined): boolean {
  return !!(v?.metadata?.verifiedBy?.name);
}

function periodForYear(periods: ReportingPeriod[] | undefined, year: number): ReportingPeriod | null {
  if (!periods) return null;
  return periods.find((p) => {
    const end = new Date(p.endDate);
    return end.getFullYear() === year || (end.getFullYear() === year + 1 && end.getMonth() < 6);
  }) ?? null;
}

function classifyDiscrepancy(stage: number | null, prod: number | null): DiscrepancyType {
  if (stage === null && prod === null) return 'both-null';
  if (stage === null) return 'missing';
  if (prod === null) return 'hallucination';
  if (stage === prod) return 'identical';
  const diff = Math.abs(stage - prod);
  const rel  = diff / Math.abs(prod);
  if (rel <= 0.005) return 'rounding';
  // unit error: stage = prod / 1000 (or similar)
  for (const div of [10, 100, 1000, 10000, 100000, 1000000]) {
    if (Math.abs(stage - prod / div) / Math.abs(prod / div) <= 0.01) return 'unit-error';
    if (Math.abs(stage - prod * div) / Math.abs(prod * div) <= 0.01) return 'unit-error';
  }
  if (rel <= 0.05) return 'small-error';
  return 'error';
}

// Data points we score
const DATA_POINTS: { id: string; label: string; scope: string }[] = [
  { id: 'scope1-total',            label: 'Scope 1',              scope: 'scope1' },
  { id: 'scope2-mb',               label: 'Scope 2 MB',           scope: 'scope2' },
  { id: 'scope2-lb',               label: 'Scope 2 LB',           scope: 'scope2' },
  { id: 'scope2-unknown',          label: 'Scope 2 Unknown',      scope: 'scope2' },
  { id: 'cat-1',  label: 'Cat 1',  scope: 'scope3' }, { id: 'cat-2',  label: 'Cat 2',  scope: 'scope3' },
  { id: 'cat-3',  label: 'Cat 3',  scope: 'scope3' }, { id: 'cat-4',  label: 'Cat 4',  scope: 'scope3' },
  { id: 'cat-5',  label: 'Cat 5',  scope: 'scope3' }, { id: 'cat-6',  label: 'Cat 6',  scope: 'scope3' },
  { id: 'cat-7',  label: 'Cat 7',  scope: 'scope3' }, { id: 'cat-8',  label: 'Cat 8',  scope: 'scope3' },
  { id: 'cat-9',  label: 'Cat 9',  scope: 'scope3' }, { id: 'cat-10', label: 'Cat 10', scope: 'scope3' },
  { id: 'cat-11', label: 'Cat 11', scope: 'scope3' }, { id: 'cat-12', label: 'Cat 12', scope: 'scope3' },
  { id: 'cat-13', label: 'Cat 13', scope: 'scope3' }, { id: 'cat-14', label: 'Cat 14', scope: 'scope3' },
  { id: 'cat-15', label: 'Cat 15', scope: 'scope3' },
  { id: 'scope3-stated-total',     label: 'Scope 3 Stated',       scope: 'other' },
  { id: 'scope3-calculated-total', label: 'Scope 3 Calc',         scope: 'other' },
  { id: 'stated-total',            label: 'Stated Total',         scope: 'other' },
];

function getDataPointValue(emissions: Emissions | undefined, id: string): number | null {
  if (!emissions) return null;
  switch (id) {
    case 'scope1-total':            return numVal(emissions.scope1);
    case 'scope2-mb':               return numVal(emissions.scope2?.mb);
    case 'scope2-lb':               return numVal(emissions.scope2?.lb);
    case 'scope2-unknown':          return numVal(emissions.scope2?.unknown);
    case 'scope3-stated-total':     return numVal(emissions.scope3?.statedTotalEmissions);
    case 'scope3-calculated-total': return emissions.scope3?.calculatedTotalEmissions ?? null;
    case 'stated-total':            return numVal(emissions.statedTotalEmissions);
    case 'calculated-total':        return emissions.calculatedTotalEmissions ?? null;
    default: {
      const catNum = parseInt(id.replace('cat-', ''), 10);
      if (!isNaN(catNum)) {
        return emissions.scope3?.categories?.find((c) => c.category === catNum)?.total ?? null;
      }
      return null;
    }
  }
}

function isDataPointVerified(emissions: Emissions | undefined, id: string): boolean {
  if (!emissions) return false;
  switch (id) {
    case 'scope1-total':  return isVerified(emissions.scope1);
    case 'scope2-mb': case 'scope2-lb': case 'scope2-unknown': return isVerified(emissions.scope2);
    case 'scope3-stated-total': return isVerified(emissions.scope3?.statedTotalEmissions as WithVerification);
    case 'scope3-calculated-total': return isVerified(emissions.scope3);
    case 'stated-total': return isVerified(emissions.statedTotalEmissions as WithVerification);
    default: {
      const catNum = parseInt(id.replace('cat-', ''), 10);
      if (!isNaN(catNum)) {
        const cat = emissions.scope3?.categories?.find((c) => c.category === catNum);
        return isVerified(cat);
      }
      return false;
    }
  }
}

// ── Observable signals in STAGE data (no ground truth needed) ────────────────

interface StageSignals {
  nullFields: number;          // how many data points are null in stage
  statedVsCalcGap: boolean;    // stated total and calculated total differ by >20%
  scope3NoCategories: boolean; // scope3 exists but has no categories at all
  multiScopeYoy: number;       // how many scopes have >5× YoY change vs prior prod
}

function extractStageSignals(
  stageEmissions: Emissions | undefined,
  priorProdEmissions: Emissions | undefined,
  year: number
): StageSignals {
  const stageValues = DATA_POINTS.map((dp) => getDataPointValue(stageEmissions, dp.id));
  const nullFields  = stageValues.filter((v) => v === null).length;

  const statedTotal = numVal(stageEmissions?.statedTotalEmissions);
  const calcTotal   = stageEmissions?.calculatedTotalEmissions ?? null;
  const statedVsCalcGap =
    statedTotal !== null && calcTotal !== null && calcTotal > 10
      ? Math.abs(statedTotal - calcTotal) / calcTotal > 0.2
      : false;

  const scope3cats = stageEmissions?.scope3?.categories;
  const scope3NoCategories =
    (numVal(stageEmissions?.scope3?.statedTotalEmissions) !== null ||
     stageEmissions?.scope3?.calculatedTotalEmissions != null) &&
    (!scope3cats || scope3cats.length === 0);

  const scopeChecks = [
    { stage: numVal(stageEmissions?.scope1), prior: numVal(priorProdEmissions?.scope1) },
    { stage: numVal(stageEmissions?.scope2?.mb), prior: numVal(priorProdEmissions?.scope2?.mb) },
    { stage: numVal(stageEmissions?.scope3?.statedTotalEmissions), prior: numVal(priorProdEmissions?.scope3?.statedTotalEmissions) },
    { stage: numVal(stageEmissions?.statedTotalEmissions), prior: numVal(priorProdEmissions?.statedTotalEmissions) },
  ];
  const multiScopeYoy = scopeChecks.filter(
    ({ stage, prior }) => stage !== null && prior !== null && prior > 10 && Math.abs(stage - prior) / prior > 5
  ).length;

  return { nullFields, statedVsCalcGap, scope3NoCategories, multiScopeYoy };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const year = process.argv.includes('--year')
    ? Number(process.argv[process.argv.indexOf('--year') + 1])
    : 2024;

  console.log('Fetching data…');
  const [stageRes, prodRes] = await Promise.all([
    fetch(STAGE_API_URL, STAGE_API_KEY ? { headers: { 'X-API-Key': STAGE_API_KEY } } : undefined),
    fetch(PROD_API_URL,  PROD_API_KEY  ? { headers: { 'X-API-Key': PROD_API_KEY  } } : undefined),
  ]);
  if (!stageRes.ok) throw new Error(`Stage: ${stageRes.status}`);
  if (!prodRes.ok)  throw new Error(`Prod: ${prodRes.status}`);

  const stageCompanies: Company[] = await stageRes.json();
  const prodCompanies:  Company[] = await prodRes.json();

  const stageById = new Map(stageCompanies.map((c) => [c.wikidataId, c]));
  const prodById  = new Map(prodCompanies.map((c) => [c.wikidataId, c]));
  const allIds    = Array.from(new Set([...stageById.keys(), ...prodById.keys()]));

  console.log(`Stage: ${stageCompanies.length} | Prod: ${prodCompanies.length}\n`);

  // ── Build per-company error profile ────────────────────────────────────────

  interface CompanyProfile {
    wikidataId: string;
    name: string;
    tags: string[];
    errors: { dataPointId: string; scope: string; discrepancy: DiscrepancyType }[];
    signals: StageSignals;
    hasVerifiedData: boolean;
  }

  const profiles: CompanyProfile[] = [];

  for (const id of allIds) {
    const stage = stageById.get(id);
    const prod  = prodById.get(id);
    if (!stage || !prod) continue;

    const stagePeriod = periodForYear(stage.reportingPeriods, year);
    const prodPeriod  = periodForYear(prod.reportingPeriods, year);
    const priorProdPeriod = periodForYear(prod.reportingPeriods, year - 1);
    if (!stagePeriod || !prodPeriod) continue;

    const errors: CompanyProfile['errors'] = [];
    let hasVerifiedData = false;

    for (const dp of DATA_POINTS) {
      const verified = isDataPointVerified(prodPeriod.emissions, dp.id);
      if (!verified) continue;
      hasVerifiedData = true;

      const stageVal = getDataPointValue(stagePeriod.emissions, dp.id);
      const prodVal  = getDataPointValue(prodPeriod.emissions, dp.id);
      const disc     = classifyDiscrepancy(stageVal, prodVal);
      if (IS_ERROR[disc]) errors.push({ dataPointId: dp.id, scope: dp.scope, discrepancy: disc });
    }

    if (!hasVerifiedData) continue;

    const signals = extractStageSignals(
      stagePeriod.emissions,
      priorProdPeriod?.emissions,
      year
    );

    profiles.push({ wikidataId: id, name: stage.name || id, tags: stage.tags ?? [], errors, signals, hasVerifiedData });
  }

  const withErrors  = profiles.filter((p) => p.errors.length > 0);
  const clean       = profiles.filter((p) => p.errors.length === 0);
  const hardToParse = profiles.filter((p) => p.errors.length >= 4);

  // ── 1. Error distribution ──────────────────────────────────────────────────

  console.log(`ERROR DISTRIBUTION — ${year}`);
  console.log('─'.repeat(56));
  const buckets = [
    { label: '0 errors (clean)',    fn: (p: CompanyProfile) => p.errors.length === 0 },
    { label: '1 error',            fn: (p: CompanyProfile) => p.errors.length === 1 },
    { label: '2–3 errors',         fn: (p: CompanyProfile) => p.errors.length >= 2 && p.errors.length <= 3 },
    { label: '4–6 errors',         fn: (p: CompanyProfile) => p.errors.length >= 4 && p.errors.length <= 6 },
    { label: '7+ errors (hard)',    fn: (p: CompanyProfile) => p.errors.length >= 7 },
  ];
  for (const { label, fn } of buckets) {
    const n = profiles.filter(fn).length;
    const bar = '█'.repeat(Math.round(n / profiles.length * 40));
    console.log(`${label.padEnd(22)} ${String(n).padStart(4)} (${(n / profiles.length * 100).toFixed(0).padStart(2)}%)  ${bar}`);
  }
  console.log(`${'Total verified'.padEnd(22)} ${profiles.length}`);

  // ── 2. Scope co-occurrence ─────────────────────────────────────────────────

  console.log('\nSCOPE ERROR CO-OCCURRENCE (of companies with error in scope X, % also have error in scope Y)');
  console.log('─'.repeat(72));
  const scopes = ['scope1', 'scope2', 'scope3', 'other'];
  const scopeLabels: Record<string, string> = { scope1: 'Scope 1', scope2: 'Scope 2', scope3: 'Scope 3', other: 'Totals' };

  const hasErrorInScope = (p: CompanyProfile, scope: string) =>
    p.errors.some((e) => e.scope === scope);

  // Header
  process.stdout.write(`${''.padEnd(14)}`);
  for (const s of scopes) process.stdout.write(`  ${scopeLabels[s].padStart(10)}`);
  console.log();
  console.log('─'.repeat(72));

  for (const rowScope of scopes) {
    const rowCompanies = withErrors.filter((p) => hasErrorInScope(p, rowScope));
    process.stdout.write(scopeLabels[rowScope].padEnd(14));
    for (const colScope of scopes) {
      if (rowScope === colScope) {
        process.stdout.write(`  ${'—'.padStart(10)}`);
      } else {
        const also = rowCompanies.filter((p) => hasErrorInScope(p, colScope)).length;
        const pct  = rowCompanies.length > 0 ? (also / rowCompanies.length * 100).toFixed(0) + '%' : '—';
        process.stdout.write(`  ${pct.padStart(10)}`);
      }
    }
    console.log(`   (n=${rowCompanies.length})`);
  }

  // ── 3. Error type breakdown for hard-to-parse companies ───────────────────

  console.log(`\nTOP "HARD TO PARSE" COMPANIES (≥4 errors) — ${hardToParse.length} companies`);
  console.log('─'.repeat(90));
  console.log(`${'Company'.padEnd(32)}  ${'Errors'.padStart(6)}  ${'Scopes'.padEnd(24)}  ${'Types'}`);
  console.log('─'.repeat(90));

  const sorted = [...hardToParse].sort((a, b) => b.errors.length - a.errors.length).slice(0, 20);
  for (const p of sorted) {
    const scopesAffected = [...new Set(p.errors.map((e) => e.scope))]
      .map((s) => scopeLabels[s] ?? s).join(', ');
    const typeCounts = new Map<DiscrepancyType, number>();
    for (const e of p.errors) typeCounts.set(e.discrepancy, (typeCounts.get(e.discrepancy) ?? 0) + 1);
    const types = Array.from(typeCounts.entries()).map(([t, n]) => `${t}×${n}`).join(' ');
    console.log(
      `${p.name.slice(0, 32).padEnd(32)}  ${String(p.errors.length).padStart(6)}  ${scopesAffected.slice(0, 24).padEnd(24)}  ${types}`
    );
  }

  // ── 4. Observable signal lift ──────────────────────────────────────────────

  console.log('\nOBSERVABLE SIGNALS — lift for predicting "hard to parse" (≥4 errors)');
  console.log('─'.repeat(80));

  const hardSet = new Set(hardToParse.map((p) => p.wikidataId));

  const signals: { label: string; fn: (p: CompanyProfile) => boolean }[] = [
    { label: 'Stated total ≠ calculated (>20%)', fn: (p) => p.signals.statedVsCalcGap },
    { label: 'Scope 3 present but no categories', fn: (p) => p.signals.scope3NoCategories },
    { label: '≥2 scopes with >5× YoY change',    fn: (p) => p.signals.multiScopeYoy >= 2 },
    { label: '>12 null fields in stage',          fn: (p) => p.signals.nullFields > 12 },
    { label: '>8 null fields in stage',           fn: (p) => p.signals.nullFields > 8 },
    { label: 'Any scope with >5× YoY change',    fn: (p) => p.signals.multiScopeYoy >= 1 },
  ];

  const hardRate = profiles.length > 0 ? hardToParse.length / profiles.length : 0;
  console.log(`Baseline "hard to parse" rate: ${(hardRate * 100).toFixed(1)}% (${hardToParse.length}/${profiles.length} verified companies)\n`);
  console.log(`${'Signal'.padEnd(40)}  ${'Flagged'.padStart(8)}  ${'Of those hard%'.padStart(14)}  ${'Precision'.padStart(10)}  ${'Lift'.padStart(6)}`);
  console.log('─'.repeat(80));

  for (const { label, fn } of signals) {
    const flagged   = profiles.filter(fn);
    const flaggedHard = flagged.filter((p) => hardSet.has(p.wikidataId));
    const precision = flagged.length > 0 ? flaggedHard.length / flagged.length : 0;
    const lift      = hardRate > 0 ? precision / hardRate : 0;
    console.log(
      `${label.padEnd(40)}  ${String(flagged.length).padStart(8)}  ${String(flaggedHard.length).padStart(14)}  ${(precision * 100).toFixed(0).padStart(9)}%  ${lift.toFixed(1).padStart(5)}×`
    );
  }

  // ── 5. Tags correlated with hard-to-parse ─────────────────────────────────

  const tagCounts = new Map<string, { hard: number; total: number }>();
  for (const p of profiles) {
    for (const tag of p.tags) {
      const entry = tagCounts.get(tag) ?? { hard: 0, total: 0 };
      entry.total++;
      if (hardSet.has(p.wikidataId)) entry.hard++;
      tagCounts.set(tag, entry);
    }
  }
  const tagLift = Array.from(tagCounts.entries())
    .filter(([, { total }]) => total >= 5)
    .map(([tag, { hard, total }]) => ({ tag, hard, total, precision: hard / total, lift: (hard / total) / hardRate }))
    .sort((a, b) => b.lift - a.lift);

  if (tagLift.length > 0) {
    console.log('\nTAG CORRELATION with hard-to-parse (≥5 companies per tag)');
    console.log('─'.repeat(64));
    console.log(`${'Tag'.padEnd(24)}  ${'Total'.padStart(6)}  ${'Hard'.padStart(6)}  ${'Precision'.padStart(10)}  ${'Lift'.padStart(6)}`);
    console.log('─'.repeat(64));
    for (const { tag, total, hard, precision, lift } of tagLift.slice(0, 15)) {
      console.log(
        `${tag.slice(0, 24).padEnd(24)}  ${String(total).padStart(6)}  ${String(hard).padStart(6)}  ${(precision * 100).toFixed(0).padStart(9)}%  ${lift.toFixed(1).padStart(5)}×`
      );
    }
  }
}

main().catch(console.error);
