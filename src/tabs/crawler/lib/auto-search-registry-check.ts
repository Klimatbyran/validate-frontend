import { searchRegistryPage } from "@/tabs/registry/lib/registry-api";
import type { RegistryEntry } from "@/tabs/registry/lib/registry-types";

export type AutoSearchRegistryMatch = {
  searchedCompanyName: string;
  wikidataId?: string;
  matches: RegistryEntry[];
};

const COMPANY_SUFFIX_PATTERN =
  /\b(ab|asa|as|group|holding|holdings|inc|ltd|plc|corp|corporation|company|co)\b\.?/gi;

export function normalizeCompanyNameForMatch(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(COMPANY_SUFFIX_PATTERN, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Short tokens like "BP" or "AL" are the distinguishing part of sibling
// company names (Aker BP vs Aker) — they must count.
function significantTokens(name: string): string[] {
  return normalizeCompanyNameForMatch(name)
    .split(" ")
    .filter((token) => token.length >= 2);
}

// Exact token, plural/definite variants ("car"/"cars"), or a long shared
// prefix (Scandinavian definite forms: "handelsbank"/"handelsbanken").
// Short-prefix matches are false friends ("abl" would match "abloy").
function tokensAlike(a: string, b: string): boolean {
  if (a === b) return true;
  if (!a.startsWith(b) && !b.startsWith(a)) return false;
  if (Math.abs(a.length - b.length) <= 1 && Math.min(a.length, b.length) >= 3) {
    return true;
  }
  return Math.min(a.length, b.length) >= 5;
}

function coverage(from: string[], to: string[]): number {
  return from.filter((token) => to.some((other) => tokensAlike(token, other)))
    .length;
}

export function fuzzyCompanyNamesMatch(
  searched: string,
  registryName: string,
): boolean {
  const left = normalizeCompanyNameForMatch(searched);
  const right = normalizeCompanyNameForMatch(registryName);
  if (!left || !right) return false;
  if (left === right) return true;

  const leftTokens = significantTokens(searched);
  const rightTokens = significantTokens(registryName);
  if (leftTokens.length === 0 || rightTokens.length === 0) return false;

  const leftMatched = coverage(leftTokens, rightTokens);
  const rightMatched = coverage(rightTokens, leftTokens);

  // Distinctive single-name variants match ("Handelsbanken" vs "Svenska
  // Handelsbanken AB"), but only for long names — a short shared token like
  // "Aker" also names distinct sibling companies (Aker BP, Aker Solutions).
  if (leftTokens.length === 1 && leftTokens[0]!.length >= 6 && leftMatched === 1) {
    return true;
  }
  if (
    rightTokens.length === 1 &&
    rightTokens[0]!.length >= 6 &&
    rightMatched === 1
  ) {
    return true;
  }

  // Same company only when the significant tokens of BOTH names line up;
  // sharing a token ("Aker" ∈ "Aker BioMarine") is not enough.
  return (
    leftMatched >= Math.ceil(leftTokens.length * 0.6) &&
    rightMatched >= Math.ceil(rightTokens.length * 0.6)
  );
}

export function buildFuzzyRegistrySearchTerms(companyName: string): string[] {
  const trimmed = companyName.trim();
  const terms = [trimmed];
  const tokens = significantTokens(trimmed);

  if (tokens.length >= 2) {
    terms.push(tokens.slice(0, 2).join(" "));
  }
  if (tokens.length >= 1) {
    terms.push(tokens[0]!);
  }

  const seen = new Set<string>();
  return terms.filter((term) => {
    const key = term.toLowerCase();
    if (!term || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function registryEntryMatchesAutoSearchCompany(
  entry: RegistryEntry,
  searchedCompanyName: string,
  wikidataId?: string,
): boolean {
  const entryWikidata = entry.wikidataId?.trim();
  const searchWikidata = wikidataId?.trim();
  if (
    searchWikidata &&
    entryWikidata &&
    searchWikidata.toLowerCase() === entryWikidata.toLowerCase()
  ) {
    return true;
  }

  const registryName = entry.companyName?.trim();
  if (!registryName) return false;
  return fuzzyCompanyNamesMatch(searchedCompanyName, registryName);
}

function mergeRegistryMatches(
  target: Map<string, RegistryEntry>,
  rows: RegistryEntry[],
  searchedCompanyName: string,
  wikidataId?: string,
): void {
  for (const row of rows) {
    if (
      registryEntryMatchesAutoSearchCompany(row, searchedCompanyName, wikidataId)
    ) {
      target.set(row.id ?? row.url, row);
    }
  }
}

export async function findRegistryMatchesForCompany(
  companyName: string,
  reportYear: string,
  wikidataId?: string,
): Promise<RegistryEntry[]> {
  try {
    const matches = new Map<string, RegistryEntry>();
    const browse = { reportYear };

    if (wikidataId?.trim()) {
      const page = await searchRegistryPage([wikidataId.trim()], 1, 50, browse);
      mergeRegistryMatches(matches, page.rows, companyName, wikidataId);
      if (matches.size > 0) {
        return [...matches.values()];
      }
    }

    for (const term of buildFuzzyRegistrySearchTerms(companyName)) {
      const page = await searchRegistryPage([term], 1, 50, browse);
      mergeRegistryMatches(matches, page.rows, companyName, wikidataId);
      if (matches.size > 0) break;
    }

    return [...matches.values()];
  } catch (error) {
    console.warn(
      `Registry lookup failed for ${companyName} (${reportYear}), continuing without pre-check:`,
      error,
    );
    return [];
  }
}

export async function findRegistryMatchesForAutoSearch(input: {
  companyNames: string[];
  reportYear: string;
  wikidataByCompany?: Record<string, string | undefined>;
}): Promise<AutoSearchRegistryMatch[]> {
  const results: AutoSearchRegistryMatch[] = [];

  for (const companyName of input.companyNames) {
    const wikidataId = input.wikidataByCompany?.[companyName];
    const matches = await findRegistryMatchesForCompany(
      companyName,
      input.reportYear,
      wikidataId,
    );
    results.push({
      searchedCompanyName: companyName,
      wikidataId,
      matches,
    });
  }

  return results;
}

export async function reportAlreadyInRegistry(
  report: {
    companyName: string;
    reportYear: string;
    wikidataId?: string;
  },
): Promise<boolean> {
  const matches = await findRegistryMatchesForCompany(
    report.companyName,
    report.reportYear,
    report.wikidataId,
  );
  return matches.length > 0;
}

export async function filterReportsNotAlreadyInRegistry<
  T extends { companyName: string; reportYear: string; wikidataId?: string },
>(reports: T[]): Promise<{ toSave: T[]; skipped: T[] }> {
  const toSave: T[] = [];
  const skipped: T[] = [];

  for (const report of reports) {
    if (await reportAlreadyInRegistry(report)) {
      skipped.push(report);
    } else {
      toSave.push(report);
    }
  }

  return { toSave, skipped };
}
