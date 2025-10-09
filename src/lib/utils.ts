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
