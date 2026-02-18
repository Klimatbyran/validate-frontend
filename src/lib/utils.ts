import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Checks if text contains markdown formatting patterns on any line:
// Headers (# Title), lists (- item, 1. item), blockquotes (> text),
// code blocks (```), or tables (| col |). Will match simple text
// like "- buy milk" but that's acceptable for this use case.
export function isMarkdown(value: string) {
  return /^(#{1,6}\s|[-*+]\s|>\s|\d+\.\s|```|\|.*\|)/m.test(value);
}



// Use dev proxy in development, direct API in production
export const getPublicApiUrl = (path: string) => {
  const isDev = import.meta.env.DEV;
  if (isDev) {
    // Remove /api prefix since proxy adds it back
    const cleanPath = path.startsWith('/api') ? path.replace(/^\/api/, '') : path;
    return `/kkapi${cleanPath}`;
  }
  return `https://api.klimatkollen.se${path}`;  // Direct in prod
}
// Utility function to check if a string is valid JSON
export function isJsonString(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}

// Utility function to extract wikidata information from job data
export function getWikidataInfo(
  job: any
): { node?: string; label?: string } | null {
  if (!job?.data) return null;

  // Try to parse the data if it's a string
  let processedData;
  if (typeof job.data === "string" && isJsonString(job.data)) {
    try {
      processedData = JSON.parse(job.data);
    } catch (e) {
      return null;
    }
  } else if (typeof job.data === "object") {
    processedData = job.data;
  } else {
    return null;
  }

  // Check if wikidata exists and has a node
  if (
    processedData?.wikidata &&
    typeof processedData.wikidata === "object" &&
    processedData.wikidata.node
  ) {
    return {
      node: processedData.wikidata.node,
      label: processedData.wikidata.label,
    };
  }

  return null;
}

/** Format a number for display (sv-SE locale), or "—" when null/undefined. Reusable across features. */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return value.toLocaleString('sv-SE');
}

/** Trigger a CSV file download. Rows are arrays of cell values (joined with commas). */
export function downloadCsv(rows: string[][], filename: string): void {
  const csvContent = rows.map((row) => row.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
