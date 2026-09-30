# Hero scroll animation: architecture

The hero plays a 242-frame image sequence of a Christmas tree growing from its base, scrubbed by scroll. Scrolling down grows the tree; scrolling up reverses it. Your original hero content (heritage card and Craftsmanship Standards card) sits over it without covering the tree.

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
  frames-v2/
    desktop/frame_0001.webp … frame_0242.webp   1920×1080, ~23 MB total
    mobile/frame_0001.webp  … frame_0242.webp   1280×720,  ~12 MB total
src/
  components/
    SmoothScroll/
      SmoothScroll.jsx      Lenis + GSAP ticker wiring (wraps RootLayout once)
      index.js
    ScrollTreeHero/
      ScrollTreeHero.jsx    Canvas, scroll timeline, card placement
      HeroCards.jsx         HeroCard (left) and CraftCard (right)
      heroContent.js        ALL text, links and badges: edit copy here
      useFrameSequence.js   Progressive preloader + nearest-frame lookup
      index.js
```

Frames live in `public/` so Vite serves them untouched with stable URLs. They should not be imported through the bundler. The folder is `frames-v2` (not `frames`) because the watermark-free re-render kept the same file names; the new folder name makes browsers and CDNs fetch fresh copies.

### Differences from the stock package in this project

- **Icons:** the package ships `Icons.jsx` (hand-written SVG). This project's rule is that icons come from npm packages, so `HeroCards.jsx` maps the icon names in `heroContent.js` to `lucide-react` components (`ShieldCheck`, `Zap`, `Truck`, `TreePine`, `Sparkles`, `ArrowRight`, `Star`). `Icons.jsx` is not used.
- **Links:** CTAs are React Router `<Link>`s pointing at `/shop` and `/tree-studio`, not plain `<a>` tags.
- **Theme:** cards use the site's Tailwind tokens (`font-serif` = Cinzel, `font-mono` = Space Mono, `gold-*`, `text-secondary`) instead of the package's hex palette. The canvas background stays `#0B1A14` to match the video's edges.
- **Header offset:** `layout/Header.jsx` is `sticky`, 76px tall, not fixed. The stage is `sticky top-[76px] h-[calc(100svh-76px)]` and the ScrollTrigger starts at `top 76px` (`HEADER_OFFSET` in `ScrollTreeHero.jsx`). If the header height changes, update both.
- **Lenis scope:** `SmoothScroll` wraps `layout/RootLayout.jsx` only, so `/admin` keeps native scrolling. Scrollable overlays (`components/Modal.jsx`, `layout/CartDrawer.jsx`) carry `data-lenis-prevent` so wheel scrolling inside them still works.
- **Lazy loading:** `pages/Home.jsx` loads the hero with `lazy()`, so gsap's ScrollTrigger and the hero code are fetched only on the homepage.

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

One GSAP timeline, driven by one ScrollTrigger, owns everything: the frame counter tweens from 0 to 241 across the whole timeline (duration 1), and the cards sit at fixed positions inside it. `gsap.matchMedia()` gives phones and desktops different choreography from the same DOM.

Desktop (1024 px and up), matching your original layout: the tree is centred, cards sit on either side.

| Timeline position | What happens | Video content |
|---|---|---|
| 0.00 | Heritage card on the left (eyebrow, headline, text, buttons, badges, scroll hint) | Empty stage, snow |
| 0.02 – 0.06 | Scroll hint fades out | Trunk starts to rise |
| 0.50 – 0.62 | Craftsmanship card slides in on the right | Branches, lights, ornaments |
| 0.62 – 1.00 | Both cards stay | Fully decorated tree with gifts |

Phones: the tree fills the screen, so cards take turns at the bottom.

| Timeline position | What happens | Video content |
|---|---|---|
| 0.00 – 0.14 | Heritage card | Empty stage |
| 0.14 – 0.24 | Heritage card fades out | Trunk and first branches |
| 0.36 – 0.72 | Craftsmanship card in, then out | Branches, lights, ornaments |
| 0.80 – 1.00 | Heritage card returns without the paragraph, so the finished tree stays visible | Fully decorated tree with gifts |

Scrolling never causes a React render. Frame state lives in a ref, and the only React state updates come from the loader (throttled to every 8 frames).

## Loading strategy

1. Frame 1 is requested alone with `fetchPriority="high"` and shown as soon as it decodes (the canvas fades in).
2. The last frame is next, so a fast scroller still sees the finished tree.
3. The rest load in a coarse-to-fine order: every 32nd frame, then 16th, 8th, 4th, 2nd, then all. After about 10 requests the whole scroll range is covered, and it gets smoother as gaps fill in.
4. Six requests run in parallel. Each frame is fetched as a compressed `Blob` and kept (~23 MB desktop, ~12 MB mobile).
5. Only a window around the playhead is decoded: ±12 frames on desktop, ±10 on mobile (`keepDecoded`), via `createImageBitmap(blob)`, which decodes on a background thread. Frames that leave the window are `close()`d. `draw()` never triggers a decode.
6. If the exact frame is not decoded yet, the nearest decoded frame is drawn. When a closer frame arrives, the canvas redraws itself.
6. A 1 px gold line at the bottom of the hero shows load progress, then fades out.

The frame set is chosen once on mount: `desktop` when viewport width × device pixel ratio is over 1300 px, otherwise `mobile`. Data-saver mode always gets `mobile`.

Optional: add this to `index.html` so the first frame starts downloading before React boots.

