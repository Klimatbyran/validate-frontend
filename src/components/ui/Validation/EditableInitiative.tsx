import { Scopes } from "@/lib/types";
import FloatingLabelInput from "../floating-input";
import FloatingLabelSelect from "../floating-select";
import FloatingLabelTextarea from "../floating-textarea";
import { Initiative } from "./InitativeValidation";
import React from "react";

interface EditableInitiativeProps {
  initiative: Initiative;
  updateInitiative: (initiative: Initiative) => void;
}

const EditableInitiative = ({
  initiative,
  updateInitiative,
} : EditableInitiativeProps) => {
  const toogleStoring = (e: React.ChangeEvent<HTMLInputElement>) => {
    initiative.willBeStored = e.target.checked;
    updateInitiative(initiative);
  };

  return (
    <div
      className={`flex flex-col border p-3 w-1/2 ${
        initiative.new ? "ms-auto" : ""
      } ${initiative.willBeStored ? "opacity-100" : "opacity-50"} rounded-md bg-gray-04`}
    >
      <div className="flex gap-2">
        <input
          type="checkbox"
          defaultChecked={initiative.willBeStored}
          onChange={toogleStoring}
        ></input>
        <FloatingLabelInput
          id="1"
          label="Title"
          className="9/10"
          value={initiative.title ?? ""}
          onChange={(e) => {}}
        />
      </div>
      <div className="flex gap-2">
        <FloatingLabelSelect
          id="2"
          label="Scope"
          className="w-4/5"
          selected={initiative.scope}
          values={Scopes}
          onChange={(e) => {}}
        />
        <FloatingLabelInput
          id="1"
          label="Year"
          className="w-1/5"
          value={initiative.year ?? ""}
          onChange={(e) => {}}
        />
      </div>
      <FloatingLabelTextarea
        id="3"
        label="Description"
        value={initiative.description ?? ""}
        onChange={(e) => {}}
      />
    </div>
  );
};

export default EditableInitiative;
