import type { ReactNode } from "react";

export function EmissionsEditRow({
  name,
  headerName,
  noHover,
  children,
}: {
  name: ReactNode;
  headerName?: boolean;
  noHover?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`flex ps-4 rounded-s-lg items-stretch min-w-max ${
        noHover ? "" : "hover:bg-gray-04/50"
      }`}
    >
      <div
        className={`shrink-0 w-60 py-2 pr-2 flex flex-col justify-center ${
          headerName
            ? "text-sm font-semibold text-gray-01"
            : "text-sm font-medium ps-2 text-gray-01"
        }`}
      >
        {name}
      </div>
      <div className="flex shrink-0">{children}</div>
    </div>
  );
}

export function Scope2TopBracket() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="28"
      height="28"
      viewBox="0 0 36 36"
      className="shrink-0 text-gray-02"
      aria-hidden
    >
      <rect x="18" y="18" width="2" height="18" fill="currentColor" />
      <rect x="10" y="18" width="10" height="2" fill="currentColor" />
    </svg>
  );
}

export function Scope2BottomBracket() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="28"
      height="28"
      viewBox="0 0 36 36"
      className="shrink-0 text-gray-02"
      aria-hidden
    >
      <rect x="18" y="0" width="2" height="18" fill="currentColor" />
      <rect x="10" y="18" width="10" height="2" fill="currentColor" />
    </svg>
  );
}

/** Fixed width per period so vertical borders align across reporting + emissions sections. */
const emissionsPeriodColBox =
  "box-border w-72 min-w-72 max-w-72 shrink-0 ms-2 border-r border-gray-03";

export const emissionsFieldCellClass = `${emissionsPeriodColBox} flex items-center gap-1 py-2 min-h-[44px] min-w-0`;

export const emissionsPeriodHeaderCellClass = `${emissionsPeriodColBox} flex py-2 items-center justify-end gap-2 min-h-9 min-w-0`;

export const emissionsPeriodEmptyCellClass = `${emissionsPeriodColBox} py-2 min-h-[36px] min-w-0`;