```html
<link rel="preload" as="image" href="/frames-v2/desktop/frame_0001.webp" fetchpriority="high" />
```

Not used in this project: `index.html` serves every route (shop, admin, …), and phones use the `mobile` set, so a global preload of the desktop frame would mostly be wasted bandwidth.

## Performance rules for 60–120 fps

At 120 Hz each frame has about 8 ms of budget. These rules keep the hero well inside it.

- Crossfade between adjacent frames. There is one video frame per ~13 px of scroll, so a slow scroll used to update the tree only 4–11 times a second (it looked like stop-motion). `draw()` now blends frame *n* and *n+1* by the fractional position (alpha quantised to 1/16), so the image changes smoothly on every scroll tick.
- Draw only on change. `draw()` returns early when the frame pair and blend step are the same as last time.
- Never decode on the main thread. Drawing an `<img>` whose decoded pixels the browser has evicted (or calling `createImageBitmap(<img>)`) decodes synchronously: measured at ~55 ms per 1080p WebP on Intel UHD, which caused 50–70 ms scroll stalls. Decoding from a `Blob` avoids that (measured after the change: no long tasks, p95 frame time 7.7 ms at 144 Hz).
- Canvas context uses `{ alpha: false }`, which lets the browser skip compositing transparency.
- Device pixel ratio is capped at 2. A 3× phone would otherwise push 2.25× more pixels with no visible gain.
- Copy beats animate only `opacity` and `transform` (GPU-composited), and use `will-change`.
- The sticky wrapper has `contain: layout paint`, which isolates repaints from the rest of the page.
- No `backdrop-filter` or large `blur()` over the canvas. They re-run every frame and are the most common cause of dropped frames in heroes like this. The legibility scrim is a plain gradient.
- `gsap.ticker.lagSmoothing(0)` keeps the scrub locked to scroll after a tab switch or a slow frame.
- `ScrollTrigger.config({ ignoreMobileResize: true })` plus `svh` units stop the mobile address bar from triggering recalculations while scrolling.
- On touch devices `scrub: 0.5` adds a short catch-up so native momentum scrolling does not look stepped. On desktop Lenis already smooths input, so scrub is `true` (no double smoothing).

Memory: a decoded 1080p frame is ~8 MB (720p ~3.7 MB). Do not convert all frames to `ImageBitmap` up front; 242 decoded 1080p bitmaps would need roughly 2 GB. The decoded window costs ~200 MB on desktop and ~80 MB on phones; lower `keepDecoded` if that is too much, at the cost of less look-ahead on fast scrolls.

## Responsive and accessibility

- Canvas uses cover-fit centred on the tree, so it stays in frame from ultrawide monitors down to portrait phones.
- Cards sit left and right of the tree on desktop (the video has empty space there) and at the bottom on phones. Card backgrounds are plain translucent fills, not `backdrop-filter`, so they cost nothing per frame.
- `prefers-reduced-motion`: Lenis is disabled, the section collapses to one screen, the last frame (finished tree) is shown statically, and both cards are shown stacked (side by side on desktop) with no animation.
- Canvas is `aria-hidden`. The real content is in HTML: one `h1`, `h2`s for later beats, and real links for CTAs with visible focus rings.
- Safe-area inset is respected at the bottom on notched phones.

## Integration

In this project (already done):

1. Frames in `public/frames-v2/`, components in `src/components/`.
2. `gsap`, `@gsap/react` and `lenis` are in `package.json`.
3. `layout/RootLayout.jsx` wraps the storefront in `<SmoothScroll>`; `pages/Home.jsx` lazy-loads `<ScrollTreeHero />` as the first section.
4. Content and links: edit `heroContent.js`. Button links are `/shop` and `/tree-studio`; the `shopHref` and `studioHref` props override them.
5. Fonts: headings use the `font-serif` token (`HEADING` constant in `HeroCards.jsx`), small labels use `font-mono`. Body text inherits `font-sans`.
6. The navbar is sticky, not fixed, so the stage sits under it (see "Header offset" above).

Needs Tailwind 3.4+ or v4 (`h-svh`, `min-h-svh`). On older versions replace those with `h-screen` / `min-h-screen`. Only standard utilities and arbitrary values are used, so no config changes are needed.

## Tuning

| What | Where | Effect |
|---|---|---|
| Scroll length | `scrollLength` prop (default `450`) | Higher = slower growth per scroll. 350–600 is the useful range. |
| Wheel feel | `lerp` in `SmoothScroll.jsx` (default `0.1`) | 0.07 floatier, 0.15 snappier. |
| Touch catch-up | `scrub` in `ScrollTreeHero.jsx` | 0.3 tighter, 0.8 smoother. |
| Card timing | Positions (0.5 on desktop; 0.14 / 0.36 / 0.62 / 0.8 on phones) in the timeline | Move cards to match specific moments in the video. |
| Card size and position | `POS` constant in `ScrollTreeHero.jsx` | Width uses `clamp()` so cards stay clear of the tree between 1024 px and ultrawide. |
| Frame-set cutoff | `pickFrameSet()` | Raise 1300 to send more devices the lighter set. |
| Parallel requests | `concurrency` in `useFrameSequence` | 4–8. Higher helps on HTTP/2 hosts. |

## Deployment

- Serve `/frames-v2/*` with long cache headers, e.g. `Cache-Control: public, max-age=31536000, immutable`. If you replace the frames later, rename the folder again (e.g. `frames-v3`, and update `getSrc`) so users do not see stale ones.
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
