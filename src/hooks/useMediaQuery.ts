import { useEffect, useState } from "react";

/** Tracks whether a CSS media query currently matches, updating live on
 * resize — for layout decisions a plain Tailwind breakpoint can't make on
 * its own, since those only toggle classes rather than which components
 * get mounted (e.g. choosing between an inline split-view panel and a
 * full-screen modal for the same content). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches,
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}
