import { useEffect, useState } from "react";
import FloatingLabelInput from "../floating-input";
import { EmissionUnits, EmployeesUnits } from "@/lib/types";
import FloatingLabelSelect from "../floating-select";

interface ReportingPeriodRowProps {
  nameSuffix: string;
  labelSuffix: string;
  oldValue?: string | null | number;
  newValue?: string | null | number;
  oldUnit?: string;
  newUnit?: string;
  defaultNew: boolean;
  type?: "text" | "date" | "number";
  onChange: (value: string) => void;
}

const transformToString = (value?: string | null | number) => {
  if (value == null) {
    return "";
  } else if(typeof value === "number") {
    return value.toString();
  }
  return value;
}

const ValueField = ({
  	nameSuffix,
    labelSuffix,
    selected,
    value,
    unit,
    type,
    isNew,
    setSelected,
    updateValue
}: {
  nameSuffix: string;
  labelSuffix: string;
  selected: boolean;
  value: string;
  unit?: string;
  type: "text" | "date" | "number";
  isNew: boolean;
  setSelected?: (selected: boolean) => void;
  updateValue?: (value: string) => void;
}) => {
  let units: string[] = [];
  console.log(value);
  console.log(unit);
  if(unit) {
    units = EmissionUnits.includes(unit) ? EmissionUnits : EmployeesUnits;
  }
  const unitOptions = units.reduce((acc, unit) => {return {...acc, [unit]: unit}}, {} as Record<string, string>);
  const keyPrefix = isNew ? "new" : "old";
  const labelPrefix = isNew ? "New" : "Old";

  return <div className="flex gap-2 w-1/2" key={`row-old-${nameSuffix}`}>
        <input
          type="radio"
          defaultChecked={selected}
          name={`toggle-${nameSuffix}`}
          id={`${keyPrefix}-toggle-${nameSuffix}`}
          key={`${keyPrefix}-toggle-${nameSuffix}`}
          onChange={(e) => {setSelected && setSelected(!e.target.checked)}}
        />
        <FloatingLabelInput
          label={`${labelPrefix} ${labelSuffix}`}
          value={value}
          disabled={!isNew}
          type={type}
          id={`${keyPrefix}-${nameSuffix}`}
          key={`${keyPrefix}-${nameSuffix}`}
          onChange={(value) => {updateValue && updateValue(value)}}
        />
        {unit && units.length > 0 &&
        <FloatingLabelSelect
          label={``}
          id={`${keyPrefix}-unit-${nameSuffix}`}
          selected={unit}
          disabled={!isNew}
          className="w-1/3"
          values={unitOptions}
          onChange={() => {}}
        />}
        {unit && units.length === 0 &&
        <FloatingLabelInput          
          label={``}
          value={unit}
          className="w-1/3"
          disabled={!isNew}
          type={"text"}
          id={`${keyPrefix}-unit-${nameSuffix}`}
          key={`${keyPrefix}-unit-${nameSuffix}`}
        />}
      </div>
}


export function ReportingPeriodRow({
  nameSuffix,
  labelSuffix,
  oldValue,
  oldUnit,
  newValue,
  newUnit,
  defaultNew,
  type = "text",
  onChange
}: ReportingPeriodRowProps) {
  const [changedValue, setChangedValue] = useState<string>(transformToString(newValue));
  const [selectedNew, setSelectedNew] = useState<boolean>(defaultNew);

  useEffect(() => {
    if(selectedNew) {
      onChange(changedValue);
    } else {
      onChange(transformToString(oldValue) ?? "");
    }
  }, [changedValue, selectedNew]);


  return (
    <div className="flex gap-4" key={`row-${nameSuffix}`}>
      <ValueField
       labelSuffix={labelSuffix}
       nameSuffix={nameSuffix}
       isNew={false}
       value={transformToString(oldValue)}
       type={type}
       unit={oldUnit}
       updateValue={() => {}}
       setSelected={() => {}}
       selected={!selectedNew}      
      />
      <ValueField
       labelSuffix={labelSuffix}
       nameSuffix={nameSuffix}
       isNew={true}
       value={transformToString(newValue)}
       type={type}
       unit={newUnit}
       updateValue={() => {}}
       setSelected={() => {}}
       selected={selectedNew}      
      />
    </div>
  );
}
