import { getGarboQueueArchiveUrl } from "@/config/api-env";
import { garboAuthFetch } from "@/lib/garbo-auth-fetch";
import type {
  ArchiveRunSummary,
  ArchiveRunsListResponse,
} from "@/tabs/jobbstatus/lib/archive-types";

const ARCHIVE_PAGE_SIZE = 100;

/** Fetch all archived pipeline runs (paginated server-side, max 100/page). */
export async function fetchAllArchiveRuns(
  signal?: AbortSignal,
): Promise<ArchiveRunSummary[]> {
  const allRuns: ArchiveRunSummary[] = [];
  let page = 1;
  let total = Number.POSITIVE_INFINITY;

  while (allRuns.length < total) {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(ARCHIVE_PAGE_SIZE),
    });
    const response = await garboAuthFetch(
      getGarboQueueArchiveUrl(`/runs?${params.toString()}`),
      { headers: { Accept: "application/json" }, signal },
    );
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `Failed to fetch archive runs (${response.status})${body ? `: ${body.slice(0, 200)}` : ""}`,
      );
    }

    const json = (await response.json()) as ArchiveRunsListResponse;
    total = json.total;
    allRuns.push(...json.runs);

    if (json.runs.length === 0 || json.runs.length < ARCHIVE_PAGE_SIZE) {
      break;
    }
    page += 1;
  }

  return allRuns;
}
