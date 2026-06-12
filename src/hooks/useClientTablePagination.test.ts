import { renderHook, act } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  CLIENT_TABLE_PAGE_SIZE,
  useClientTablePagination,
} from "./useClientTablePagination";

describe("useClientTablePagination", () => {
  const rows = Array.from({ length: 120 }, (_, index) => ({ id: index }));

  it("returns the first page by default", () => {
    const { result } = renderHook(() => useClientTablePagination(rows));

    expect(result.current.pageRows).toHaveLength(CLIENT_TABLE_PAGE_SIZE);
    expect(result.current.page).toBe(1);
    expect(result.current.from).toBe(1);
    expect(result.current.to).toBe(CLIENT_TABLE_PAGE_SIZE);
  });

  it("shows all rows when show all is enabled", () => {
    const { result } = renderHook(() => useClientTablePagination(rows));

    act(() => {
      result.current.setShowAll(true);
    });

    expect(result.current.pageRows).toHaveLength(120);
    expect(result.current.showAll).toBe(true);
  });

  it("resets to page 1 when the row list changes", () => {
    const { result, rerender } = renderHook(
      ({ data }) => useClientTablePagination(data),
      { initialProps: { data: rows } },
    );

    act(() => {
      result.current.setPage(3);
    });
    expect(result.current.page).toBe(3);

    rerender({ data: rows.slice(0, 10) });

    expect(result.current.page).toBe(1);
    expect(result.current.pageRows).toHaveLength(10);
  });
});
