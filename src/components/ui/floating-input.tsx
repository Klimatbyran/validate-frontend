import { LucideIcon, PenIcon } from "lucide-react";
import React, { ReactNode }  from "react";
interface FloatingLabelInputProps {
  label: string;
  id: string;
  type?: string;
  value: string;
  className?: string;
  disabled?: boolean;
  icon?: ReactNode;
  onChange?: (value: string) => void;
}

const FloatingLabelInput = ({
  label,
  id,
  type = "text",
  value,
  className,
  disabled,
  icon,
  onChange
}: FloatingLabelInputProps) => {
   return (
    <div className={`relative w-full my-3 ${className}`}>
      <label
        htmlFor={id}
        className="absolute -top-3 left-3 px-1 text-sm text-white bg-gray-04 z-5 peer-focus:text-blue-500"
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        defaultValue={value}
        onChange={(e) => onChange && onChange(e.target.value)}
        disabled={disabled != null ? disabled : false}
        className="peer block w-full px-3 pt-3 pb-2 text-sm text-white border bg-gray-04 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
      {(icon && <div className="absolute right-3 top-0 opacity-20 h-[42px] flex items-center text-xs">
        {icon}
      </div>)}
    </div>
  );
};

export default FloatingLabelInput;