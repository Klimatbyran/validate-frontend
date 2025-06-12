import { Button } from "../button";
import EditableInitiative from "./EditableInitiative";
import { ValidationData } from "./Validation";
import { useState } from "react";

export interface Initiative {
  id?: number;
  description?: string;
  scope?: string;
  title?: string;
  year?: string
  new?: boolean;
  willBeStored?: boolean;
}

interface InitiativeData {
  initiatives: Initiative[]
}

interface InitiativeValidationProps {
  data: ValidationData<InitiativeData>
}

interface InitiativePair {
  oldInitiative?: Initiative,
  newInitiative?: Initiative
}

const similarInitative = (newInitiative: Initiative, oldInitiative: Initiative) => {
  return newInitiative.scope === oldInitiative.scope && newInitiative.year === oldInitiative.year && newInitiative.title === oldInitiative.title;
}

const joinInitiatives = (newInitiatives: Initiative[], oldInitiatives: Initiative[] = []) => {
  const initiativePairs: {
    oldInitiative?: Initiative,
    newInitiative?: Initiative
  }[] = [];

  for(const newInitiative of newInitiatives) {
    newInitiative.new = true;
    newInitiative.willBeStored = true;
    const oldInitiative = oldInitiatives.find(initiative => similarInitative(newInitiative, initiative));
    if(oldInitiative) {
      oldInitiative.new = false;
      oldInitiative.willBeStored = false;
    }
    initiativePairs.push({oldInitiative, newInitiative});
  }

  for(const oldInitiative of oldInitiatives) {
    if(!initiativePairs.find(pair => pair.oldInitiative?.id === oldInitiative.id)) {
      oldInitiative.new = false;
      oldInitiative.willBeStored = true;      
      initiativePairs.push({oldInitiative});
    }    
  } 

  initiativePairs.sort((a, b) => {
    const aComparable = a.newInitiative ?? a.oldInitiative;
    const bComparable = b.newInitiative ?? b.oldInitiative;
    const scopeOrder = { scope1: 0, scope2: 1, scope3: 2, biogenic: 3 };
    if (aComparable?.scope !== bComparable?.scope) {
      return (scopeOrder[aComparable?.scope as keyof typeof scopeOrder] || 0) - (scopeOrder[bComparable?.scope as keyof typeof scopeOrder] || 0);
    }
    if(aComparable?.year !== bComparable?.year) {
      return (aComparable?.year || '').localeCompare(bComparable?.year || '');
    }
    if(aComparable?.title !== bComparable?.title) {
      return (aComparable?.title || '').localeCompare(bComparable?.title || '');
    }
    return aComparable?.new ? 1 : -1;
  });

  return initiativePairs;
}

const flattenIniativePairs = (initiativePairs: InitiativePair[]) => {
  const initiatives: Initiative[] = [];
  for(const initiativePair of initiativePairs) {
    if(initiativePair.newInitiative)
      initiatives.push(initiativePair.newInitiative);
    if(initiativePair.oldInitiative)
      initiatives.push(initiativePair.oldInitiative);
  }
  return initiatives;
}



export const initiativeValidation = ({data} : InitiativeValidationProps) => {
  const [initiativePairs, updateInitiativePairs] = useState<InitiativePair[]>(joinInitiatives(data.newValue?.initiatives, data.oldValue?.initiatives));

  const updateInitiative = (initiative: Initiative) => {
    const index = initiativePairs.findIndex(initiativePairI => initiativePairI.newInitiative?.id === initiative.id || initiativePairI.oldInitiative?.id === initiative.id);
    if(index !== -1) {
      if(initiativePairs[index].newInitiative?.id === initiative.id) {
        initiativePairs[index].newInitiative = initiative;
      } else {
        initiativePairs[index].oldInitiative = initiative;
      }
      updateInitiativePairs([...initiativePairs]);
    }
  }

  const addInitiative = () => {
    initiativePairs.push({ newInitiative: {
      id: initiativePairs.length,
      new: true,
      willBeStored: true,
      description: '',
      title: '',
      year: '',
      scope: '',
    }});
    updateInitiativePairs([...initiativePairs]);
  }

  return (
  <div className="flex flex-col gap-2 mt-3 overflow-scroll h-[400px]">
    <div className="flex gap-2 py-1 rounded-sm font-bold sticky z-10 bg-gray-03 top-0 z-10">
      <div className="w-1/2 text-center">Old</div>
      <div className="w-1/2 text-center">New</div>
    </div>
    {initiativePairs.map((initiativePair) => 
      <div key={`initative-pair-${initiativePair.newInitiative?.id}-${initiativePair.oldInitiative?.id}`} className="flex gap-2">
        {initiativePair.oldInitiative && <EditableInitiative key={`EditableInitative ${initiativePair.oldInitiative.id}`} initiative={initiativePair.oldInitiative} updateInitiative={updateInitiative} />}
        {!initiativePair.oldInitiative && <div className="w-1/2 h-100 flex items-center justify-center italic opacity-50">Nothing to compare to it</div>}
        {initiativePair.newInitiative && <EditableInitiative key={`EditableInitative ${initiativePair.newInitiative.id}`} initiative={initiativePair.newInitiative} updateInitiative={updateInitiative} />}
        {!initiativePair.newInitiative && <div className="w-1/2 h-100 flex items-center justify-center italic opacity-50">No update</div>}
      </div>
    )}
    <Button className="w-full" variant={"secondary"} size={"sm"} onClick={addInitiative}>Add Missing Initiative</Button>
  </div>
  );
}