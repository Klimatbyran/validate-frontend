import type { ReactNode } from "react";

export function QuickEditSectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="text-xs font-semibold text-gray-02 uppercase tracking-wide mb-2">
      {children}
    </div>
  );
}
