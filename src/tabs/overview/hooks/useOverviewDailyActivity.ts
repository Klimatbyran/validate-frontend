import { useCallback, useEffect, useState } from "react";
import { fetchOverviewDailyActivity } from "../lib/overview-api";
import type { OverviewDailyActivityResponse } from "../lib/overview-types";

/** Local calendar day as YYYY-MM-DD (browser timezone). */
export function localCalendarDay(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function useOverviewDailyActivity(initialDay = localCalendarDay()) {
  const [day, setDay] = useState(initialDay);
  const [activity, setActivity] =
    useState<OverviewDailyActivityResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (selectedDay: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchOverviewDailyActivity(selectedDay);
      setActivity(response);
    } catch (err) {
      setActivity(null);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(day);
  }, [day, load]);

  return {
    day,
    setDay,
    activity,
    isLoading,
    error,
    refresh: () => load(day),
  };
}
