import {
  getProdUnearthUrl,
  getStageUnearthUrl,
  type ApiTarget,
} from "@/config/api-env";
import { garboAuthFetch } from "@/lib/garbo-auth-fetch";
import type { ReportingPeriodWriteBody } from "./write-value";

function companiesReportingPeriodsUrl(
  source: ApiTarget,
  companyId: string,
): string {
  const path = `/api/companies/${encodeURIComponent(companyId)}/reporting-periods`;
  if (source === "prod") return getProdUnearthUrl(path);
  if (source === "local") {
    if (import.meta.env.DEV) return `/unearth-local${path}`;
    return getStageUnearthUrl(path);
  }
  return getStageUnearthUrl(path);
}

export async function updateReportingPeriodsForSource(
  source: ApiTarget,
  companyId: string,
  body: ReportingPeriodWriteBody,
): Promise<void> {
  const response = await garboAuthFetch(
    companiesReportingPeriodsUrl(source, companyId),
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  if (response.status === 401) {
    throw new Error("Please log in to update this value.");
  }
  if (response.status === 404) {
    throw new Error("Company not found.");
  }
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Failed to update reporting periods (${response.status})${
        text ? `: ${text.slice(0, 200)}` : ""
      }`,
    );
  }
}
