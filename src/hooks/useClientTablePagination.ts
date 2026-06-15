import { useEffect, useMemo, useState } from "react";

export const CLIENT_TABLE_PAGE_SIZE = 50;

export function useClientTablePagination<T>(rows: T[]) {
  const [page, setPage] = useState(1);
  const [showAll, setShowAll] = useState(false);

  const totalRows = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / CLIENT_TABLE_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    setPage(1);
  }, [rows]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageRows = useMemo(() => {
    if (showAll || totalRows === 0) return rows;
    const start = (safePage - 1) * CLIENT_TABLE_PAGE_SIZE;
    return rows.slice(start, start + CLIENT_TABLE_PAGE_SIZE);
  }, [rows, showAll, safePage, totalRows]);

  const from =
    totalRows === 0
      ? 0
      : showAll
        ? 1
        : (safePage - 1) * CLIENT_TABLE_PAGE_SIZE + 1;
  const to = showAll
    ? totalRows
    : Math.min(safePage * CLIENT_TABLE_PAGE_SIZE, totalRows);

  return {
    pageRows,
    page: safePage,
    totalPages,
    totalRows,
    from,
    to,
    showAll,
    setPage,
    setShowAll,
    canPaginate: totalRows > CLIENT_TABLE_PAGE_SIZE,
  };
}
