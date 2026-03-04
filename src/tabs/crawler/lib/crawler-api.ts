import { getGarboApiBaseUrl } from "@/config/api-env";

/** Crawler uses garbo API only. Base follows VITE_GARBO_TARGET / VITE_API_MODE. */
type SearchQuery = {
  name: string;
  reportYear: string;
};

function reportsUrl(path: string): string {
  const base = getGarboApiBaseUrl();
  const segment = path.replace(/^\//, "").replace(/\/+$/, "");
  const url = segment ? `${base}/${segment}` : base;
  return url.replace(/\/+$/, "");
}

export const updateCompanyReports = async (searchQuery: SearchQuery) => {
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
