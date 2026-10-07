import React from "react";

/** Client-side paging for an already-filtered row list. */
export function useClientPagination<T>(rows: T[], pageSize: number) {
  const [page, setPage] = React.useState(1);
  const [showAll, setShowAll] = React.useState(false);

  const totalRows = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

  // Filters changing under a deep page would otherwise leave an empty table.
  React.useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const safePage = Math.min(page, totalPages);
  const start = showAll ? 0 : (safePage - 1) * pageSize;
  const end = showAll ? totalRows : start + pageSize;

  return {
    pageRows: rows.slice(start, end),
    page: safePage,
    totalPages,
    totalRows,
    from: totalRows === 0 ? 0 : start + 1,
    to: Math.min(end, totalRows),
    showAll,
    canPaginate: totalRows > pageSize,
    setPage,
    setShowAll,
  };
}
