import { ReportingPeriod } from "@/lib/types";
import { ValidationData } from "./Validation";
import { EditableReportingPeriod } from "./EditableReportingPeriod";

interface ReportingPeriodsData {
  reportingPeriods: ReportingPeriod[];
}

interface ReportingperiodsValidationProps {
  data: ValidationData<ReportingPeriodsData>;
}

const getReportedYears = (
  newReportingPeriods: ReportingPeriod[],
  oldReportingPeriods: ReportingPeriod[] = []
): number[] => {
  const years: number[] = [];
  for (const newReportingPeriod of newReportingPeriods) {
    years.push((new Date(newReportingPeriod.endDate)).getFullYear());
  }
  for (const oldReportingPeriod of oldReportingPeriods) {
    const year = (new Date(oldReportingPeriod.endDate)).getFullYear();
    if(!years.includes(year))
      years.push(year);
  }
  return years;
};

const findReportingPeriod = (
  year: number,
  reportingPeriods: ReportingPeriod[] = []
) => {
  return reportingPeriods.find(
    (reportingPeriod) =>
      new Date(reportingPeriod.endDate).getFullYear() === year
  );
};

export const reportingperiodsValidation = ({
  data,
}: ReportingperiodsValidationProps) => {
  const years = getReportedYears(
    data.newValue?.reportingPeriods,
    data.oldValue?.reportingPeriods
  );

  return (
    <div>
      {years.map((year) => (
        <EditableReportingPeriod
          year={year}
          key={`reporting-period-tab-${year}`}
          oldReportingPeriod={findReportingPeriod(
            year,
            data.oldValue?.reportingPeriods
          )}
          newReportingPeriod={findReportingPeriod(
            year,
            data.newValue?.reportingPeriods
          )}
        />
      ))}
    </div>
  );
};
