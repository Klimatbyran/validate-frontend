import { getGarboApiBaseUrl } from "@/config/api-env";
import type { crawlerSearchQuery, Report } from "./crawler-types";

/** Crawler uses garbo API only. Base follows VITE_GARBO_TARGET / VITE_API_MODE. */

export function reportsUrl(path: string): string {
  const base = getGarboApiBaseUrl();
  const segment = path.replace(/^\//, "").replace(/\/+$/, "");
  const url = segment ? `${base}/${segment}` : base;
  return url.replace(/\/+$/, "");
}

export const updateCompanyReports = async (searchQuery: crawlerSearchQuery) => {
  try {
    const response = await fetch(reportsUrl("reports"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify([searchQuery]),
    });

    if (response.ok) {
      const data = await response.json();
      return data;
    } else {
      console.error("Failed to fetch company report:", response.statusText);
      throw new Error(`Failed to fetch report: ${response.statusText}`);
    }
  } catch (error) {
    console.error("Error fetching company report:", error);
    throw error instanceof Error ? error : new Error("Failed to fetch report");
  }
};

export const fetchCompanyNamesList = async () => {
  const url = reportsUrl("reports/list");
  try {
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      return data;
    } else {
      const msg = `Failed to fetch company names: ${response.status} ${response.statusText} (${url})`;
      console.error(msg);
      throw new Error(msg);
    }
  } catch (error) {
    const msg = `Failed to fetch company names (${url})`;
    console.error(msg, error);
    throw error instanceof Error ? error : new Error(msg);
  }
};

export const saveToWaitingRoom = async (reports: Report[]) => {
  try {
    const response = await fetch(reportsUrl("reports/save-reports"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(reports),
    });

    console.log(JSON.stringify(reports));

    let responseBody = null;
    try {
      responseBody = await response.json();
    } catch (e) {
      responseBody = null;
    }

    if (!response.ok) {
      // Handle 409 (duplicates)
      if (response.status === 409 && responseBody) {
        // Backend returns {successes, failed, message}
        return responseBody;
      }
      const errorMsg =
        responseBody && responseBody.message
          ? responseBody.message
          : `Failed to save to waiting room: ${response.status} ${response.statusText}`;
      throw new Error(errorMsg);
    }
    // Success
    if (responseBody && responseBody.successes) {
      return responseBody;
    }
    // Fallback: just return all companies as successes
    return {
      successes: reports.map((r) =>
        typeof r === "object" && "companyName" in r
          ? (r as any).companyName
          : "Unknown",
      ),
      failed: [],
      message: "All reports saved successfully.",
    };
  } catch (error) {
    const msg = "Failed to save to waiting room";
    console.error(msg, error);
    throw error instanceof Error ? error : new Error(msg);
  }
};
