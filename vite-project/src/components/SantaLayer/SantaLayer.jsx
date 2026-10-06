import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import gsap from "gsap";
import { Bell, BellOff, X } from "lucide-react";
import { useSanta } from "../../context/SantaContext.jsx";
import { useCart } from "../../context/CartContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { useRequireLogin } from "../../auth/useRequireLogin.js";
import { useCustomerAuth } from "../../auth/context/CustomerAuthContext.jsx";
import SantaFigure from "./SantaFigure.jsx";
import SantaBubble from "./SantaBubble.jsx";
import { loadPrefs, savePrefs } from "./santaPrefs.js";
import { getSeason } from "./santaSeason.js";
import { playJingle, playJingleBells } from "./santaSound.js";
import { burstConfetti } from "./santaConfetti.js";
import { suggestFor } from "./santaSuggest.js";

const SIZE_DESKTOP = 65; // px; the SVG is square (viewBox 120×120)
const SIZE_PHONE = 52; // smaller on phones so he never covers much of the page
const GAP_DESKTOP = 16; // gap from the screen corner
const GAP_PHONE = 12;
// Landmarks in SantaFigure's 120-unit viewBox, used to place him by what's actually drawn
// (the square box has empty margins around the figure).
const GROUND_Y = 118; // bottom of the boots
const FEET_CX = 65; // centre between the boots; he turns (flips) around this so his feet stay put
const FEET_RIGHT = 85; // right edge of the boots (same in either facing, since he flips around FEET_CX)
const REACH_RIGHT = 119; // right-most drawn point in either facing (the sack when facing left)
const BUTTON_INSET = 4; // px his boots sit inside the Add button's right edge
const WALK_SPEED = 600; // px per second
const STEP = 0.16; // seconds per quarter of a walk cycle
// Pointer must rest on a card this long before Santa walks over (avoids chasing quick fly-bys).
const HOVER_DELAY_MS = 210;
const LEAVE_DELAY_MS = 180;
const IDLE_AFTER_MS = 20000; // no pointer/scroll/key activity this long → an idle moment
const IDLE_REPEAT_MS = 25000; // and at most one idle moment this often
const BUBBLE_MS = 5000; // how long a speech bubble stays up
// Pages with forms where he'd be in the way. He still appears on checkout to celebrate a sent request.
const HIDDEN_ROUTES = ["/checkout", "/login", "/signup"];

// Pivot points (SVG user units) for each animated part of SantaFigure.
const PIVOTS = {
  ".s-bob": "64 118",
  ".s-sackGrow": "37 108",
  ".s-sack": "37 108",
  ".s-extra1": "22 33",
  ".s-extra2": "52 32",
  ".s-legB": "55.5 98",
  ".s-legF": "72.5 98",
  ".s-body": "64 100",
  ".s-head": "66 60",
  ".s-eyes": "66 43",
  ".s-mouth": "67 58.5",
  ".s-hat": "68 30",
  ".s-pom": "95 28",
  ".s-armB": "46 61",
  ".s-armF": "86 63", // shoulder
  ".s-armUp": "86 63",
  ".s-fore": "88 75", // elbow
  ".s-hand": "94 85", // wrist
};

const matches = (query) => typeof window !== "undefined" && window.matchMedia(query).matches;
const reducedMotion = () => matches("(prefers-reduced-motion: reduce)");
const canHover = () => matches("(hover: hover) and (pointer: fine)");
const isLowEnd = () =>
  typeof navigator !== "undefined" &&
  ((navigator.hardwareConcurrency ?? 8) <= 4 || (navigator.deviceMemory ?? 8) <= 4);
const overlayIsOpen = () =>
  typeof document !== "undefined" && document.documentElement.classList.contains("overflow-hidden");

function useMediaQuery(query) {
  const [match, setMatch] = useState(() => matches(query));
  useEffect(() => {
    const list = window.matchMedia(query);
    const onChange = () => setMatch(list.matches);
    list.addEventListener("change", onChange);
    return () => list.removeEventListener("change", onChange);
  }, [query]);
  return match;
}

