import { PenIcon } from "lucide-react";
import FloatingLabelInput from "../floating-input";
import { ValidationData } from "./Validation";
import { useState } from "react";

interface BaseYearData {
  baseYear: number;
}

interface BaseYearValidationProps {
  data: ValidationData<BaseYearData>
}
export const baseYearValidation = ({data} : BaseYearValidationProps) => {
  const [useNewValue, setUseNewValue] = useState<boolean>(true);
  const [newBaseYear, setNewBaseYear] = useState<string>(data.newValue?.baseYear?.toString() ?? "");


  return (
  <div className={`flex flex-row gap-4 mt-3 justify-between items-center`}>
    <div className={`flex gap-2 w-1/2 ${useNewValue ? "opacity-70" : "opacity-100"}`}>
      <input type="radio" name="baseYear" value={"old"} onClick={() => setUseNewValue(false)}></input>
      <FloatingLabelInput disabled={true} id="base-year-old" label="Old Base Year" value={data.oldValue?.baseYear?.toString() ?? ""} onChange={() => {}}/>
    </div>
    <div className={`flex gap-2 w-1/2 ${useNewValue ? "opacity-100" : "opacity-70"}`}>
      <input type="radio" name="baseYear" value={"new"} defaultChecked={true} onClick={() => setUseNewValue(true)}></input>
      <FloatingLabelInput id="base-year-new" icon={<PenIcon/>} label="New Base Year" value={newBaseYear ?? ""} onChange={(newBaseYear) => setNewBaseYear(newBaseYear.target.value)}/>
    </div>
  </div>
  );
}