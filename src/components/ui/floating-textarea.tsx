import React, { useState } from "react";
interface FloatingLabelTextareaProps {
  label: string;
  id: string;
  type?: string;
  value: string;
  className?: string;
  rows?: number;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

const FloatingLabelTextarea = ({
  label,
  id,
  value,
  className,
  rows,
  onChange
}: FloatingLabelTextareaProps) => {
   return (
    <div className={`relative w-full my-3 ${className}`}>
      {/* Floating label positioned with padding/gap for transparency */}
      <label
        htmlFor={id}
        className="absolute -top-3 left-3 px-1 text-sm text-white bg-gray-04 z-5 peer-focus:text-blue-500"
      >
        {label}
      </label>

      {/* Input field with border separation visible under the label */}
      <textarea
        id={id}
        rows={rows ?? 4}
        defaultValue={value}
        onChange={onChange}
        className="peer block w-full px-3 pt-3 pb-2 text-sm text-white border bg-gray-04 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >

      </textarea>
    </div>
  );
};

export default FloatingLabelTextarea;