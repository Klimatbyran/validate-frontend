import { ReportingPeriod } from "@/lib/types";
import { createEmptyReportingPeriod } from "@/lib/utils";
import { useState } from "react";
import FloatingLabelInput from "../floating-input";
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { ReportingPeriodRow } from "./ReportingPeriodRow";

interface EditableReportingPeriodProps {
  oldReportingPeriod?: ReportingPeriod;
  newReportingPeriod?: ReportingPeriod;
  year: number;
}

export function EditableReportingPeriod({
  oldReportingPeriod,
  newReportingPeriod,
  year,
}: EditableReportingPeriodProps) {
  const [extended, setExtended] = useState(false);

  return (
    <div className="bg-gray-03/40 p-2 my-2 rounded-lg">
      <div
        className="flex items-center cursor-pointer"
        onClick={() => setExtended(!extended)}
      >
        {extended ? <ChevronDown /> : <ChevronRight />}
        <div className="flex items-center justify-between w-full">
          {year}
          {newReportingPeriod !== undefined && <AlertCircle />}
        </div>
      </div>

      {extended && (
        <div className="mt-4 flex flex-col ps-2 gap-2">
          <h3>General</h3>
          <ReportingPeriodRow
            nameSuffix={`start-date-${year}`}
            labelSuffix="Start Date"
            type="date"
            oldValue={oldReportingPeriod?.startDate}
            newValue={newReportingPeriod?.startDate}
            defaultNew={newReportingPeriod !== undefined}
            onChange={() => {}}
          />
          <ReportingPeriodRow
            nameSuffix={`end-date-${year}`}
            labelSuffix="End Date"
            type="date"
            oldValue={oldReportingPeriod?.endDate}
            newValue={newReportingPeriod?.endDate}
            defaultNew={newReportingPeriod !== undefined}
            onChange={() => {}}
          />
          <h3>Scope 1</h3>
          <ReportingPeriodRow
            nameSuffix={`scope1-${year}`}
            labelSuffix="Scope 1"
            type="text"
            oldValue={oldReportingPeriod?.emissions.scope1?.total}
            oldUnit={oldReportingPeriod?.emissions.scope1?.unit}
            newValue={newReportingPeriod?.emissions.scope1?.total}
            newUnit={newReportingPeriod?.emissions.scope1?.unit}
            defaultNew={newReportingPeriod !== undefined}
            onChange={() => {}}
          />
          <h3>Scope 2</h3>
          <ReportingPeriodRow
            nameSuffix={`scope2-mb-${year}`}
            labelSuffix="Scope 2 MB"
            type="text"
            oldValue={oldReportingPeriod?.emissions.scope2?.mb}
            oldUnit={oldReportingPeriod?.emissions.scope2?.unit}
            newValue={newReportingPeriod?.emissions.scope2?.mb}
            newUnit={newReportingPeriod?.emissions.scope2?.unit}
            defaultNew={newReportingPeriod !== undefined}
            onChange={() => {}}
          />
          <ReportingPeriodRow
            nameSuffix={`scope2-lb-${year}`}
            labelSuffix="Scope 2 LB"
            type="text"
            oldValue={oldReportingPeriod?.emissions.scope2?.lb}
            oldUnit={oldReportingPeriod?.emissions.scope2?.unit}
            newValue={newReportingPeriod?.emissions.scope2?.lb}
            newUnit={newReportingPeriod?.emissions.scope2?.unit}
            defaultNew={newReportingPeriod !== undefined}
            onChange={() => {}}
          />
          <ReportingPeriodRow
            nameSuffix={`scope2-unknown-${year}`}
            labelSuffix="Scope 2 Unknown"
            type="text"
            oldValue={oldReportingPeriod?.emissions.scope2?.unknown}
            oldUnit={oldReportingPeriod?.emissions.scope2?.unit}
            newValue={newReportingPeriod?.emissions.scope2?.unknown}
            newUnit={newReportingPeriod?.emissions.scope2?.unit}
            defaultNew={newReportingPeriod !== undefined}
            onChange={() => {}}
          />
        </div>
      )}
    </div>
  );
}
