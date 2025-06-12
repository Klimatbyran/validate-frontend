interface FloatingLabelSelectProps {
  label: string;
  id: string;
  type?: string;
  values: Record<string | number, string>;
  selected?: string;
  className?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

const FloatingLabelSelect = ({
  label,
  id,
  values,
  selected,
  disabled,
  className,
  onChange
}: FloatingLabelSelectProps) => {
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
      <select
        id={id}
        defaultValue={selected}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="peer block w-full px-3 pt-3 pb-2 text-sm text-white border bg-gray-04 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        {Object.entries(values).map(([key, label]) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </select>
    </div>
  );
};

export default FloatingLabelSelect;