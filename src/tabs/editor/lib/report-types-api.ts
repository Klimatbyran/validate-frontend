import { garboAuthFetch } from "@/lib/garbo-auth-fetch";
import type {
  ReportType,
  CreateReportTypeBody,
  UpdateReportTypeBody,
} from "@/tabs/editor/lib/types";
import { apiUrl } from "@/tabs/editor/lib/api-utils";

export async function fetchReportTypes(): Promise<ReportType[]> {
  const res = await garboAuthFetch(apiUrl("/report-types"), {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (res.status === 401) {
    throw new Error("Please log in to view report types.");
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch report types: ${res.status} ${text}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : (data.reportTypes ?? data.items ?? []);
}

export async function createReportType(
  body: CreateReportTypeBody,
): Promise<ReportType> {
  const res = await garboAuthFetch(apiUrl("/report-types"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  if (res.status === 401) {
    throw new Error("Please log in to create report types.");
  }
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 409)
      throw new Error("Report type with this slug already exists.");
    throw new Error(`Failed to create report type: ${res.status} ${text}`);
  }
  return res.json();
}

export async function updateReportType(
  id: string,
  body: UpdateReportTypeBody,
): Promise<ReportType> {
  const res = await garboAuthFetch(apiUrl(`/report-types/${id}`), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  if (res.status === 401) {
    throw new Error("Please log in to update report types.");
  }
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 409)
      throw new Error("Another report type already has this slug.");
    throw new Error(`Failed to update report type: ${res.status} ${text}`);
  }
  return res.json();
}

export async function deleteReportType(id: string): Promise<void> {
  const res = await garboAuthFetch(apiUrl(`/report-types/${id}`), {
    method: "DELETE",
  });
  if (res.status === 401) {
    throw new Error("Please log in to delete report types.");
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to delete report type: ${res.status} ${text}`);
  }
}
