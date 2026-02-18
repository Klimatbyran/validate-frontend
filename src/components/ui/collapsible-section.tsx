import React from "react";
import { ChevronRight } from "lucide-react";

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  /** Accent for icon circle and title only; container stays neutral */
  accentIconBg: string;
  accentTextColor: string;
  /** When true, section starts expanded (and remains user-togglable) */
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function CollapsibleSection({
  title,
  icon,
  accentIconBg,
  accentTextColor,
  defaultOpen = false,
  children,
  className = "",
}: CollapsibleSectionProps) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <details
      open={open}
      onToggle={() => setOpen((prev) => !prev)}
      className={`group/details bg-gray-04 border border-gray-03 rounded-lg mb-4 max-w-full overflow-x-auto ${className}`}
      style={{ padding: 0 }}
    >
      <summary
        className={`text-lg font-medium ${accentTextColor} flex items-center cursor-pointer px-4 py-2 select-none list-none rounded-t-lg hover:bg-gray-03/30 transition-colors [&::-webkit-details-marker]:hidden`}
      >
        <span
          className={`flex items-center justify-center w-8 h-8 rounded-full ${accentIconBg} mr-2 [&>svg]:w-4 [&>svg]:h-4`}
        >
          {icon}
        </span>
        <span className="flex-1">{title}</span>
        <ChevronRight
          className={`rotate-when-open w-5 h-5 shrink-0 text-gray-02 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
          aria-hidden
        />
      </summary>
      <div className="px-4 pb-4 pt-2 text-gray-01 bg-gray-04 rounded-b-lg">
        {children}
      </div>
    </details>
  );
} 