import { useEffect, useRef } from "react";
import gsap from "gsap";
import { useSanta } from "../../context/SantaContext.jsx";
import { useCart } from "../../context/CartContext.jsx";
import SantaFigure from "./SantaFigure.jsx";

const SANTA_SIZE = 65; // px; the SVG is square (viewBox 120×120)
// Landmarks in SantaFigure's 120-unit viewBox, used to place him by what's actually drawn
// (the square box has empty margins around the figure).
const UNIT = SANTA_SIZE / 120;
const GROUND_Y = 118; // bottom of the boots
const FEET_CX = 65; // centre between the boots; he turns (flips) around this so his feet stay put
const FEET_RIGHT = 85; // right edge of the boots (same in either facing, since he flips around FEET_CX)
const REACH_RIGHT = 119; // right-most drawn point in either facing (the sack when facing left)
const BUTTON_INSET = 4; // px his boots sit inside the Add button's right edge
const HOME_GAP = 16;
const WALK_SPEED = 600; // px per second
const STEP = 0.16; // seconds per quarter of a walk cycle
// Pointer must rest on a card this long before Santa walks over (avoids chasing quick fly-bys).
const HOVER_DELAY_MS = 210;
const LEAVE_DELAY_MS = 180;

// Pivot points (SVG user units) for each animated part of SantaFigure.
const PIVOTS = {
  ".s-bob": "64 118",
  ".s-sack": "37 108",
  ".s-legB": "55.5 98",
  ".s-legF": "72.5 98",
  ".s-body": "64 100",
  ".s-head": "66 60",
  ".s-eyes": "66 43",
  ".s-pom": "95 28",
  ".s-armB": "46 61",
  ".s-armF": "86 63", // shoulder
  ".s-armUp": "86 63",
  ".s-fore": "88 75", // elbow
  ".s-hand": "94 85", // wrist
};

