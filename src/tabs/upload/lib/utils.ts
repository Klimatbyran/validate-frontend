/**
 * Validates an array of URL strings and separates them into valid and invalid arrays
 */
export function validateUrls(urlLines: string[]): {
  valid: string[];
  invalid: string[];
} {
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const url of urlLines) {
    try {
      new URL(url);
      valid.push(url);
    } catch {
      invalid.push(url);
    }
  }

  return { valid, invalid };
}

/**
 * Extracts company name from a URL by taking the first part of the hostname
 * Falls back to "Unknown" if parsing fails
 */
export function extractCompanyFromUrl(url: string): string {
  try {
    return new URL(url).hostname.split(".")[0] || "Unknown";
  } catch {
    return "Unknown";
  }
}

/**
 * API endpoint for PDF parsing
 */
export const PARSE_PDF_API_ENDPOINT = "/api/queues/parsePdf";

/**
 * Default runOnly configuration for job submission
 */
export const DEFAULT_RUN_ONLY = ["scope1", "scope2", "scope3"];
