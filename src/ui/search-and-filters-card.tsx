import type { ReactNode } from "react";
import { ChevronDown, ChevronRight, Search } from "lucide-react";

export function SearchAndFiltersCard({
  title,
  icon,
  open,
  onOpenChange,
  children,
  after,
}: {
  title: ReactNode;
  icon?: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  after?: ReactNode;
}) {
  return (
    <div className="bg-gray-04/50 rounded-lg p-4 border border-gray-03 flex flex-col gap-4">
      <details
        open={open}
        onToggle={(e) => onOpenChange((e.target as HTMLDetailsElement).open)}
        className="group"
      >
        <summary className="flex items-center gap-2 px-0 py-1 cursor-pointer list-none text-gray-01 font-medium hover:text-gray-02 select-none">
          {open ? (
            <ChevronDown className="w-4 h-4 text-gray-02" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-02" />
          )}
          {icon ?? <Search className="w-4 h-4 text-gray-02" />}
          {title}
        </summary>

        <div className="pt-4 space-y-4 border-t border-gray-03/50 mt-2">{children}</div>
      </details>

      {after}
    </div>
  );
}

