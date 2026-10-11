import type {
  DataPointObservation,
  HistoryYearValue,
  SuspicionFinding,
} from "../types";

type FindingIdentityFields = Omit<
  SuspicionFinding,
  | "id"
  | "rule"
  | "severity"
  | "score"
  | "messageKey"
  | "messageParams"
  | "comparisons"
  | "historySeries"
>;

/** Shared company / data-point identity fields copied onto every finding. */
export function observationFindingFields(
  observation: DataPointObservation,
): FindingIdentityFields {
  return {
    companyId: observation.companyId,
    companyName: observation.companyName,
    wikidataId: observation.wikidataId,
    tags: observation.tags,
    dataYear: observation.dataYear,
    reportYear: observation.reportYear,
    reportUrl: observation.reportUrl,
    dataPointId: observation.dataPointId,
    dataPointLabel: observation.dataPointLabel,
    value: observation.value,
    unit: observation.unit,
    origin: observation.origin,
    verifiedByName: observation.verifiedByName,
    sourceReference: observation.sourceReference,
    sourcePageUrl: observation.sourcePageUrl,
    extractionSource: observation.extractionSource,
    priorComment: observation.priorComment,
  };
}

export function historySeriesFromObservations(
  series: DataPointObservation[],
  flaggedYear: number,
): HistoryYearValue[] {
  return [...series]
    .sort((a, b) => a.dataYear - b.dataYear)
    .map((observation) => ({
      year: observation.dataYear,
      value: observation.value,
      isFlagged: observation.dataYear === flaggedYear,
    }));
}
