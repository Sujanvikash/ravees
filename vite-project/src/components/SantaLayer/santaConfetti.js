import gsap from "gsap";

const COLORS = ["#e5c78b", "#f4c24f", "#d6282b", "#2e9b50", "#ffffff"];

/** A one-off burst of confetti from (x, y) in viewport px; the pieces remove themselves. */
export function burstConfetti(x, y, count = 36) {
  for (let i = 0; i < count; i += 1) {
    const el = document.createElement("span");
    Object.assign(el.style, {
      position: "fixed",
      left: "0px",
      top: "0px",
      width: `${gsap.utils.random(5, 9)}px`,
      height: `${gsap.utils.random(3, 6)}px`,
      background: COLORS[i % COLORS.length],
      borderRadius: "1px",
      zIndex: 9999,
      pointerEvents: "none",
    });
    document.body.appendChild(el);

    // Fan upwards, then fall with "gravity" while spinning and fading.
    const angle = (gsap.utils.random(-160, -20) * Math.PI) / 180;
    const speed = gsap.utils.random(90, 220);
    const dx = Math.cos(angle) * speed;
    const dy = Math.sin(angle) * speed;
    gsap.set(el, { x, y, rotation: gsap.utils.random(0, 360) });
    gsap
      .timeline({ onComplete: () => el.remove() })
      .to(el, { x: x + dx, duration: 1.4, ease: "power1.out" }, 0)
      .to(el, { y: y + dy, duration: 0.45, ease: "power2.out" }, 0)
      .to(el, { y: y + dy + gsap.utils.random(160, 260), duration: 0.95, ease: "power1.in" }, 0.45)
      .to(el, { rotation: `+=${gsap.utils.random(-540, 540)}`, duration: 1.4 }, 0)
      .to(el, { opacity: 0, duration: 0.4 }, 1);
  }
}
