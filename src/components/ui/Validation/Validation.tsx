import { baseYearValidation } from "./BaseYearValidation"
import { goalValidation } from "./GoalValidation"
import { initiativeValidation } from "./InitativeValidation"
import { reportingperiodsValidation } from "./ReportingPeriodValidation"

const ValidationSubComponents = {
  initiatives: initiativeValidation,
  baseYear: baseYearValidation,
  goals: goalValidation,
  "reporting-periods": reportingperiodsValidation
}

export interface ValidationData<T> {
  oldValue?: T
  newValue: T
}

interface ValidationProps {
  data: ValidationData<any>,
  type: string
}

export const Validation = ({ data, type} : ValidationProps) => {
  const SubComponent = ValidationSubComponents[type as keyof typeof ValidationSubComponents];
  
  if(!SubComponent) {
    return <div>No validation representation found for {type}</div>
  }

  return <SubComponent data={data} />
}