import type { ReactNode } from "react";

/** Same idea as coverage tables: scroll inside a fixed frame instead of growing the page. */
export const SUMMARY_TABLE_MAX_HEIGHT_PX = 320;
export const SUMMARY_GAP_TABLE_MAX_HEIGHT_PX = 360;

export function SummarySection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-blue-03 uppercase tracking-wide">
          {title}
        </h3>
        {description ? (
          <p className="text-xs text-gray-02 mt-1 max-w-3xl">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function CountTable({
  headers,
  rows,
  maxHeightPx = SUMMARY_TABLE_MAX_HEIGHT_PX,
}: {
  headers: string[];
  rows: Array<Array<string | number>>;
  maxHeightPx?: number;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-gray-02">—</p>;
  }

  return (
    <div
      className="overflow-auto rounded-lg border border-gray-03"
      style={{ maxHeight: maxHeightPx }}
    >
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 z-10 bg-gray-05 text-left text-xs uppercase tracking-wide text-gray-02 shadow-[inset_0_-1px_0_0] shadow-gray-03">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-3 py-2 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={`${row[0]}-${index}`}
              className="border-t border-gray-03/80 text-gray-01"
            >
              {row.map((cell, cellIndex) => (
                <td key={`${index}-${cellIndex}`} className="px-3 py-2">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