const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Santa with his gift sack. Rests in the bottom-right corner (click → open cart); when a product
// card is hovered (for HOVER_DELAY_MS) he walks to the top-right of its Add button, and added
// products fly into his sack.
export default function SantaLayer({ onOpenCart }) {
  const { register } = useSanta();
  const rootRef = useRef(null);
  const flipRef = useRef(null);
  const mouthRef = useRef(null);
  const badgeRef = useRef(null);
  const anchorRef = useRef(null);
  const hoverTimer = useRef(null);
  const leaveTimer = useRef(null);
  const cancelLeave = useRef(() => {});
  const scheduleLeave = useRef(() => {});
  const poke = useRef(() => {});
  const { totalCount: count } = useCart();

  useEffect(() => {
    const root = rootRef.current;
    const flip = flipRef.current;
    if (!root || !flip) return undefined;

    const rm = reducedMotion();
    const part = (sel) => root.querySelector(sel);
    const bob = part(".s-bob");
    const sack = part(".s-sack");
    const legB = part(".s-legB");
    const legF = part(".s-legF");
    const body = part(".s-body");
    const head = part(".s-head");
    const eyes = part(".s-eyes");
    const pom = part(".s-pom");
    const armB = part(".s-armB");
    const armF = part(".s-armF");
    const armUp = part(".s-armUp");
    const fore = part(".s-fore");
    const hand = part(".s-hand");
    const limbs = [legB, legF, armB, armF, sack, pom, bob];

    Object.entries(PIVOTS).forEach(([sel, origin]) =>
      gsap.set(part(sel), { svgOrigin: origin }),
    );

    const home = () => ({
      // clientWidth excludes the scrollbar.
      x: document.documentElement.clientWidth - HOME_GAP - REACH_RIGHT * UNIT,
      y: window.innerHeight - HOME_GAP - GROUND_Y * UNIT,
    });

    const target = () => {
      const r = anchorRef.current?.getBoundingClientRect();
      if (!r || !anchorRef.current.isConnected) return home();
      // Boots on the Add button's top edge, at its right end.
      return { x: r.right - BUTTON_INSET - FEET_RIGHT * UNIT, y: r.top - GROUND_Y * UNIT };
    };

    // ---- Facing: 1 = right, -1 = left. Tweening the CSS var gives a quick "turn around" squish.
    let facing = -1;
    gsap.set(flip, { "--face": facing });
    const face = (dir) => {
      if (dir === facing) return;
      facing = dir;
      gsap.to(flip, { "--face": dir, duration: rm ? 0 : 0.22, ease: "power2.inOut" });
    };

    // ---- Idle: breathing + slow head nod, and a blink every few seconds.
    const idle = rm
      ? null
      : gsap
          .timeline({ repeat: -1, yoyo: true, defaults: { duration: 1.4, ease: "sine.inOut" } })
          .to(body, { scaleY: 1.03, scaleX: 0.99 }, 0)
          .to(head, { y: -0.9, rotation: 1.5 }, 0);
    let blinkCall;
    const blink = () => {
      gsap.to(eyes, { scaleY: 0.1, duration: 0.07, yoyo: true, repeat: 1, ease: "power1.in" });
      blinkCall = gsap.delayedCall(gsap.utils.random(2.2, 5.5), blink);
    };
    if (!rm) blinkCall = gsap.delayedCall(1.5, blink);

    // ---- Walk cycle: legs/arms swing opposite, body bobs and rocks, sack and pom-pom sway.
    const walkCycle = gsap.timeline({ paused: true, repeat: -1 });
    const swing = (el, prop, values) =>
      walkCycle.to(
        el,
        { keyframes: values.map((v) => ({ [prop]: v, duration: STEP, ease: "sine.inOut" })) },
        0,
      );
    swing(legB, "rotation", [22, 0, -22, 0]);
    swing(legF, "rotation", [-22, 0, 22, 0]);
    swing(armB, "rotation", [-10, 0, 10, 0]);
    swing(armF, "rotation", [12, 0, -12, 0]);
    swing(sack, "rotation", [-5, 0, 5, 0]);
    swing(pom, "rotation", [12, 0, -12, 0]);
    swing(bob, "rotation", [2.5, 0, -2.5, 0]);
    swing(bob, "y", [1.5, -1.5, 1.5, 0]);

    let walking = false;
    let walkTween, settleTween, waveTween, turnHome;

    // "Hi!": lift the elbow out to the side with the forearm pointing up, then rock the forearm
    // from the elbow (slightly outward <-> slightly inward). The hand stays straight in line with
    // the forearm so they move as one piece. The pom-pom swings out of the hand's way.
    const WAVE_ROCK = [-71, -97, -71, -97, -84];
    const wave = () =>
      gsap
        .timeline({ delay: 0.2 })
        .to(armUp, { rotation: -65, duration: 0.3, ease: "back.out(1.6)" }, 0)
        .to(fore, { rotation: -84, duration: 0.3, ease: "back.out(1.6)" }, 0)
        .to(hand, { rotation: -31, duration: 0.3, ease: "power2.out" }, 0)
        .to(pom, { rotation: -30, duration: 0.3, ease: "power2.out" }, 0)
        .to(fore, {
          keyframes: WAVE_ROCK.map((r) => ({ rotation: r, duration: 0.17, ease: "sine.inOut" })),
        })
        .to([armUp, fore, hand, pom], { rotation: 0, duration: 0.35, ease: "power2.inOut" }, "+=0.1");

    const arrive = () => {
      if (rm) return;
      gsap.fromTo(
        bob,
        { scaleX: 1.06, scaleY: 0.92 },
        { scaleX: 1, scaleY: 1, duration: 0.35, ease: "back.out(3)" },
      );
      if (anchorRef.current) waveTween = wave();
      // Back in his corner he turns to face the page.
      else turnHome = gsap.delayedCall(0.25, () => face(-1));
    };

    const walkTo = () => {
      const sx = gsap.getProperty(root, "x");
      const sy = gsap.getProperty(root, "y");
      const t0 = target();
      const dist = Math.hypot(t0.x - sx, t0.y - sy);

      walkTween?.kill();
      settleTween?.kill();
      waveTween?.kill();
      turnHome?.kill();
      if (Math.abs(t0.x - sx) > 4) face(t0.x < sx ? -1 : 1);

      if (rm || dist < 4) {
        gsap.set(root, t0);
        arrive();
        return;
      }

      walking = true;
      if (!walkCycle.isActive()) walkCycle.restart();
      gsap.to([armUp, fore, hand], { rotation: 0, duration: 0.15, ease: "power2.out" });

      const p = { t: 0 };
      walkTween = gsap.to(p, {
        t: 1,
        duration: gsap.utils.clamp(0.45, 1.5, dist / WALK_SPEED),
        ease: "power1.inOut",
        // Re-aim every frame: the card may move (scroll, hover lift) while he walks.
        onUpdate: () => {
          const t = target();
          gsap.set(root, { x: sx + (t.x - sx) * p.t, y: sy + (t.y - sy) * p.t });
        },
        onComplete: () => {
          walking = false;
          walkCycle.pause();
          settleTween = gsap.to(limbs, { rotation: 0, y: 0, duration: 0.2, ease: "power2.out" });
          arrive();
        },
      });
    };

    // Pop in at home.
    const h = home();
    gsap.set(root, { x: h.x, y: h.y + 40, autoAlpha: 0 });
    gsap.to(root, { y: h.y, autoAlpha: 1, duration: 0.6, delay: 0.3, ease: "back.out(1.8)" });

    const hoverCard = (anchorEl) => {
      clearTimeout(leaveTimer.current);
      clearTimeout(hoverTimer.current);
      if (anchorRef.current === anchorEl) return;
      hoverTimer.current = setTimeout(() => {
        anchorRef.current = anchorEl;
        walkTo();
      }, HOVER_DELAY_MS);
    };

    const leaveCard = () => {
      clearTimeout(hoverTimer.current);
      clearTimeout(leaveTimer.current);
      leaveTimer.current = setTimeout(() => {
        anchorRef.current = null;
        walkTo();
      }, LEAVE_DELAY_MS);
    };

    // Moving the pointer from the card onto Santa himself shouldn't send him home.
    cancelLeave.current = () => clearTimeout(leaveTimer.current);
    scheduleLeave.current = () => {
      if (anchorRef.current) leaveCard();
    };

    // Click: a little wiggle (the cart opens at the same time).
    poke.current = () => {
      if (rm || walking) return;
      gsap.to(bob, {
        keyframes: [-6, 6, -3, 0].map((r) => ({ rotation: r, duration: 0.08 })),
        ease: "sine.inOut",
      });
    };

    // Keep Santa glued to his spot while Lenis scrolls, the card lifts, or the window resizes.
    const follow = () => {
      if (walking || gsap.isTweening(root)) return;
      gsap.set(root, target());
    };
    gsap.ticker.add(follow);

    const clones = new Set();
    const flyToBag = (imgEl) => {
      const mouth = mouthRef.current;
      if (!mouth || !imgEl) return;
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
      clones.add(clone);

      const startX = from.left + (from.width - size) / 2;
      const startY = from.top + (from.height - size) / 2;

      const done = () => {
        clone.remove();
        clones.delete(clone);
        if (rm) return;
        // Sack gulps the gift; Santa does a happy hop (unless he's mid-walk).
        gsap.fromTo(sack, { scale: 1.15 }, { scale: 1, duration: 0.5, ease: "elastic.out(1, 0.4)" });
        if (!walking)
          gsap
            .timeline()
            .to(bob, { y: -10, scaleX: 0.96, scaleY: 1.05, duration: 0.18, ease: "power2.out" })
            .to(bob, { y: 0, scaleX: 1, scaleY: 1, duration: 0.3, ease: "bounce.out" });
        if (badgeRef.current)
          gsap.fromTo(badgeRef.current, { scale: 1.6 }, { scale: 1, duration: 0.3, ease: "back.out(3)" });
      };
      if (rm) {
        done();
        return;
      }

      // Quadratic arc toward the sack's mouth, re-aimed every frame since Santa may be walking.
      const p = { t: 0 };
      gsap.to(p, {
        t: 1,
        duration: 0.75,
        ease: "power1.inOut",
        onUpdate: () => {
          const to = mouth.getBoundingClientRect();
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
      idle?.kill();
      walkCycle.kill();
      blinkCall?.kill();
      [walkTween, settleTween, waveTween, turnHome].forEach((t) => t?.kill());
      gsap.killTweensOf([root, flip, ...root.querySelectorAll("[class^='s-']")]);
      clones.forEach((c) => c.remove());
      unregister();
    };
  }, [register]);

  return (
    <div
      ref={rootRef}
      className="pointer-events-none fixed top-0 left-0 z-60 invisible"
      style={{ width: SANTA_SIZE, height: SANTA_SIZE }}
    >
      <button
        type="button"
        onClick={() => {
          poke.current();
          onOpenCart?.();
        }}
        onMouseEnter={() => cancelLeave.current()}
        onMouseLeave={() => scheduleLeave.current()}
        aria-label={count > 0 ? `Open cart (${count} items)` : "Open cart"}
        title="Open cart"
        className="pointer-events-auto block h-full w-full cursor-pointer rounded-xl border-0 bg-transparent p-0 transition-transform duration-200 hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400"
      >
        <div
          ref={flipRef}
          className="relative h-full w-full drop-shadow-[0_6px_10px_rgba(0,0,0,0.45)]"
          style={{
            transform: "scaleX(var(--face, 1))",
            transformOrigin: `${(FEET_CX / 120) * 100}% 50%`,
          }}
        >
          <SantaFigure mouthRef={mouthRef} />

          {/* Cart count on the sack; counter-flipped so the digits never mirror. */}
          {count > 0 && (
            <span
              className="absolute"
              style={{ left: "6%", top: "28%", transform: "scaleX(var(--face, 1))" }}
            >
              <span
                ref={badgeRef}
                className="flex h-5 min-w-5 items-center justify-center rounded-full bg-gold-400 px-1 text-[0.65rem] font-bold text-[#04120a] shadow-[0_2px_6px_rgba(0,0,0,0.5)]"
              >
                {count}
              </span>
            </span>
          )}
        </div>
      </button>
    </div>
  );
}
