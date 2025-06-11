import { Button } from "../button";
import EditableGoal from "./EditableGoal";
import EditableInitiative from "./EditableInitiative";
import { ValidationData } from "./Validation";
import { useState } from "react";

export interface Goal {
  id?: number;
  description?: string;
  target?: number;
  baseYear?: string;
  year?: string
  new?: boolean;
  willBeStored?: boolean;
}

interface GoalData {
  goals: Goal[]
}

interface GoalValidationProps {
  data: ValidationData<GoalData>
}

interface GoalPair {
  oldGoal?: Goal,
  newGoal?: Goal
}

const similarInitative = (newGoal: Goal, oldGoal: Goal) => {
  return newGoal.baseYear === oldGoal.baseYear && newGoal.year === oldGoal.year;
}

const joinInitiatives = (newGoals: Goal[] = [], oldGoals: Goal[] = []) => {
  const goalPairs: GoalPair[] = [];

  for(const newGoal of newGoals) {
    newGoal.new = true;
    newGoal.willBeStored = true;
    const oldGoal = oldGoals.find(goal => similarInitative(newGoal, goal));
    if(oldGoal) {
      oldGoal.new = false;
      oldGoal.willBeStored = false;
    }
    goalPairs.push({oldGoal, newGoal});
  }

  for(const oldGoal of oldGoals) {
    if(!goalPairs.find(pair => pair.oldGoal?.id === oldGoal.id)) {
      oldGoal.new = false;
      oldGoal.willBeStored = true;      
      goalPairs.push({oldGoal});
    }    
  } 

  goalPairs.sort((a, b) => {
    const aComparable = a.newGoal ?? a.oldGoal;
    const bComparable = b.newGoal ?? b.oldGoal;
    if(aComparable?.year !== bComparable?.year) {
      return (aComparable?.year || '').localeCompare(bComparable?.year || '');
    }
    if(aComparable?.baseYear !== bComparable?.baseYear) {
      return (aComparable?.baseYear || '').localeCompare(bComparable?.baseYear || '');
    }
    return aComparable?.new ? 1 : -1;
  });

  return goalPairs;
}

const flattenIniativePairs = (goalPairs: GoalPair[]) => {
  const goals: Goal[] = [];
  for(const goalPair of goalPairs) {
    if(goalPair.newGoal)
      goals.push(goalPair.newGoal);
    if(goalPair.oldGoal)
      goals.push(goalPair.oldGoal);
  }
  return goals;
}



export const goalValidation = ({data} : GoalValidationProps) => {
  const [goalPairs, updateGoalPairs] = useState<GoalPair[]>(joinInitiatives(data.newValue?.goals, data.oldValue?.goals));

  const updateGoal = (goal: Goal) => {
    const index = goalPairs.findIndex(goalPairI => goalPairI.newGoal?.id === goal.id || goalPairI.oldGoal?.id === goal.id);
    if(index !== -1) {
      if(goalPairs[index].newGoal?.id === goal.id) {
        goalPairs[index].newGoal = goal;
      } else {
        goalPairs[index].oldGoal = goal;
      }
      updateGoalPairs([...goalPairs]);
    }
  }

  const addGoal = () => {
    goalPairs.push({ newGoal: {
      id: goalPairs.length,
      new: true,
      willBeStored: true,
      description: '',
      baseYear: '',
      target: 0,
      year: '',
    }});
    updateGoalPairs([...goalPairs]);
  }

  return (
  <div className="flex flex-col gap-2 mt-3 overflow-scroll h-[400px]">
    <div className="flex gap-2 py-1 rounded-sm font-bold sticky z-10 bg-gray-03 top-0 z-10">
      <div className="w-1/2 text-center">Old</div>
      <div className="w-1/2 text-center">New</div>
    </div>
    {goalPairs.map((goalPair) => 
      <div key={`initative-pair-${goalPair.newGoal?.id}-${goalPair.oldGoal?.id}`} className="flex gap-2">
        {goalPair.oldGoal && <EditableGoal key={`EditableInitative ${goalPair.oldGoal.id}`} goal={goalPair.oldGoal} updateGoal={updateGoal} />}
        {!goalPair.oldGoal && <div className="w-1/2 h-100 flex items-center justify-center italic opacity-50">Nothing to compare to it</div>}
        {goalPair.newGoal && <EditableGoal key={`EditableInitative ${goalPair.newGoal.id}`} goal={goalPair.newGoal} updateGoal={updateGoal} />}
        {!goalPair.newGoal && <div className="w-1/2 h-100 flex items-center justify-center italic opacity-50">No update</div>}
      </div>
    )}
    <Button className="w-full" variant={"secondary"} size={"sm"} onClick={addGoal}>Add Missing Initiative</Button>
  </div>
  );
}