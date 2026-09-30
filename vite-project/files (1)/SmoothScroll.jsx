import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * App-wide smooth scrolling. Lenis and ScrollTrigger share GSAP's single
 * requestAnimationFrame loop, which runs at the display's refresh rate
 * (60, 90, 120 or 144 Hz) with no extra timers.
 */
export default function SmoothScroll({ children }) {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    const lenis = new Lenis({
      lerp: 0.1, // lower = floatier, higher = snappier
      smoothWheel: true,
      // Touch keeps the native OS momentum; it already feels right on phones.
    });

    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0); // never "catch up" by skipping; keeps scrub in sync

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);

  return children;
}
