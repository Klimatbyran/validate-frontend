import type { CompanyRow, DataPointMetric } from './types';

/** Trigger CSV download for overview metrics. */
export function exportOverviewCsv(
  metrics: DataPointMetric[],
  selectedYear: number
): void {
  const headers = [
    'Data Point',
    'Identical',
    'Rounding',
    'Small Error',
    'Hallucination',
    'Missing',
    'Unit Error',
    'Category Error',
    'Error',
    'Both Empty',
    'With Data',
    'Tolerant Rate %',
  ];
  const csvRows = [headers.join(',')];

  for (const dp of metrics) {
    csvRows.push(
      [
        `"${dp.label}"`,
        dp.breakdown.identical,
        dp.breakdown.rounding,
        dp.breakdown.smallError,
        dp.breakdown.hallucination,
        dp.breakdown.missing,
        dp.breakdown.unitError,
        dp.breakdown.categoryError,
        dp.breakdown.error,
        dp.breakdown.bothNull,
        dp.withAnyData,
        dp.tolerantRate.toFixed(1),
      ].join(',')
    );
  }

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `overview-${selectedYear}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Trigger CSV download for comparison rows. */
export function exportComparisonToCsv(
  rows: CompanyRow[],
  dataPointId: string,
  year: number
): void {
  const headers = [
    'Company',
    'WikidataId',
    'Stage',
    'Prod',
    'Diff',
    'Status',
    'In Stage',
    'In Prod',
  ];
  const csvRows = [headers.join(',')];

  for (const row of rows) {
    csvRows.push(
      [
        `"${row.name.replace(/"/g, '""')}"`,
        row.wikidataId,
        row.stageValue ?? '',
        row.prodValue ?? '',
        row.diff ?? '',
        row.discrepancy,
        row.inStage ? 'yes' : 'no',
        row.inProd ? 'yes' : 'no',
      ].join(',')
    );
  }

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${dataPointId}-comparison-${year}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
