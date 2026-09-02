import { useEffect, useState } from "react";

export function useElapsedMs(
  startedAt: number | null,
  finishedAt: number | null,
): number | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!startedAt || finishedAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [startedAt, finishedAt]);

  if (!startedAt) return null;
  return (finishedAt ?? now) - startedAt;
}
