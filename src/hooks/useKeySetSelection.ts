import { useCallback, useEffect, useState } from "react";

type RowWithKey = { key: string };

export function useKeySetSelection<T extends RowWithKey>(options?: {
  resetWhen?: unknown;
}) {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSelectedKeys(new Set());
  }, [options?.resetWhen]);

  const toggleSelect = useCallback((row: T) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(row.key)) next.delete(row.key);
      else next.add(row.key);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback((rows: T[]) => {
    setSelectedKeys((prev) => {
      const allSelected =
        rows.length > 0 && rows.every((row) => prev.has(row.key));
      if (allSelected) return new Set();
      return new Set(rows.map((row) => row.key));
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedKeys(new Set());
  }, []);

  const selectedFrom = useCallback(
    (rows: T[]) => rows.filter((row) => selectedKeys.has(row.key)),
    [selectedKeys],
  );

  return {
    selectedKeys,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    selectedFrom,
  };
}
