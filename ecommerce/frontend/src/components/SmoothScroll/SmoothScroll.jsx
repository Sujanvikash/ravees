import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// A refresh must start the page (and the hero's frame 1) from the top. Without this the browser
// restores the old scroll position after React has already reset it, landing mid-animation.
if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
  window.addEventListener("beforeunload", () => window.scrollTo(0, 0));
}

/**
 * App-wide smooth scrolling. Lenis and ScrollTrigger share GSAP's single
 * requestAnimationFrame loop, so scroll updates match the display's refresh rate.
 * Must be rendered inside the Router.
 */
const SmoothScroll = ({ children }) => {
  const lenisRef = useRef(null);
  const { pathname } = useLocation();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenisRef.current = lenis;

    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0); // keeps the scrub in sync with scroll

    return () => {
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33); // back to GSAP's defaults
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  // New page: start at the top, then let ScrollTrigger re-measure the layout.
  useEffect(() => {
    if (lenisRef.current) lenisRef.current.scrollTo(0, { immediate: true, force: true });
    else window.scrollTo(0, 0);
    const id = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  return children;
};

export default SmoothScroll;