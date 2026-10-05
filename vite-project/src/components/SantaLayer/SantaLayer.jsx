import { useEffect, useRef } from "react";
import gsap from "gsap";
import { useSanta } from "../../context/SantaContext.jsx";
import { useCart } from "../../context/CartContext.jsx";

// santa.webp is 374×360; keep the same aspect ratio.
const SANTA_H = 95;
const SANTA_W = Math.round((SANTA_H * 374) / 360);
const SANTA_SRC = `${import.meta.env.BASE_URL}santa/santa.webp`;
const HOME_GAP = 16;
// Pointer must rest on a card this long before Santa walks over (avoids chasing quick fly-bys).
const HOVER_DELAY_MS = 210;
const LEAVE_DELAY_MS = 180;

const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Santa with his gift sack. Rests in the bottom-right corner (click → open cart); when a product
// card is hovered (for HOVER_DELAY_MS) he hops onto the top-right of its Add button, and added products fly into his sack.
export default function SantaLayer({ onOpenCart }) {
  const { register } = useSanta();
  const rootRef = useRef(null);
  const figureRef = useRef(null);
  const bagRef = useRef(null);
  const badgeRef = useRef(null);
  const anchorRef = useRef(null);
  const hoverTimer = useRef(null);
  const leaveTimer = useRef(null);
  const cancelLeave = useRef(() => {});
  const scheduleLeave = useRef(() => {});
  const { totalCount: count } = useCart();

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const home = () => ({
      // clientWidth excludes the scrollbar.
      x: document.documentElement.clientWidth - SANTA_W - HOME_GAP,
      y: window.innerHeight - SANTA_H - HOME_GAP,
    });

    const target = () => {
      const r = anchorRef.current?.getBoundingClientRect();
      if (!r || !anchorRef.current.isConnected) return home();
      // Boots on the Add button's top edge, at its right end.
      return { x: r.right - SANTA_W + 12, y: r.top - SANTA_H + 8 };
    };

    const moveTo = (ease = "power3.out") => {
      const t = target();
      gsap.to(root, {
        x: t.x,
        y: t.y,
        duration: reducedMotion() ? 0 : 0.5,
        ease,
        overwrite: "auto",
      });
    };

    // Pop in at home.
    const h = home();
    gsap.set(root, { x: h.x, y: h.y + 40, autoAlpha: 0 });
    gsap.to(root, {
      y: h.y,
      autoAlpha: 1,
      duration: 0.6,
      delay: 0.3,
      ease: "back.out(1.8)",
    });

    const hoverCard = (anchorEl) => {
      clearTimeout(leaveTimer.current);
      clearTimeout(hoverTimer.current);
      if (anchorRef.current === anchorEl) return;
      hoverTimer.current = setTimeout(() => {
        anchorRef.current = anchorEl;
        moveTo();
      }, HOVER_DELAY_MS);
    };

    const leaveCard = () => {
      clearTimeout(hoverTimer.current);
      clearTimeout(leaveTimer.current);
      leaveTimer.current = setTimeout(() => {
        anchorRef.current = null;
        moveTo("power2.inOut");
      }, LEAVE_DELAY_MS);
    };

    // Moving the pointer from the card onto Santa himself shouldn't send him home.
    cancelLeave.current = () => clearTimeout(leaveTimer.current);
    scheduleLeave.current = () => {
      if (anchorRef.current) leaveCard();
    };

    // Keep Santa glued to his spot while Lenis scrolls, the card lifts, or the window resizes.
    const follow = () => {
      if (gsap.isTweening(root)) return;
      const t = target();
      gsap.set(root, { x: t.x, y: t.y });
    };
    gsap.ticker.add(follow);

    const flyToBag = (imgEl) => {
      const bag = bagRef.current;
      if (!bag || !imgEl) return;
      const from = imgEl.getBoundingClientRect();
      const size = Math.min(from.width, from.height, 140);

      const clone = imgEl.cloneNode(false);
      clone.removeAttribute("loading");
      Object.assign(clone.style, {
        position: "fixed",
        left: "0px",
        top: "0px",
        width: `${size}px`,
        height: `${size}px`,
        objectFit: "cover",
        borderRadius: "12px",
        zIndex: 9999,
        pointerEvents: "none",
        transform: "none",
        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
      });
      document.body.appendChild(clone);

      const startX = from.left + (from.width - size) / 2;
      const startY = from.top + (from.height - size) / 2;

      const done = () => {
        clone.remove();
        // Little "caught it!" squash-and-stretch on Santa.
        gsap.fromTo(
          figureRef.current,
          { scaleX: 1, scaleY: 1 },
          {
            keyframes: [
              { scaleX: 1.08, scaleY: 0.9, duration: 0.1, ease: "power2.out" },
              { scaleX: 0.96, scaleY: 1.06, duration: 0.12, ease: "power2.out" },
              { scaleX: 1, scaleY: 1, duration: 0.2, ease: "back.out(2)" },
            ],
          },
        );
        if (badgeRef.current)
          gsap.fromTo(
            badgeRef.current,
            { scale: 1.6 },
            { scale: 1, duration: 0.3, ease: "back.out(3)" },
          );
      };
      if (reducedMotion()) {
        done();
        return;
      }

      // Quadratic arc toward the sack, re-aimed every frame since Santa may still be moving.
      const p = { t: 0 };
      gsap.to(p, {
        t: 1,
        duration: 0.75,
        ease: "power1.inOut",
        onUpdate: () => {
          const to = bag.getBoundingClientRect();
          const endX = to.left + to.width / 2 - size / 2;
          const endY = to.top + to.height / 2 - size / 2;
          const ctrlX = (startX + endX) / 2;
          const ctrlY = Math.min(startY, endY) - 120;
          const u = 1 - p.t;
          gsap.set(clone, {
            x: u * u * startX + 2 * u * p.t * ctrlX + p.t * p.t * endX,
            y: u * u * startY + 2 * u * p.t * ctrlY + p.t * p.t * endY,
            scale: 1 - 0.8 * p.t,
            opacity: p.t > 0.8 ? 1 - (p.t - 0.8) * 3 : 1,
          });
        },
        onComplete: done,
      });
    };

    const unregister = register({ hoverCard, leaveCard, flyToBag });
    return () => {
      clearTimeout(hoverTimer.current);
      clearTimeout(leaveTimer.current);
      gsap.ticker.remove(follow);
      gsap.killTweensOf(root);
      unregister();
    };
  }, [register]);

  return (
    <div
      ref={rootRef}
      className="pointer-events-none fixed top-0 left-0 z-60 invisible"
      style={{ width: SANTA_W, height: SANTA_H }}
    >
      <button
        type="button"
        onClick={onOpenCart}
        onMouseEnter={() => cancelLeave.current()}
        onMouseLeave={() => scheduleLeave.current()}
        aria-label={count > 0 ? `Open cart (${count} items)` : "Open cart"}
        title="Open cart"
        className="pointer-events-auto block h-full w-full cursor-pointer rounded-xl border-0 bg-transparent p-0 transition-transform duration-200 hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400"
      >
        <img
          ref={figureRef}
          src={SANTA_SRC}
          alt=""
          width={SANTA_W}
          height={SANTA_H}
          draggable="false"
          className="block h-full w-full drop-shadow-[0_6px_10px_rgba(0,0,0,0.55)]"
          style={{ transformOrigin: "50% 100%" }}
        />
      </button>

      {/* Drop target: the opening of Santa's gift sack (top-right of the image). */}
      <div
        ref={bagRef}
        className="pointer-events-none absolute"
        style={{
          left: "70%",
          top: "6%",
          width: "22%",
          height: "22%",
        }}
      >
        {count > 0 && (
          <span
            ref={badgeRef}
            className="absolute -top-3 -right-3 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold-400 px-1 text-[0.65rem] font-bold text-[#04120a] shadow-[0_2px_6px_rgba(0,0,0,0.5)]"
          >
            {count}
          </span>
        )}
      </div>
    </div>
  );
}
