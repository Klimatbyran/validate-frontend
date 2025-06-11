import FloatingLabelInput from "../floating-input";
import FloatingLabelTextarea from "../floating-textarea";
import { Goal } from "./GoalValidation";
import React from "react";

interface EditableGoalProps {
  goal: Goal;
  updateGoal: (goal: Goal) => void;
}

const EditableGoal = ({
  goal,
  updateGoal,
} : EditableGoalProps) => {
  const toogleStoring = (e: React.ChangeEvent<HTMLInputElement>) => {
    goal.willBeStored = e.target.checked;
    updateGoal(goal);
  };

  return (
    <div
      className={`flex flex-col border p-3 w-1/2 ${
        goal.new ? "ms-auto" : ""
      } ${goal.willBeStored ? "opacity-100" : "opacity-50"} rounded-md bg-gray-04`}
    >
      <div className="flex gap-2">
        <input
          type="checkbox"
          defaultChecked={goal.willBeStored}
          onChange={toogleStoring}
        ></input>
        <FloatingLabelInput
          id="1"
          label="Target"
          className="9/10"
          value={goal.target?.toString() ?? ""}
          onChange={(e) => {}}
          icon={<span className="text-lg">%</span>}
        />
      </div>
      <div className="flex gap-2">
        <FloatingLabelInput
          id="1"
          label="Base Year"
          className="w-1/2"
          value={goal.baseYear ?? ""}
          onChange={(e) => {}}
        />
        <FloatingLabelInput
          id="1"
          label="Year"
          className="w-1/2"
          value={goal.year ?? ""}
          onChange={(e) => {}}
        />
      </div>
      <FloatingLabelTextarea
        id="3"
        label="Description"
        value={goal.description ?? ""}
        onChange={(e) => {}}
      />
    </div>
  );
};

export default EditableGoal;
