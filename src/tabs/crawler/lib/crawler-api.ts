import { getPublicApiUrl } from "@/lib/utils";

/** Stage API URL for company data (dev proxy or direct). */
export function getStageApiUrl(): string {
  const isDev = import.meta.env.DEV;
  if (isDev) {
    return "/stagekkapi/api/";
  }
  return "https://stage-api.klimatkollen.se/api/";
}

/** Prod API URL for company data. */
export function getProdApiUrl(): string {
  return getPublicApiUrl("/api/companies");
}

type SearchQuery = {
  name: string;
  reportYear: string;
};

export const fetchCompanyReports = async (searchQuery: SearchQuery) => {
  const baseUrl = getStageApiUrl();
  try {
    const response = await fetch(`${baseUrl}/reports/`, {
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
  const baseUrl = getStageApiUrl();
  try {
    const response = await fetch(`${baseUrl}/reports/list/`);
    if (response.ok) {
      const data = await response.json();
      return data;
    } else {
      console.error("Failed to fetch company names:", response.statusText);
      throw new Error(`Failed to fetch company names: ${response.statusText}`);
    }
  } catch (error) {
    console.error("Error fetching company names:", error);
    throw error instanceof Error
      ? error
      : new Error("Failed to fetch company names");
  }
};
