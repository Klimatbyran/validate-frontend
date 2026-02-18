import React from "react";

export interface DataCardProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Shared card for scope/Economy data in the job details modal.
 * Same styling as Economy and Scope 1/2 cards (gray background, theme text).
 */
export function DataCard({
  icon,
  title,
  children,
  className = "",
}: DataCardProps) {
  return (
    <div
      className={`bg-gray-03 rounded-2xl p-8 border border-gray-03 shadow-sm hover:shadow-md transition-all duration-200 w-full md:flex-1 min-h-[200px] flex flex-col justify-center ${className}`}
    >
      <div className="flex items-center space-x-2 mb-2">
        {icon}
        <span className="font-semibold text-lg text-gray-01">{title}</span>
      </div>
      {children}
    </div>
  );
}
