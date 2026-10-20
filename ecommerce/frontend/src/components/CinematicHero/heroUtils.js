import { useMediaQuery } from "../../hooks/useMediaQuery.js";

export const clamp01 = (v) => Math.min(1, Math.max(0, v));

/** Where `p` is between `start` and `end`, as 0 → 1 (clamped). */
export const range = (p, start, end) => clamp01((p - start) / (end - start));

/** Ease in and out, so fades start and finish softly instead of with a visible kink. */
export const smooth = (t) => t * t * (3 - 2 * t);

export const usePrefersReducedMotion = () => useMediaQuery("(prefers-reduced-motion: reduce)");
