import { useEffect, useState } from "react";

export const clamp01 = (v) => Math.min(1, Math.max(0, v));

/** Where `p` is between `start` and `end`, as 0 → 1 (clamped). */
export const range = (p, start, end) => clamp01((p - start) / (end - start));

/** Ease in and out, so fades start and finish softly instead of with a visible kink. */
export const smooth = (t) => t * t * (3 - 2 * t);

/** True while the media query matches; follows resizes and rotation. */
export const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  return matches;
};

export const usePrefersReducedMotion = () => useMediaQuery("(prefers-reduced-motion: reduce)");
