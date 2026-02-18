import React from "react";

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  /** Accent for icon circle and title only; container stays neutral */
  accentIconBg: string;
  accentTextColor: string;
  children: React.ReactNode;
  className?: string;
}

export function CollapsibleSection({
  title,
  icon,
  accentIconBg,
  accentTextColor,
  children,
  className = "",
}: CollapsibleSectionProps) {
  return (
    <details
      className={`bg-gray-04/50 border border-gray-03 rounded-lg mb-4 max-w-full overflow-x-auto ${className}`}
      style={{ padding: 0 }}
    >
      <summary
        className={`text-lg font-medium ${accentTextColor} flex items-center cursor-pointer px-4 py-2 select-none list-none`}
      >
        <span
          className={`flex items-center justify-center w-8 h-8 rounded-full ${accentIconBg} mr-2 [&>svg]:w-4 [&>svg]:h-4`}
        >
          {icon}
        </span>
        {title}
      </summary>
      <div className="px-4 pb-4 pt-2 text-gray-01">
        {children}
      </div>
    </details>
  );
} 