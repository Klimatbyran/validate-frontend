import type { RunReportListItem } from "@/lib/run-reports-types";

export type PipelineCompanyContext = {
  companyId?: string;
  companyName?: string;
  wikidataId?: string;
};

export type PipelineUrlContext = PipelineCompanyContext & {
  url: string;
};

export function pipelineContextFromRunItem(
  item: RunReportListItem,
): PipelineUrlContext | null {
  const url = item.url?.trim();
  if (!url) return null;

  const companyId = item.companyId?.trim();
  const companyName = item.companyName?.trim();
  const wikidataId = item.wikidataId?.trim();

  if (!companyId && !companyName && !wikidataId) {
    return { url };
  }

  return {
    url,
    ...(companyId ? { companyId } : {}),
    ...(companyName ? { companyName } : {}),
    ...(wikidataId ? { wikidataId } : {}),
  };
}

export function urlContextsFromRunItems(
  items: RunReportListItem[],
): PipelineUrlContext[] | undefined {
  const contexts = items
    .map(pipelineContextFromRunItem)
    .filter((ctx): ctx is PipelineUrlContext => ctx != null)
    .filter(
      (ctx) =>
        Boolean(ctx.companyId) ||
        Boolean(ctx.companyName) ||
        Boolean(ctx.wikidataId),
    );

  return contexts.length > 0 ? contexts : undefined;
}
