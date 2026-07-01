import React, { type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import type { CompanyReportShellGroup } from "../../lib/company-report-shells";
import { ReportShellGroupHeader } from "./ReportShellGroupHeader";

export function ReportShellCollapsibleGroup({
  shell,
  periodCount,
  children,
  defaultOpen = true,
}: {
  shell: CompanyReportShellGroup;
  periodCount: number;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);

  const onToggle = React.useCallback(
    (e: React.SyntheticEvent<HTMLDetailsElement>) => {
      if (!(e.nativeEvent as Event).isTrusted) return;
      setOpen(e.currentTarget.open);
    },
    [],
  );

  return (
    <details
      open={open}
      onToggle={onToggle}
      className="group/shell rounded-lg border border-gray-03/50 overflow-hidden w-full min-w-0 bg-gray-04/30"
    >
      <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden hover:bg-gray-04/60 transition-colors">
        <div className="flex items-start gap-2 px-3 py-3 min-w-0">
          <ChevronRight
            className={`w-4 h-4 shrink-0 text-gray-02 mt-0.5 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
            aria-hidden
          />
          <div className="flex-1 min-w-0">
            <ReportShellGroupHeader shell={shell} periodCount={periodCount} />
          </div>
        </div>
      </summary>
      <div className="space-y-3 p-3 pt-0 bg-gray-05/40 border-t border-gray-03/40">
        {children}
      </div>
    </details>
  );
}
