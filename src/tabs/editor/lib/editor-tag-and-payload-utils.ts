import type { EditState, TagOption } from "./types";
import { NO_TAGS_FILTER_OPTION } from "./types";

import type { ReportingPeriodWritePayload } from "./types";

export type ReportingPeriodUpdatePayload = ReportingPeriodWritePayload;

export function parseTagSlugs(value: string): string[] {
  return value
    ? value.split(/[\s,]+/).map((tagSlug) => tagSlug.trim()).filter(Boolean)
    : [];
}

export function buildTagLabelBySlug(tagOptions: TagOption[]): Record<string, string> {
  return tagOptions.reduce<Record<string, string>>((labelsBySlug, tagOption) => {
    labelsBySlug[tagOption.slug] = tagOption.label ?? tagOption.slug;
    return labelsBySlug;
  }, {});
}

export function companyMatchesTagFilter(
  companyTags: string[] | undefined,
  selectedFilterTags: string[]
): boolean {
  if (selectedFilterTags.length === 0) return true;

  const companyTagSlugs = Array.isArray(companyTags) ? companyTags : [];
  const includeNoTags = selectedFilterTags.includes(NO_TAGS_FILTER_OPTION);
  const wantedTagSlugs = selectedFilterTags.filter((tagSlug) => tagSlug !== NO_TAGS_FILTER_OPTION);

  if (includeNoTags && companyTagSlugs.length === 0) return true;
  if (wantedTagSlugs.length === 0) return false;
  return wantedTagSlugs.some((tagSlug) => companyTagSlugs.includes(tagSlug));
}

/** When `excludeTagSlugs` is non-empty, reject companies that have any of those tags. */
export function companyPassesExcludeTagFilter(
  companyTags: string[] | undefined,
  excludeTagSlugs: string[]
): boolean {
  if (!excludeTagSlugs.length) return true;
  const companyTagSlugs = Array.isArray(companyTags) ? companyTags : [];
  return !excludeTagSlugs.some((slug) => companyTagSlugs.includes(slug));
}

export function buildReportingPeriodUpdatePayload(
  editState: EditState,
  value: string,
  verified?: boolean
): ReportingPeriodUpdatePayload | null {
  if (!editState.startDate || !editState.endDate || editState.field === "tags") {
    return null;
  }

  const payload: ReportingPeriodUpdatePayload = {
    startDate: editState.startDate,
    endDate: editState.endDate,
  };

  if (editState.companyReportId) {
    payload.companyReportId = editState.companyReportId;
  }

  if (editState.field === "reportURL") {
    payload.reportURL = value || undefined;
    return payload;
  }

  const parsedNumber = value === "" ? null : Number(value);

  if (editState.field === "scope1") {
    payload.emissions = {
      scope1: {
        total: parsedNumber,
        unit: "tCO2e",
        verified,
      },
    };
    return payload;
  }

  if (editState.field === "scope2") {
    payload.emissions = {
      scope2: {
        mb: parsedNumber,
        lb: null,
        unknown: null,
        unit: "tCO2e",
        verified,
      },
    };
    return payload;
  }

  if (editState.field === "economy") {
    payload.economy = {
      turnover: { value: parsedNumber, currency: "SEK", verified },
    };
    return payload;
  }

  return null;
}
