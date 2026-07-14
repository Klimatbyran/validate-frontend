const GOVERNANCE_URL =
  /board[\s-]*of[\s-]*directors|board[\s-]*report|styrelse|auditor.?s[\s-]*report|corporate[\s-]*governance|governance[\s-]*report|remuneration|ersättningsrapport|ersattningsrapport|compensation[\s-]*report|proxy[\s-]*statement/i;

const PRIMARY_REPORT =
  /integrated[\s-]*(annual|report)|annual[\s-]*and[\s-]*sustainability|annual[\s-]*report|annualreport|årsredovisning|arsredovisning|sustainability[\s-]*report|hållbarhetsrapport|hallbarhetsrapport|bærekraftsrapport|baerekraftsrapport|årsrapport|arsrapport/i;

const TRUSTED_FILING_HOST =
  /(?:^|\.)((?:storage\.)?mfn\.se|newsweb\.oslobors\.no|mb\.cision\.com|news\.cision\.com|notified\.com|globenewswire\.com|investegate\.co\.uk|sec\.gov|live\.euronext\.com|nasdaqomxnordic\.com|finanssivalvonta\.fi)$/i;

const EXCHANGE_FILING_FEED_DESCRIPTION =
  "Exchange filing feed (regulatory / press-release hosts)";

