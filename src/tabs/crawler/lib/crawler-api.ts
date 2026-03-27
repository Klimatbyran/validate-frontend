import { getGarboApiBaseUrl } from "@/config/api-env";
import type {
  crawlerSearchQuery,
  SaveReportsListResponse,
  SelectedReport,
} from "./crawler-types";

/** Crawler uses garbo API only. Base follows VITE_GARBO_TARGET / VITE_API_MODE. */

export function reportsUrl(path: string): string {
  const base = getGarboApiBaseUrl();
  const segment = path.replace(/^\//, "").replace(/\/+$/, "");
  const url = segment ? `${base}/${segment}` : base;
  return url.replace(/\/+$/, "");
}

export const updateCompanyReports = async (searchQuery: crawlerSearchQuery) => {
  try {
    const response = await fetch(reportsUrl("companies/reports/search-reports"), {
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
  const url = reportsUrl("companies/reports/database-list");
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

export const saveToRegistry = async (
  reports: SelectedReport[],
): Promise<SaveReportsListResponse> => {
  try {
    const response = await fetch(reportsUrl("companies/reports/save-reports"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(reports),
    });

    let responseBody: SaveReportsListResponse | { message?: string } | null =
      null;
    try {
      responseBody = (await response.json()) as SaveReportsListResponse;
    } catch {
      responseBody = null;
    }

    if (!response.ok) {
      if (response.status === 409 && responseBody) {
        return responseBody as SaveReportsListResponse;
      }
      const errorMsg = responseBody?.message
        ? responseBody.message
        : `Failed to save to registry: ${response.status} ${response.statusText}`;
      throw new Error(errorMsg);
    }

    if (responseBody) {
      return responseBody as SaveReportsListResponse;
    }

    throw new Error("Response does not match registry schema");
  } catch (error) {
    const msg = "Failed to save to registry";
    console.error(msg, error);
    throw error instanceof Error ? error : new Error(msg);
  }
};
