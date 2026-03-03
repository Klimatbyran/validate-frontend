import { getGarboApiBaseUrl } from "@/config/api-env";

/** Crawler uses garbo API only. Base follows VITE_API_MODE (stage/prod). */
type SearchQuery = {
  name: string;
  reportYear: string;
};

function reportsUrl(path: string): string {
  const base = getGarboApiBaseUrl();
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\//, "")}`;
}

export const fetchCompanyReports = async (searchQuery: SearchQuery) => {
  try {
    const response = await fetch(reportsUrl("reports/"), {
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
  try {
    const response = await fetch(reportsUrl("reports/list/"));
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
