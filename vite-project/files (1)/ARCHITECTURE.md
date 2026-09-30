# Hero scroll animation: architecture

The hero plays a 242-frame image sequence of a Christmas tree growing from its base, scrubbed by scroll. Scrolling down grows the tree; scrolling up reverses it. Three short copy beats fade in and out at fixed points along the way.

Target: a steady 60 fps on mid-range phones and up to 120 fps on high-refresh displays (ProMotion, 120/144 Hz monitors), with the first frame on screen almost immediately.

## Libraries

| Package | Why |
|---|---|
| `gsap` | Timeline engine and the single `requestAnimationFrame` loop everything runs on. The loop follows the display refresh rate, so 120 Hz screens get 120 updates per second automatically. GSAP and all its plugins are free for commercial use. |
| `gsap/ScrollTrigger` (ships inside `gsap`) | Maps scroll position to timeline progress (`scrub`), handles resize and refresh. |
| `@gsap/react` | `useGSAP()` hook: scoped selectors and automatic cleanup on unmount and in React Strict Mode. |
| `lenis` | Smooth, inertia-style wheel scrolling on desktop. It drives native scroll, so `position: sticky`, anchors, and accessibility all keep working. |

Install:

```bash
npm i gsap @gsap/react lenis
```

Not used, on purpose: Framer Motion (fine for UI motion, but ScrollTrigger's scrub is more precise for frame sequences), `<video>` scrubbing (seeking a video by `currentTime` is janky and codec-dependent, especially on iOS Safari), and swapping `<img src>` (each swap triggers layout, decode, and paint).

## File layout

```
public/
  frames/
    desktop/frame_0001.webp … frame_0242.webp   1920×1080, ~23 MB total
    mobile/frame_0001.webp  … frame_0242.webp   1280×720,  ~13 MB total
src/
  components/
    SmoothScroll/
      SmoothScroll.jsx      Lenis + GSAP ticker wiring (wraps the app once)
      index.js
    ScrollTreeHero/
      ScrollTreeHero.jsx    Canvas, scroll timeline, copy beats
      useFrameSequence.js   Progressive preloader + nearest-frame lookup
      index.js
```

Frames live in `public/` so Vite serves them untouched with stable URLs. They should not be imported through the bundler.

## How it works

```
 wheel / touch
      │
      ▼
   Lenis ──(scroll event)──► ScrollTrigger.update()
      ▲                              │
      │                     timeline progress 0 → 1
 gsap.ticker (rAF, display Hz)       │
                        ┌────────────┴─────────────┐
                        ▼                          ▼
          renderState.frame 0 → 241        copy beats (opacity / y)
                        │
                        ▼
      draw(): only if the chosen image changed
                        │
                        ▼
      one ctx.drawImage() onto a <canvas> (object-fit: cover math)
```

Layout is a tall section (`450svh` by default) with a `position: sticky` viewport-sized child inside. Sticky keeps the canvas pinned without ScrollTrigger's `pin`, so there are no pin-spacers and no layout jumps on refresh.

One GSAP timeline, driven by one ScrollTrigger, owns everything: the frame counter tweens from 0 to 241 across the whole timeline (duration 1), and the copy beats sit at fixed positions inside it.

| Timeline position | What happens | Video content |
|---|---|---|
| 0.00 – 0.14 | Headline and intro visible, scroll hint fades at 0.02 | Empty stage, snow |
| 0.14 – 0.24 | Intro fades out | Trunk and first branches |
| 0.34 – 0.60 | "Built branch by branch" visible | Branches, lights, ornaments |
| 0.80 – 1.00 | Final CTA visible | Fully decorated tree with gifts |

Scrolling never causes a React render. Frame state lives in a ref, and the only React state updates come from the loader (throttled to every 8 frames).

## Loading strategy

1. Frame 1 is requested alone with `fetchPriority="high"` and shown as soon as it decodes (the canvas fades in).
2. The last frame is next, so a fast scroller still sees the finished tree.
3. The rest load in a coarse-to-fine order: every 32nd frame, then 16th, 8th, 4th, 2nd, then all. After about 10 requests the whole scroll range is covered, and it gets smoother as gaps fill in.
4. Six requests run in parallel. Every image is `decode()`d before it is used, so drawing it later does not stall the main thread.
5. If the exact frame is not loaded yet, the nearest loaded frame is drawn. When a closer frame arrives, the canvas redraws itself.
6. A 1 px gold line at the bottom of the hero shows load progress, then fades out.

The frame set is chosen once on mount: `desktop` when viewport width × device pixel ratio is over 1300 px, otherwise `mobile`. Data-saver mode always gets `mobile`.

Optional: add this to `index.html` so the first frame starts downloading before React boots.

```html
<link rel="preload" as="image" href="/frames/desktop/frame_0001.webp" fetchpriority="high" />
```

## Performance rules for 60–120 fps

At 120 Hz each frame has about 8 ms of budget. These rules keep the hero well inside it.

- Draw only on change. 242 frames across 450svh means most scroll ticks do not change the frame; `draw()` returns early when the image is the same.
- Canvas context uses `{ alpha: false }`, which lets the browser skip compositing transparency.
- Device pixel ratio is capped at 2. A 3× phone would otherwise push 2.25× more pixels with no visible gain.
- Copy beats animate only `opacity` and `transform` (GPU-composited), and use `will-change`.
- The sticky wrapper has `contain: layout paint`, which isolates repaints from the rest of the page.
- No `backdrop-filter` or large `blur()` over the canvas. They re-run every frame and are the most common cause of dropped frames in heroes like this. The legibility scrim is a plain gradient.
- `gsap.ticker.lagSmoothing(0)` keeps the scrub locked to scroll after a tab switch or a slow frame.
- `ScrollTrigger.config({ ignoreMobileResize: true })` plus `svh` units stop the mobile address bar from triggering recalculations while scrolling.
- On touch devices `scrub: 0.5` adds a short catch-up so native momentum scrolling does not look stepped. On desktop Lenis already smooths input, so scrub is `true` (no double smoothing).

Memory: decoded 1080p frames are large. Browsers keep the compressed WebP in memory and manage the decoded cache themselves, which works well in Chrome, Safari, and Firefox. Do not convert frames to `ImageBitmap` up front; 242 decoded 1080p bitmaps would need roughly 2 GB.

## Responsive and accessibility

- Canvas uses cover-fit centred on the tree, so it stays in frame from ultrawide monitors down to portrait phones.
- Copy sits on the left on desktop (where the video has empty space) and at the bottom on phones, each with its own scrim for contrast.
- `prefers-reduced-motion`: Lenis is disabled, the section collapses to one screen, the last frame (finished tree) is shown statically, and the headline and CTAs are stacked with no animation.
- Canvas is `aria-hidden`. The real content is in HTML: one `h1`, `h2`s for later beats, and real links for CTAs with visible focus rings.
- Safe-area inset is respected at the bottom on notched phones.

## Integration

1. Copy `public/frames/` and `src/components/` into your project.
2. `npm i gsap @gsap/react lenis`
3. Wrap the app once, in `main.jsx` or `App.jsx`:

```jsx
import SmoothScroll from "./components/SmoothScroll";
import ScrollTreeHero from "./components/ScrollTreeHero";

export default function App() {
  return (
    <SmoothScroll>
      <Navbar />
      <ScrollTreeHero shopHref="/collections" studioHref="/tree-studio" />
      {/* rest of the page */}
    </SmoothScroll>
  );
}
```

4. Fonts: the component uses `Cinzel` for headings as a Tailwind arbitrary value. Replace `font-['Cinzel',Georgia,serif]` with your project's existing heading class if you already have one configured.
5. If your navbar is fixed over the hero, nothing changes; the canvas fills behind it. If it is not fixed, reduce the sticky height accordingly.

Works with Tailwind v3.3+ and v4 (only standard utilities and arbitrary values are used).

## Tuning

| What | Where | Effect |
|---|---|---|
| Scroll length | `scrollLength` prop (default `450`) | Higher = slower growth per scroll. 350–600 is the useful range. |
| Wheel feel | `lerp` in `SmoothScroll.jsx` (default `0.1`) | 0.07 floatier, 0.15 snappier. |
| Touch catch-up | `scrub` in `ScrollTreeHero.jsx` | 0.3 tighter, 0.8 smoother. |
| Copy timing | Positions (0.14, 0.34, 0.6, 0.8) in the timeline | Move beats to match specific moments in the video. |
| Frame-set cutoff | `pickFrameSet()` | Raise 1300 to send more devices the lighter set. |
| Parallel requests | `concurrency` in `useFrameSequence` | 4–8. Higher helps on HTTP/2 hosts. |

## Deployment

- Serve `/frames/*` with long cache headers, e.g. `Cache-Control: public, max-age=31536000, immutable`. If you replace the frames later, rename the folder (e.g. `frames-v2`) so users do not see stale ones.
- Use a host with HTTP/2 or HTTP/3 (Vercel, Netlify, Cloudflare Pages all do) so parallel requests are cheap.
- Do not run the frames through an image optimizer that re-encodes them on the fly; they are already tuned WebP.

## Testing checklist

- Chrome DevTools, Performance panel, record while scrolling: no long tasks, frames under 8 ms on a 120 Hz display.
- Rendering panel, "Frame Rendering Stats": steady at the display's refresh rate.
- Network throttled to "Fast 4G": first frame appears within about 1 second and scrubbing works before loading finishes.
- iPhone Safari and an Android mid-range device: no jump when the address bar collapses.
- macOS/Windows "reduce motion" setting on: static finished tree, stacked copy, no smooth scroll.
- Keyboard: Tab reaches both CTAs with visible focus; Space/Page Down scrolls through the hero.
- Scroll fast from top to bottom right after load: the finished tree still shows at the end.