// Santa with his gift sack. Rests in the bottom-right corner (click → open cart). Hovering a product
// card (for HOVER_DELAY_MS) makes him walk to the top-right of its Add button and wave; added
// products fly into his sack and he answers in a speech bubble. He reacts to sign-in prompts,
// removed items and sent requests, follows the cursor with his eyes, has idle moments, can be
// minimised to a small sack, and steps aside for forms, drawers and modals.
export default function SantaLayer({ onOpenCart }) {
  const { register } = useSanta();
  const { totalCount: cartCount } = useCart();
  const { isAuthenticated } = useCustomerAuth();
  // The cart stays saved in the browser after logout, but it isn't visible while signed out:
  // no badge, and the sack goes back to its smallest size.
  const count = isAuthenticated ? cartCount : 0;
  const { showToast } = useToast();
  const requireLogin = useRequireLogin();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const phone = useMediaQuery("(max-width: 639px)");
  const size = phone ? SIZE_PHONE : SIZE_DESKTOP;
  const gap = phone ? GAP_PHONE : GAP_DESKTOP;

  const [prefs, setPrefs] = useState(loadPrefs);
  const [overlayOpen, setOverlayOpen] = useState(overlayIsOpen);
  const [celebratePath, setCelebratePath] = useState(null);
  const [message, setMessage] = useState(null);
  const [hovered, setHovered] = useState(false);
  const [season] = useState(() => getSeason());
  const [lite] = useState(isLowEnd);

  const routeHidden =
    HIDDEN_ROUTES.some((route) => pathname.startsWith(route)) && celebratePath !== pathname;
  const shown = !routeHidden && !overlayOpen && !prefs.minimised;
  const miniShown = prefs.minimised && !routeHidden && !overlayOpen;

  const rootRef = useRef(null);
  const flipRef = useRef(null);
  const mouthRef = useRef(null);
  const miniRef = useRef(null);
  const badgeRef = useRef(null);
  const anchorRef = useRef(null);
  const hoverTimer = useRef(null);
  const leaveTimer = useRef(null);
  const bubbleTimer = useRef(null);
  // Imperative API created by the main effect (applyShown, setSackSize, onRemoved, ...).
  const api = useRef({});
  // Latest render values, for handlers created once in the main effect.
  const latest = useRef({});
  const shownRef = useRef(shown);
  const countRef = useRef(count);
  const prevCartCount = useRef(cartCount);

  useEffect(() => {
    latest.current = {
      onOpenCart,
      requireLogin,
      isAuthenticated,
      showToast,
      navigate,
      from: pathname + search,
      pathname,
      sound: prefs.sound,
      minimised: prefs.minimised,
      setCelebratePath,
    };
  }, [onOpenCart, requireLogin, isAuthenticated, showToast, navigate, pathname, search, prefs.sound, prefs.minimised]);

  // ---- Persist preferences.
  useEffect(() => savePrefs(prefs), [prefs]);

  // ---- Drawers and modals lock the page with a class on <html> (hooks/useOverlay.js): step aside.
  useEffect(() => {
    const observer = new MutationObserver(() => setOverlayOpen(overlayIsOpen()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // ---- Speech bubble auto-dismiss (paused while hovered).
  const startBubbleTimer = (ms = BUBBLE_MS) => {
    clearTimeout(bubbleTimer.current);
    bubbleTimer.current = setTimeout(() => setMessage(null), ms);
  };
  useEffect(() => {
    if (!message) return undefined;
    clearTimeout(bubbleTimer.current);
    bubbleTimer.current = setTimeout(() => setMessage(null), BUBBLE_MS);
    return () => clearTimeout(bubbleTimer.current);
  }, [message]);

  // ---- Main effect: positioning, walking, reactions. Re-runs only when his size changes.
  useEffect(() => {
    const root = rootRef.current;
    const flip = flipRef.current;
    if (!root || !flip) return undefined;

    const rm = reducedMotion();
    const UNIT = size / 120;
    const part = (sel) => root.querySelector(sel);
    const bob = part(".s-bob");
    const sackGrow = part(".s-sackGrow");
    const sack = part(".s-sack");
    const extra1 = part(".s-extra1");
    const extra2 = part(".s-extra2");
    const legB = part(".s-legB");
    const legF = part(".s-legF");
    const body = part(".s-body");
    const head = part(".s-head");
    const eyes = part(".s-eyes");
    const look = part(".s-look");
    const mouth = part(".s-mouth");
    const hat = part(".s-hat");
    const pom = part(".s-pom");
    const armB = part(".s-armB");
    const armF = part(".s-armF");
    const armUp = part(".s-armUp");
    const fore = part(".s-fore");
    const hand = part(".s-hand");
    const limbs = [legB, legF, armB, armF, sack, pom, bob];

    Object.entries(PIVOTS).forEach(([sel, origin]) => gsap.set(part(sel), { svgOrigin: origin }));

    const home = () => ({
      // clientWidth excludes the scrollbar.
      x: document.documentElement.clientWidth - gap - REACH_RIGHT * UNIT,
      y: window.innerHeight - gap - GROUND_Y * UNIT,
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

    // ---- Eyes: pupils follow the cursor (or are steered by an action).
    const lookX = gsap.quickTo(look, "x", { duration: 0.35, ease: "power3.out" });
    const lookY = gsap.quickTo(look, "y", { duration: 0.35, ease: "power3.out" });
    let lookLocked = false;
    let pointer = null;

    // ---- Idle: breathing + slow head nod, and a blink every few seconds.
    const idle = rm
      ? null
      : gsap
          .timeline({ repeat: -1, yoyo: true, defaults: { duration: 1.4, ease: "sine.inOut" } })
          .to(body, { scaleY: 1.03, scaleX: 0.99 }, 0)
          .to(head, { y: -0.9, rotation: 1.5 }, 0);
    let blinkCall;
    let action = null; // the current one-off animation (wave, shrug, yawn...)
    const blink = () => {
      if (!action) gsap.to(eyes, { scaleY: 0.1, duration: 0.07, yoyo: true, repeat: 1, ease: "power1.in" });
      blinkCall = gsap.delayedCall(gsap.utils.random(2.2, 5.5), blink);
    };
    if (!rm) blinkCall = gsap.delayedCall(1.5, blink);

    // ---- One action at a time. Starting a new one stops the old and relaxes the pose.
    const ACTION_PARTS = [armUp, fore, hand, armB, pom, hat, bob, sack, mouth, eyes];
    // Parts the walk cycle doesn't drive (safe to relax while he starts walking).
    const NON_WALK_PARTS = [armUp, fore, hand, hat, mouth, eyes];
    const relax = (duration = 0.25, parts = ACTION_PARTS) => {
      gsap.to(parts, { rotation: 0, y: 0, scaleX: 1, scaleY: 1, duration, ease: "power2.out" });
      lookLocked = false;
      lookX(0);
      lookY(0);
    };
    const startAction = (build) => {
      if (rm) return;
      if (action) {
        action.kill();
        relax(0.12);
      }
      action = gsap.timeline({
        onComplete: () => {
          action = null;
          lookLocked = false;
        },
      });
      build(action);
    };
    const stopAction = (parts = ACTION_PARTS) => {
      if (!action) return;
      action.kill();
      action = null;
      relax(0.15, parts);
    };

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
    let walkTween, settleTween, turnHome;
    let afterWalk = null; // a reaction waiting for him to stop walking
    const whenFree = (fn) => {
      if (walking) afterWalk = fn;
      else fn();
    };

    // ---- Actions -------------------------------------------------------------------------
    // "Hi!": lift the elbow out to the side with the forearm pointing up, then rock the forearm
    // from the elbow (slightly outward <-> slightly inward). The hand stays straight in line with
    // the forearm so they move as one piece. The pom-pom swings out of the hand's way.
    const WAVE_ROCK = [-71, -97, -71, -97, -84];
    const raiseArm = (tl, at = 0, d = 0.3) =>
      tl
        .to(armUp, { rotation: -65, duration: d, ease: "back.out(1.6)" }, at)
        .to(fore, { rotation: -84, duration: d, ease: "back.out(1.6)" }, at)
        .to(hand, { rotation: -31, duration: d, ease: "power2.out" }, at)
        .to(pom, { rotation: -30, duration: d, ease: "power2.out" }, at);
    const lowerArm = (tl, at) =>
      tl.to([armUp, fore, hand, pom], { rotation: 0, duration: 0.35, ease: "power2.inOut" }, at);

    const wave = () =>
      startAction((tl) => {
        raiseArm(tl, 0.2);
        tl.to(fore, {
          keyframes: WAVE_ROCK.map((r) => ({ rotation: r, duration: 0.17, ease: "sine.inOut" })),
        });
        lowerArm(tl, "+=0.1");
      });

    // Palms up, shoulders up, little "oops" frown.
    const shrug = () =>
      startAction((tl) =>
        tl
          .to(armUp, { rotation: -30, duration: 0.25, ease: "back.out(2)" }, 0)
          .to(fore, { rotation: -39, duration: 0.25, ease: "back.out(2)" }, 0)
          .to(hand, { rotation: -31, duration: 0.25 }, 0)
          .to(armB, { rotation: 28, duration: 0.25, ease: "back.out(2)" }, 0)
          .to(bob, { y: -2, duration: 0.2 }, 0)
          .to(mouth, { scaleY: -0.6, duration: 0.2 }, 0)
          .to([armUp, fore, hand, armB], { rotation: 0, duration: 0.4, ease: "power2.inOut" }, 1.3)
          .to(bob, { y: 0, duration: 0.4 }, 1.3)
          .to(mouth, { scaleY: 1, duration: 0.3 }, 1.3),
      );

    // Head down, slumped, sack deflates a little.
    const sad = () =>
      startAction((tl) =>
        tl
          .call(() => {
            lookLocked = true;
            lookX(0);
            lookY(1.2);
          }, null, 0)
          .to(mouth, { scaleY: -0.7, duration: 0.25 }, 0)
          .to(bob, { y: 1.5, scaleY: 0.97, duration: 0.4, ease: "power2.out" }, 0)
          .to(sack, { scaleX: 0.9, scaleY: 0.9, duration: 0.4, ease: "power2.out" }, 0)
          .to(armB, { rotation: 8, duration: 0.4 }, 0)
          .to(mouth, { scaleY: 1, duration: 0.4 }, 1.7)
          .to(bob, { y: 0, scaleY: 1, duration: 0.5, ease: "power2.inOut" }, 1.7)
          .to(sack, { scaleX: 1, scaleY: 1, duration: 0.5, ease: "back.out(2)" }, 1.7)
          .to(armB, { rotation: 0, duration: 0.5 }, 1.7)
          .call(() => {
            lookLocked = false;
            lookY(0);
          }, null, 1.7),
      );

    // Both arms up, two happy jumps, big smile.
    const cheer = () =>
      startAction((tl) => {
        raiseArm(tl, 0, 0.25);
        tl.to(armB, { rotation: 150, duration: 0.3, ease: "back.out(1.6)" }, 0)
          .to(mouth, { scaleY: 1.8, scaleX: 1.15, duration: 0.2 }, 0)
          .to(bob, { y: -16, duration: 0.28, ease: "power2.out" }, 0.05)
          .to(bob, { y: 0, duration: 0.32, ease: "bounce.out" }, 0.33)
          .to(bob, { y: -12, duration: 0.25, ease: "power2.out" }, 0.75)
          .to(bob, { y: 0, duration: 0.3, ease: "bounce.out" }, 1)
          .to(armB, { rotation: 0, duration: 0.5, ease: "power2.inOut" }, 1.8)
          .to(mouth, { scaleY: 1, scaleX: 1, duration: 0.3 }, 1.8);
        lowerArm(tl, 1.8);
      });

    // Idle moments (only when he's resting in his corner and nobody has interacted for a while).
    const yawn = () =>
      startAction((tl) => {
        raiseArm(tl, 0, 0.5);
        tl.to(bob, { rotation: -3, duration: 0.5, ease: "sine.inOut" }, 0)
          .to(mouth, { scaleY: 2.6, scaleX: 1.2, duration: 0.5 }, 0.1)
          .to(eyes, { scaleY: 0.12, duration: 0.3 }, 0.15)
          .to([bob], { rotation: 0, duration: 0.6, ease: "power2.inOut" }, 1.6)
          .to([mouth, eyes], { scaleY: 1, scaleX: 1, duration: 0.5, ease: "power2.inOut" }, 1.6);
        lowerArm(tl, 1.6);
      });
    const lookAround = () =>
      startAction((tl) =>
        tl
          .call(() => {
            lookLocked = true;
            lookX(-1.4);
            lookY(0);
          }, null, 0)
          .to(bob, { rotation: -2, duration: 0.4, ease: "sine.inOut" }, 0)
          .call(() => lookX(1.4), null, 0.9)
          .to(bob, { rotation: 2, duration: 0.5, ease: "sine.inOut" }, 0.9)
          .call(() => lookX(0), null, 1.9)
          .to(bob, { rotation: 0, duration: 0.4 }, 1.9),
      );
    const hitchSack = () =>
      startAction((tl) =>
        tl
          .to(armB, { rotation: -14, duration: 0.2, ease: "power2.out" }, 0)
          .to(sack, { y: -5, rotation: -4, duration: 0.2, ease: "power2.out" }, 0)
          .to(bob, { y: 1.5, duration: 0.2 }, 0)
          .to(sack, { y: 0, rotation: 0, duration: 0.5, ease: "bounce.out" }, 0.22)
          .to([armB, bob], { rotation: 0, y: 0, duration: 0.35, ease: "power2.out" }, 0.25),
      );
    const hatWiggle = () =>
      startAction((tl) =>
        tl
          .to(hat, { rotation: -4, duration: 0.15 }, 0)
          .to(pom, {
            keyframes: [30, -24, 14, -6, 0].map((r) => ({ rotation: r, duration: 0.16, ease: "sine.inOut" })),
          }, 0)
          .to(hat, { rotation: 0, duration: 0.6, ease: "elastic.out(1, 0.4)" }, 0.15),
      );
    const IDLE_MOMENTS = [yawn, lookAround, hitchSack, hatWiggle];

    // ---- Walking ---------------------------------------------------------------------------
    const arrive = () => {
      if (rm) return;
      gsap.fromTo(
        bob,
        { scaleX: 1.06, scaleY: 0.92 },
        { scaleX: 1, scaleY: 1, duration: 0.35, ease: "back.out(3)" },
      );
      if (afterWalk) {
        const fn = afterWalk;
        afterWalk = null;
        fn();
      } else if (anchorRef.current) wave();
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
      turnHome?.kill();
      afterWalk = null;
      // About to walk: the walk cycle takes over legs, back arm, sack and bob.
      stopAction(dist >= 4 && !rm ? NON_WALK_PARTS : ACTION_PARTS);
      if (Math.abs(t0.x - sx) > 4) face(t0.x < sx ? -1 : 1);

      if (rm || dist < 4) {
        gsap.set(root, t0);
        arrive();
        return;
      }

      walking = true;
      if (!walkCycle.isActive()) walkCycle.restart();

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

    const hoverCard = (anchorEl) => {
      // Touch devices fire mouseenter on tap: no walking there (he stays in his corner).
      if (!canHover() || !shownRef.current) return;
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
        if (!anchorRef.current) return;
        anchorRef.current = null;
        walkTo();
      }, LEAVE_DELAY_MS);
    };

    // ---- Speech --------------------------------------------------------------------------
    const say = (text, actions = []) => {
      const r = root.getBoundingClientRect();
      const align = r.left + r.width / 2 > window.innerWidth / 2 ? "right" : "left";
      setMessage({ id: Date.now() + Math.random(), text, actions, align });
    };
    const openCart = () => {
      setMessage(null);
      if (!latest.current.isAuthenticated) {
        // Same rule as the header cart button (the cart is for signed-in customers), but Santa
        // answers in his speech bubble instead of a toast + redirect.
        if (!needLogin("Sign in to see what's in your sack 🎁"))
          latest.current.requireLogin("Please sign in to view your cart.");
        return;
      }
      latest.current.onOpenCart?.();
    };

    // ---- Flying products ---------------------------------------------------------------------
    const clones = new Set();
    const flyTo = (imgEl, targetEl, onLand) => {
      if (!imgEl || !targetEl) {
        onLand?.();
        return;
      }
      const from = imgEl.getBoundingClientRect();
      const px = Math.min(from.width, from.height, 140);

      const clone = imgEl.cloneNode(false);
      clone.removeAttribute("loading");
      Object.assign(clone.style, {
        position: "fixed",
        left: "0px",
        top: "0px",
        width: `${px}px`,
        height: `${px}px`,
        objectFit: "cover",
        borderRadius: "12px",
        zIndex: 9999,
        pointerEvents: "none",
        transform: "none",
        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
      });
      document.body.appendChild(clone);
      clones.add(clone);

      const startX = from.left + (from.width - px) / 2;
      const startY = from.top + (from.height - px) / 2;
      const land = () => {
        clone.remove();
        clones.delete(clone);
        onLand?.();
      };
      if (rm) {
        land();
        return;
      }

      // Quadratic arc toward the target, re-aimed every frame since Santa may be walking.
      const p = { t: 0 };
      gsap.to(p, {
        t: 1,
        duration: 0.75,
        ease: "power1.inOut",
        onUpdate: () => {
          const to = targetEl.getBoundingClientRect();
          const endX = to.left + to.width / 2 - px / 2;
          const endY = to.top + to.height / 2 - px / 2;
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
        onComplete: land,
      });
    };

    const popBadge = () => {
      if (badgeRef.current && !rm)
        gsap.fromTo(badgeRef.current, { scale: 1.6 }, { scale: 1, duration: 0.3, ease: "back.out(3)" });
    };

    // Sack gulps the gift; Santa does a happy hop (unless he's mid-walk or mid-action).
    const catchIt = () => {
      popBadge();
      if (rm) return;
      gsap.fromTo(sack, { scaleX: 1.15, scaleY: 1.15 }, { scaleX: 1, scaleY: 1, duration: 0.5, ease: "elastic.out(1, 0.4)" });
      if (!walking && !action)
        gsap
          .timeline()
          .to(bob, { y: -10, scaleX: 0.96, scaleY: 1.05, duration: 0.18, ease: "power2.out" })
          .to(bob, { y: 0, scaleX: 1, scaleY: 1, duration: 0.3, ease: "bounce.out" });
    };

    const suggested = new Set(); // categories already suggested this visit
    const added = (product, imgEl) => {
      const { showToast: toast, minimised, sound, navigate: go } = latest.current;
      if (!shownRef.current) {
        // Minimised (or out of the way): fall back to the mini sack and a plain toast.
        if (minimised && miniRef.current)
          flyTo(imgEl, miniRef.current, () => {
            if (miniRef.current && !rm)
              gsap.fromTo(miniRef.current, { scale: 1.25 }, { scale: 1, duration: 0.35, ease: "back.out(3)" });
          });
        toast(`Added "${product.name}" to cart`);
        return;
      }
      flyTo(imgEl, mouthRef.current, catchIt);
      if (sound) playJingle();
      const actions = [{ label: "View cart", onClick: openCart }];
      const pair = suggestFor(product);
      if (pair && !suggested.has(pair.id)) {
        suggested.add(pair.id);
        actions.push({
          label: `Pairs well: ${pair.label}`,
          onClick: () => {
            setMessage(null);
            go(`/shop?category=${pair.id}`);
          },
        });
      }
      say("Added to your sack! 🎁", actions);
    };

    const needLogin = (text = "Sign in so I can carry this for you 🎁") => {
      if (!shownRef.current) return false; // minimised/hidden: use the normal sign-in redirect
      whenFree(shrug);
      say(text, [
        {
          label: "Sign in",
          onClick: () => {
            setMessage(null);
            latest.current.navigate("/login", { state: { from: latest.current.from } });
          },
        },
      ]);
      return true;
    };

    let celebratedAt = -Infinity;
    const celebrate = () => {
      celebratedAt = performance.now();
      // Un-hide him on the checkout page for this moment (resets when the route changes).
      latest.current.setCelebratePath(latest.current.pathname);
      gsap.delayedCall(0.45, () => {
        if (latest.current.sound) playJingleBells();
        say("Ho ho ho! Your request is in — Merry Christmas! 🎄");
        if (rm) return;
        const r = root.getBoundingClientRect();
        burstConfetti(r.left + r.width / 2, r.top + r.height * 0.3);
        cheer();
      });
    };

    let pendingSad = false;
    const onRemoved = () => {
      if (performance.now() - celebratedAt < 5000) return; // cart emptied by a sent request
      if (!shownRef.current) {
        pendingSad = true; // e.g. removed inside the cart drawer: react once it closes
        return;
      }
      whenFree(sad);
      say("Took it out of the sack.");
    };

    // Sack grows with the cart (up to 10 items), and extra gifts pop up at 3 and 6.
    const setSackSize = (n, animate = true) => {
      const d = animate && !rm ? 1 : 0;
      gsap.to(sackGrow, { scale: 1 + Math.min(n, 10) * 0.025, duration: 0.5 * d, ease: "back.out(2)" });
      [
        [extra1, 3],
        [extra2, 6],
      ].forEach(([el, min]) => {
        const on = n >= min;
        gsap.to(el, {
          opacity: on ? 1 : 0,
          scale: on ? 1 : 0.4,
          duration: 0.35 * d,
          ease: on ? "back.out(2.5)" : "power2.in",
        });
      });
    };
    setSackSize(countRef.current, false);

    // Hovering Santa himself: looks up at you, big smile, little hop.
    const hoverSelf = (on) => {
      if (rm) return;
      if (!on) {
        lookLocked = false;
        lookY(0);
        gsap.to(mouth, { scaleY: 1, scaleX: 1, duration: 0.2 });
        return;
      }
      if (walking || action) return;
      lookLocked = true;
      lookX(0);
      lookY(-1.3);
      gsap.to(mouth, { scaleY: 1.7, scaleX: 1.12, duration: 0.2 });
      gsap.fromTo(bob, { y: 0 }, { y: -3, duration: 0.15, yoyo: true, repeat: 1, ease: "power2.out" });
    };

    // Click: a little wiggle (the cart opens at the same time).
    const poke = () => {
      if (rm || walking || action) return;
      gsap.to(bob, {
        keyframes: [-6, 6, -3, 0].map((r) => ({ rotation: r, duration: 0.08 })),
        ease: "sine.inOut",
      });
    };

    const applyShown = (on) => {
      gsap.to(root, { autoAlpha: on ? 1 : 0, duration: rm ? 0 : 0.3 });
      if (!on) {
        clearTimeout(hoverTimer.current);
        anchorRef.current = null;
        setMessage(null);
        return;
      }
      if (pendingSad) {
        pendingSad = false;
        gsap.delayedCall(0.35, () => {
          whenFree(sad);
          say("Took it out of the sack.");
        });
      }
    };

    // ---- Every frame: stay glued to the spot (scroll, hover lift, resize) and follow the cursor.
    const follow = () => {
      if (!walking && !gsap.isTweening(root)) gsap.set(root, target());
      if (pointer && !lookLocked && !rm) {
        const e = eyes.getBoundingClientRect();
        const dx = pointer.x - (e.left + e.width / 2);
        const dy = pointer.y - (e.top + e.height / 2);
        const dist = Math.hypot(dx, dy) || 1;
        const k = Math.min(1, dist / 250);
        // The figure is mirrored when facing left, so the horizontal offset flips with it.
        lookX((dx / dist) * 1.3 * k * facing);
        lookY((dy / dist) * 1 * k);
        pointer = null;
      }
    };
    gsap.ticker.add(follow);

    // ---- Activity tracking for idle moments; the cursor position feeds the eyes.
    let lastActivity = performance.now();
    let lastMoment = 0;
    const onPointer = (e) => {
      lastActivity = performance.now();
      pointer = { x: e.clientX, y: e.clientY };
    };
    const onActivity = () => {
      lastActivity = performance.now();
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("scroll", onActivity, { passive: true });
    window.addEventListener("keydown", onActivity);
    window.addEventListener("touchstart", onActivity, { passive: true });
    const idleTimer = setInterval(() => {
      const now = performance.now();
      if (rm || document.hidden || walking || action || anchorRef.current || !shownRef.current) return;
      if (now - lastActivity < IDLE_AFTER_MS || now - lastMoment < IDLE_REPEAT_MS) return;
      lastMoment = now;
      gsap.utils.random(IDLE_MOMENTS)();
    }, 4000);

    // ---- Pause his looping animations while the tab is in the background.
    const onVisibility = () => {
      if (document.hidden) {
        idle?.pause();
        blinkCall?.pause();
      } else {
        idle?.resume();
        blinkCall?.resume();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    // ---- Appear.
    const h = home();
    if (shownRef.current) {
      gsap.set(root, { x: h.x, y: h.y + 40, autoAlpha: 0 });
      gsap.to(root, { y: h.y, autoAlpha: 1, duration: 0.6, delay: 0.3, ease: "back.out(1.8)" });
    } else {
      gsap.set(root, { x: h.x, y: h.y, autoAlpha: 0 });
    }

    api.current = { applyShown, setSackSize, onRemoved, hoverSelf, poke, openCart, leaveCard };
    const unregister = register({ hoverCard, leaveCard, added, needLogin, celebrate });
    return () => {
      clearTimeout(hoverTimer.current);
      clearTimeout(leaveTimer.current);
      clearInterval(idleTimer);
      gsap.ticker.remove(follow);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("scroll", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("touchstart", onActivity);
      document.removeEventListener("visibilitychange", onVisibility);
      idle?.kill();
      walkCycle.kill();
      blinkCall?.kill();
      action?.kill();
      [walkTween, settleTween, turnHome].forEach((t) => t?.kill());
      gsap.killTweensOf([root, flip, ...root.querySelectorAll("[class^='s-']")]);
      clones.forEach((c) => c.remove());
      api.current = {};
      unregister();
    };
  }, [register, size, gap]);

  // ---- Show / hide (forms, drawers, modals, minimised).
  useEffect(() => {
    shownRef.current = shown;
    api.current.applyShown?.(shown);
  }, [shown]);

  // ---- Cart count: sack size follows what's visible (0 when signed out)...
  useEffect(() => {
    countRef.current = count;
    api.current.setSackSize?.(count);
  }, [count]);

  // ...but the sad "took it out" reaction follows the real cart, so logging out doesn't trigger it.
  useEffect(() => {
    if (cartCount < prevCartCount.current && isAuthenticated) api.current.onRemoved?.();
    prevCartCount.current = cartCount;
  }, [cartCount, isAuthenticated]);

  const setPref = (key, value) => setPrefs((p) => ({ ...p, [key]: value }));
  const toggleSound = () => {
    const next = !prefs.sound;
    setPref("sound", next);
    if (next) playJingle(); // instant feedback (and unlocks audio on this click)
  };

  const cartLabel = count > 0 ? `Open cart (${count} item${count === 1 ? "" : "s"})` : "Open cart";
  const controlClass =
    "pointer-events-auto flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-gold-400/40 bg-bg-dark-emerald text-gold-300 shadow-[0_2px_8px_rgba(0,0,0,0.5)] transition-colors hover:bg-gold-400 hover:text-[#04120a] focus-visible:outline-2 focus-visible:outline-gold-400";

  return (
    <>
      <div
        ref={rootRef}
        className="pointer-events-none fixed top-0 left-0 z-60 invisible"
        style={{ width: size, height: size }}
      >
        <div
          className="group relative h-full w-full"
          // Moving the pointer from the card onto Santa (or his bubble) shouldn't send him home.
          onMouseEnter={() => {
            clearTimeout(leaveTimer.current);
            if (canHover()) {
              setHovered(true);
              api.current.hoverSelf?.(true);
            }
          }}
          onMouseLeave={() => {
            setHovered(false);
            api.current.hoverSelf?.(false);
            if (anchorRef.current) api.current.leaveCard?.();
          }}
        >
          <SantaBubble
            message={message}
            onPause={() => clearTimeout(bubbleTimer.current)}
            onResume={() => startBubbleTimer(2000)}
          />

          {/* "View cart (n)" label while hovering him (when he isn't already talking). */}
          {hovered && !message && (
            <span
              aria-hidden="true"
              className="absolute bottom-full right-0 mb-1 w-max rounded-full border border-gold-400/40 bg-bg-dark-emerald px-2.5 py-1 text-[0.72rem] font-semibold text-gold-200 shadow-[0_4px_14px_rgba(0,0,0,0.5)] transition-[opacity,translate] duration-200 starting:translate-y-1 starting:opacity-0"
            >
              View cart{count > 0 ? ` (${count})` : ""}
            </span>
          )}

          {/* Minimise + sound controls: on hover/focus (always visible on phones). */}
          <div
            className={`absolute top-0 right-full flex flex-col gap-1 pr-1 transition-opacity duration-200 ${
              phone ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
            }`}
          >
            <button
              type="button"
              className={controlClass}
              onClick={() => setPref("minimised", true)}
              aria-label="Hide Santa"
              title="Hide Santa"
            >
              <X size={13} strokeWidth={2.5} />
            </button>
            {!phone && (
              <button
                type="button"
                className={controlClass}
                onClick={toggleSound}
                aria-label={prefs.sound ? "Mute Santa's bells" : "Turn on Santa's bells"}
                aria-pressed={prefs.sound}
                title={prefs.sound ? "Sound on" : "Sound off"}
              >
                {prefs.sound ? <Bell size={12} strokeWidth={2.5} /> : <BellOff size={12} strokeWidth={2.5} />}
              </button>
            )}
          </div>

          {/* Snow in December (decorative). */}
          {season.snow && !reducedMotion() && (
            <div aria-hidden="true" className="pointer-events-none absolute -inset-x-5 -top-8 bottom-0 overflow-hidden">
              {Array.from({ length: 10 }, (_, i) => (
                <span
                  key={i}
                  className="absolute top-0 rounded-full bg-white/90"
                  style={{
                    left: `${(i * 37) % 100}%`,
                    width: 2 + (i % 3),
                    height: 2 + (i % 3),
                    animation: `santa-snow ${3 + (i % 4) * 0.7}s linear ${-(i * 0.45)}s infinite`,
                  }}
                />
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              api.current.poke?.();
              api.current.openCart?.();
            }}
            aria-label={cartLabel}
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
              <SantaFigure mouthRef={mouthRef} lite={lite} outfit={season.scarf ? "scarf" : null} />

              {/* Cart count on the sack; counter-flipped so the digits never mirror. */}
              {count > 0 && (
                <span
                  className="absolute"
                  style={{ left: "6%", top: "28%", transform: "scaleX(var(--face, 1))" }}
                >
                  <span
                    ref={badgeRef}
                    className="flex h-4 min-w-4 items-center justify-center rounded-full bg-gold-400 px-1 text-[0.6rem] font-bold text-[#04120a] shadow-[0_2px_6px_rgba(0,0,0,0.5)]"
                  >
                    {count}
                  </span>
                </span>
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Minimised: a small sack in the corner. Click to bring Santa back. */}
      {miniShown && (
        <button
          ref={miniRef}
          type="button"
          onClick={() => setPref("minimised", false)}
          aria-label={`Show Santa${count > 0 ? ` (${count} in cart)` : ""}`}
          title="Bring Santa back"
          className="fixed z-60 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-gold-400/40 bg-bg-dark-emerald shadow-[0_6px_18px_rgba(0,0,0,0.55)] transition-[opacity,scale] duration-300 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400 starting:scale-75 starting:opacity-0"
          style={{ right: gap, bottom: gap }}
        >
          <svg viewBox="0 0 40 40" width="26" height="26" aria-hidden="true">
            <path d="M12 14 Q6 22 8 30 Q11 37 20 37 Q29 37 32 30 Q34 22 28 14 Q20 17 12 14Z" fill="#9b2234" />
            <path d="M11 13 Q20 17 29 13 Q30 15 28 17 Q20 20 12 17 Q10 15 11 13Z" fill="#7e1a28" />
            <rect x="13" y="6" width="7" height="7" rx="1" fill="#3d82d8" />
            <rect x="21" y="5" width="6" height="8" rx="1" fill="#3aa65a" />
            <path d="M12 17 Q20 21 28 17" fill="none" stroke="#c99a5b" strokeWidth="1.6" />
          </svg>
          {count > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold-400 px-1 text-[0.6rem] font-bold text-[#04120a]">
              {count}
            </span>
          )}
        </button>
      )}
    </>
  );
}