const EXTENSIONLESS_ANNUAL_ASSET =
  /\/annual-report-\d{4}(?:\?|#|$)|\/\d{8}-annual-report-\d{4}(?:\?|#|$)|\.xhtml(?:\?|#|$)|(?:esef|annual.report).*\.zip(?:\?|#|$)/i;

export function isGovernanceReportUrl(url: string): boolean {
  return GOVERNANCE_URL.test(url.toLowerCase());
}

function companyTokens(companyName: string): string[] {
  return companyName
    .toLowerCase()
    .replace(/\b(as|asa|ab|group|holding|holdings|inc|ltd|plc|bank|publ)\b\.?/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function haystackForCandidate(input: {
  url: string;
  title?: string;
  description?: string;
  text?: string;
}): string {
  return `${input.title ?? ""} ${input.description ?? ""} ${input.url} ${input.text ?? ""}`.toLowerCase();
}

function mentionsReportYear(haystack: string, reportYear: string): boolean {
  if (haystack.includes(reportYear)) return true;
  const year = Number(reportYear);
  if (!Number.isFinite(year)) return false;
  const prev = String(year - 1);
  return new RegExp(`${prev}\\s*[/\\-–—]\\s*${reportYear}\\b`).test(haystack);
}

function adjacentYearPenalty(haystack: string, reportYear: string): number {
  if (!mentionsReportYear(haystack, reportYear)) {
    const year = Number(reportYear);
    if (Number.isFinite(year)) {
      const prev = String(year - 1);
      const next = String(year + 1);
      if (
        new RegExp(`(?:\\b|[-_/])${prev}(?:\\b|[-_./]|\\.(?:pdf|zip)|$)`, "i").test(
          haystack,
        )
      ) {
        return -45;
      }
      if (
        new RegExp(`(?:\\b|[-_/])${next}(?:\\b|[-_./]|\\.(?:pdf|zip)|$)`, "i").test(
          haystack,
        )
      ) {
        return -45;
      }
    }
  }
  return 0;
}

export function urlMatchesCompany(
  url: string,
  companyName: string,
  title?: string,
  description?: string,
  options?: { llmConfidence?: number; reportYear?: string; text?: string },
): boolean {
  const haystack = `${title ?? ""} ${description ?? ""} ${url}`.toLowerCase();
  const tokens = companyTokens(companyName);
  if (tokens.some((token) => haystack.includes(token))) return true;

  // Cover text is authoritative for company identity — filing-host URLs often
  // use a ticker/ID (e.g. "AZT") instead of the company name, so trust the
  // page-1 text when it names the company.
  const coverText = (options?.text ?? "").toLowerCase();
  if (coverText && tokens.some((token) => coverText.includes(token))) {
    return true;
  }

  try {
    const host = new URL(url).hostname.toLowerCase();
    const trustedFilingHost = TRUSTED_FILING_HOST.test(host);

    if (
      trustedFilingHost &&
      description?.includes(EXCHANGE_FILING_FEED_DESCRIPTION) &&
      PRIMARY_REPORT.test(haystack)
    ) {
      return true;
    }

    if (
      trustedFilingHost &&
      options?.llmConfidence != null &&
      options.llmConfidence >= 0.75 &&
      PRIMARY_REPORT.test(haystack) &&
      (!options.reportYear || mentionsReportYear(haystack, options.reportYear))
    ) {
      return true;
    }

    if (trustedFilingHost) return false;

    const compact = tokens.join("");
    const hostBare = host.replace(/^www\./, "").replace(/\./g, "");
    if (compact.length >= 4 && hostBare.includes(compact)) return true;
    return tokens.some((token) => token.length >= 4 && host.includes(token));
  } catch {
    return false;
  }
}

function isLikelyReportAssetUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return lower.includes(".pdf") || EXTENSIONLESS_ANNUAL_ASSET.test(lower);
}

/**
 * What page-1 cover text says about the reporting year. The cover is the
 * authority: URLs/filenames often carry the publication year (e.g. a
 * "...2025..." URL serving the 2024 sustainability report).
 */
export function coverTextYearVerdict(
  text: string | undefined,
  reportYear: string,
): "match" | "adjacent" | "unknown" {
  const cover = (text ?? "").toLowerCase();
  if (!cover.trim()) return "unknown";
  if (mentionsReportYear(cover, reportYear)) return "match";
  const year = Number(reportYear);
  if (!Number.isFinite(year)) return "unknown";
  const prev = String(year - 1);
  const next = String(year + 1);
  if (new RegExp(`\\b${prev}\\b`).test(cover)) return "adjacent";
  if (new RegExp(`\\b${next}\\b`).test(cover)) return "adjacent";
  return "unknown";
}

export function scoreExtractedReportCandidate(input: {
  url: string;
  title?: string;
  description?: string;
  text: string;
  companyName: string;
  reportYear: string;
}): number {
  const haystack = haystackForCandidate(input);
  const metaHaystack =
    `${input.title ?? ""} ${input.description ?? ""} ${input.url}`.toLowerCase();
  const coverVerdict = coverTextYearVerdict(input.text, input.reportYear);

  let score = 0;
  if (PRIMARY_REPORT.test(haystack)) score += 40;

  // Year scoring: cover text outweighs URL/title. A cover naming only an
  // adjacent year overrides a matching year in the filename, not vice versa.
  if (coverVerdict === "match") {
    score += 40;
  } else if (coverVerdict === "adjacent") {
    score -= 60;
    if (mentionsReportYear(metaHaystack, input.reportYear)) score += 10;
  } else {
    if (mentionsReportYear(metaHaystack, input.reportYear)) score += 25;
    score += adjacentYearPenalty(metaHaystack, input.reportYear);
  }

  if (GOVERNANCE_URL.test(haystack)) score -= 90;

  for (const token of companyTokens(input.companyName)) {
    if (haystack.includes(token)) score += 12;
  }

  if (
    /discovered on company reports page/i.test(input.description ?? "") ||
    /discovered on company reports page/i.test(input.title ?? "")
  ) {
    score += 20;
  }

  if (!urlMatchesCompany(input.url, input.companyName, input.title, input.description)) {
    score -= 120;
  }

  return score;
}

export function pickHeuristicReportCandidate<
  T extends {
    url: string;
    title?: string;
    description?: string;
    text: string;
  },
>(candidates: T[], companyName: string, reportYear: string): T | null {
  if (candidates.length === 0) return null;

  const ranked = [...candidates].sort(
    (a, b) =>
      scoreExtractedReportCandidate({
        ...b,
        companyName,
        reportYear,
      }) -
      scoreExtractedReportCandidate({
        ...a,
        companyName,
        reportYear,
      }),
  );

  const best = ranked[0];
  if (!best) return null;

  const bestScore = scoreExtractedReportCandidate({
    ...best,
    companyName,
    reportYear,
  });
  if (bestScore < 45) return null;
  if (GOVERNANCE_URL.test(`${best.title ?? ""} ${best.url}`.toLowerCase())) {
    return null;
  }
  if (!urlMatchesCompany(best.url, companyName, best.title, best.description)) {
    return null;
  }
  if (!mentionsReportYear(haystackForCandidate(best), reportYear)) {
    return null;
  }
  // Never rescue a candidate whose cover page names a different year — the
  // cover is authoritative over the URL/filename year.
  if (coverTextYearVerdict(best.text, reportYear) === "adjacent") {
    return null;
  }

  return best;
}

/** When PDF text extraction fails, pick from URL/title metadata on trusted hosts. */
export function pickMetadataOnlyReportCandidate<
  T extends {
    url: string;
    title?: string;
    description?: string;
  },
>(candidates: T[], companyName: string, reportYear: string): T | null {
  const eligible = candidates.filter((candidate) => {
    if (isGovernanceReportUrl(`${candidate.title ?? ""} ${candidate.url}`)) {
      return false;
    }
    if (!isLikelyReportAssetUrl(candidate.url)) return false;
    const haystack = haystackForCandidate(candidate);
    if (!PRIMARY_REPORT.test(haystack)) return false;
    if (!mentionsReportYear(haystack, reportYear)) return false;
    return urlMatchesCompany(
      candidate.url,
      companyName,
      candidate.title,
      candidate.description,
    );
  });

  if (eligible.length === 0) return null;

  const ranked = [...eligible].sort((a, b) => {
    const score = (item: T) => {
      const haystack = haystackForCandidate(item);
      let value = 0;
      if (PRIMARY_REPORT.test(haystack)) value += 40;
      if (mentionsReportYear(haystack, reportYear)) value += 25;
      value += adjacentYearPenalty(haystack, reportYear);
      for (const token of companyTokens(companyName)) {
        if (haystack.includes(token)) value += 12;
      }
      if (item.url.toLowerCase().includes(".pdf")) value += 8;
      return value;
    };
    return score(b) - score(a);
  });

  return ranked[0] ?? null;
}
