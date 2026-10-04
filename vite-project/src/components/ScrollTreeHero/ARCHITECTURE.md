# Hero scroll animation: architecture

The hero plays a 150-frame image sequence of a Christmas tree growing from its base, scrubbed by scroll. Scrolling down grows the tree; scrolling up reverses it. Your original hero content (heritage card and Craftsmanship Standards card) sits over it without covering the tree.

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
  frames-v3/
    desktop/frame_0001.webp … frame_0150.webp   1920×1080, ~14 MB total
    mobile/frame_0001.webp  … frame_0150.webp   1280×720,  ~9 MB total
    desktop-small/…                              480×270,   ~1.9 MB total  (stand-ins for fast scrolling)
    mobile-small/…                               320×180,   ~1.1 MB total
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

Frames live in `public/` so Vite serves them untouched with stable URLs. They should not be imported through the bundler. The folder is `frames-v3` (set by `FRAMES_DIR` in `ScrollTreeHero.jsx`). It is versioned on purpose: when the frames change, use a new folder name so browsers and CDNs fetch fresh copies instead of serving the old video.

### Differences from the stock package in this project

- **Icons:** the package ships `Icons.jsx` (hand-written SVG). This project's rule is that icons come from npm packages, so `HeroCards.jsx` maps the icon names in `heroContent.js` to `lucide-react` components (`ShieldCheck`, `Zap`, `Truck`, `TreePine`, `Sparkles`, `ArrowRight`, `Star`). `Icons.jsx` is not used.
- **Links:** CTAs are React Router `<Link>`s pointing at `/shop` and `/tree-studio`, not plain `<a>` tags.
- **Theme:** cards use the site's Tailwind tokens (`font-serif` = Cinzel, `font-mono` = Space Mono, `gold-*`, `text-secondary`) instead of the package's hex palette. The canvas background stays `#0B1A14` to match the video's edges.
- **Header offset:** `layout/Header.jsx` is `sticky`, not fixed. Its height is one CSS variable, `--header-h` (76px, set on `html` in `styles/index.css`), used by the header, by `pages/Home.jsx` (loading placeholder) and by this hero (stage `sticky top-[var(--header-h)] h-[calc(100svh-var(--header-h))]`). The ScrollTrigger `start` is a function that reads the stage's resolved `top`, so it follows the variable, in any unit, and re-reads it on every refresh. To change the header height, change the variable only.
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
          renderState.frame 0 → 149        copy beats (opacity / y)
                        │
                        ▼
      draw(): only if the chosen image changed
                        │
                        ▼
      one ctx.drawImage() onto a <canvas> (object-fit: cover math)
```

Layout is a tall section (`450svh` by default) with a `position: sticky` viewport-sized child inside. Sticky keeps the canvas pinned without ScrollTrigger's `pin`, so there are no pin-spacers and no layout jumps on refresh.

One GSAP timeline, driven by one ScrollTrigger, owns everything: the frame counter tweens from 0 to 149 across the whole timeline (duration 1), and the cards sit at fixed positions inside it. `gsap.matchMedia()` gives phones and desktops different choreography from the same DOM.

Desktop (1024 px and up), matching your original layout: the tree is centred, cards sit on either side.

| Timeline position | What happens | Video content |
|---|---|---|
| 0.00 | Heritage card on the left (eyebrow, headline, text, buttons, badges, scroll hint) | Empty stage, snow |
| 0.02 – 0.06 | Scroll hint fades out | Trunk starts to rise |
| 0.50 – 0.62 | Craftsmanship card slides in on the right | Branches, lights, ornaments |
| 0.62 – 1.00 | Both cards stay | Fully decorated tree with gifts |
| 0.00 – 1.00 | Parallax: heritage card drifts up ±32 px, craftsmanship card ±12 px (from 0.5) | Tree holds still, so the cards read as layers in front of it |

The parallax drift is capped by the free space above and below each card (re-measured on resize), so it shrinks to 0 on short screens instead of pushing a card out of the stage. `transform` only; reduced motion and phones have none.

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
2. Then every small frame (`frames-v3/desktop-small` or `mobile-small`, see below): about 1.9 MB / 1.1 MB for all 150, so the whole scroll can be scrubbed within about a second.
3. The sharp frames follow: the last frame first (a fast scroller still sees the finished tree), then a coarse-to-fine order: every 32nd frame, then 16th, 8th, 4th, 2nd, then all. After about 10 requests the whole scroll range is covered, and it gets smoother as gaps fill in.
4. Six requests run in parallel. Each frame is fetched as a compressed `Blob` and kept (~23 MB desktop, ~12 MB mobile).
5. Only a window around the playhead is decoded: 25 frames on desktop, 21 on mobile (`2 × keepDecoded + 1`), weighted ¾ ahead in the scroll direction and ¼ behind, via `createImageBitmap(blob)`, which decodes on a background thread. Frames that leave the window are `close()`d, except the one closest to the playhead. `draw()` never triggers a decode.
   - At most 4 decodes run at once (`MAX_DECODES_IN_FLIGHT`). Each free slot takes the most useful frame for where the playhead is *now*: the next few frames, then every 4th frame ahead, then every 2nd, then the rest, then behind. Launching the whole window at once (the old behaviour) queued up to 25 1080p decodes, most finished after the playhead had moved on, and a fast wheel spin froze the tree for most of the scroll.
   - A decode that finishes after a fast scroll has passed it is still kept if it's the closest frame to the playhead, so the picture keeps moving instead of freezing.
   - Measured (Intel UHD, 1920×969, 144 Hz): fast wheel spin 144 → 13 frames behind at p95, frozen 84% → 31% of moving frames; normal fast scrolling missed frames 15% → 3%; decode time 65–300 ms → ~35 ms. Raising the in-flight limit to 8–25 made frame pacing worse, not better.
   - **Small frames.** Even with that scheduling, a scroll faster than ~100 frames/s (about 25 wheel notches per second; the track is only ~14 px of scroll per frame) outruns what the sharp decoder can deliver, so the picture trailed behind and then jumped (50 notches/s: 30–39% of refreshes more than 3 frames behind). Every frame therefore also has a small twin: `frames-v3/desktop-small/` (480×270, ~13 KB each) and `mobile-small/` (320×180, ~7 KB each). All of them are kept decoded for good (~78 MB desktop / ~35 MB phone) and are drawn when the sharp frame isn't ready; the sharp frame replaces them as soon as it is. Measured: picture more than 3 frames behind 30% → 0% at every speed, fling 12 frames behind / 29% frozen → 0.1 / 0%, end-of-scroll landing 0% stand-in frames.
     - They are separate small files on purpose. Making them by resizing the sharp frames in the browser was tried first: every one is a full 1080p decode, so it took 4–10 s, slowed the sharp decodes ~2.5× and dropped 24–30% of refreshes.
     - They are drawn with `imageSmoothingQuality = "low"` (`smoothingFor` in `ScrollTreeHero.jsx`). A stretched small frame is soft either way, and the "high" filter on it made a fling drop 10% of refreshes (2% with "low").
     - Regenerate them if the sharp frames change (see "Regenerating the small frames"). Missing or corrupt small files are skipped, not retried forever; the sharp frames still work on their own.
     - Replaced the earlier "tail" (last N frames kept sharp): the small frames cover the ending too, with less memory.
   - Downloads are retried twice (400 ms, then 800 ms) on network errors, 5xx and 429. A 404 is not retried. A frame that still fails is skipped and the nearest decoded frame stands in. A decode that finishes after the sequence was replaced (React StrictMode in development, or reduced motion switched on or off) is discarded without touching the new sequence's bookkeeping.
   - With `prefers-reduced-motion` the loader runs in `lastFrameOnly` mode: one request (the finished tree) instead of 150 (~14 MB desktop), and the progress line is complete as soon as it arrives.
   - **Full quality.** Decoding every sharp frame up front gives full 1080p at any scroll speed (no soft stand-ins), at ~8 MB per frame: ~1.2 GB for 150 frames (measured on the earlier 242-frame video: +1.9 GB, browser +3.1 GB after scrolling). `decodeAll` in `useFrameSequence`, switched on in `ScrollTreeHero.jsx` only for the desktop set on browsers reporting `navigator.deviceMemory >= 8` (Chrome and Edge; Safari and Firefox report nothing and keep the small-frame behaviour). Phones never use it. To turn it off, remove `decodeAll: fullQuality`.
6. Drawing picks the sharp frame, else its small twin, else the nearest decoded frame of either kind. When a better one arrives, the canvas redraws itself.
7. A 1 px gold line at the bottom of the hero shows load progress, then fades out.

The frame set is chosen once on mount: `desktop` when viewport width × device pixel ratio is over 1300 px, otherwise `mobile`. Data-saver mode always gets `mobile`.

Optional: add this to `index.html` so the first frame starts downloading before React boots.

```html
<link rel="preload" as="image" href="/frames-v3/desktop/frame_0001.webp" fetchpriority="high" />
```

Not used in this project: `index.html` serves every route (shop, admin, …), and phones use the `mobile` set, so a global preload of the desktop frame would mostly be wasted bandwidth.

## Performance rules for 60–120 fps

At 120 Hz each frame has about 8 ms of budget. These rules keep the hero well inside it.

- Crossfade between adjacent frames. There is one video frame per ~13 px of scroll, so a slow scroll used to update the tree only 4–11 times a second (it looked like stop-motion). `draw()` now blends frame *n* and *n+1* by the fractional position (alpha quantised to 1/16), so the image changes smoothly on every scroll tick.
- Draw only on change. `draw()` returns early when the frame pair and blend step are the same as last time.
- Never decode on the main thread. Drawing an `<img>` whose decoded pixels the browser has evicted (or calling `createImageBitmap(<img>)`) decodes synchronously: measured at ~55 ms per 1080p WebP on Intel UHD, which caused 50–70 ms scroll stalls. Decoding from a `Blob` avoids that (measured after the change: no long tasks, p95 frame time 7.7 ms at 144 Hz).
- Canvas context uses `{ alpha: false }`, which lets the browser skip compositing transparency.
- The canvas is never larger than the frames: pixel ratio is capped at 2 and at the frame size (`NATIVE` in `ScrollTreeHero.jsx`), because with cover-fit one canvas pixel per frame pixel is all the detail there is. Measured canvas size: 1440×900 at 2× drops 4.75 → 2.04 MP, a 3× phone 1.20 → 0.30 MP. At 1× (a plain 1080p monitor) nothing changes.
- Copy beats animate only `opacity` and `transform` (GPU-composited), and use `will-change`.
- The sticky wrapper has `contain: layout paint`, which isolates repaints from the rest of the page.
- No `backdrop-filter` or large `blur()` over the canvas. They re-run every frame and are the most common cause of dropped frames in heroes like this. The legibility scrim is a plain gradient.
- `gsap.ticker.lagSmoothing(0)` keeps the scrub locked to scroll after a tab switch or a slow frame.
- `ScrollTrigger.config({ ignoreMobileResize: true })` plus `svh` units stop the mobile address bar from triggering recalculations while scrolling.
- On touch devices `scrub: 0.5` adds a short catch-up so native momentum scrolling does not look stepped. On desktop Lenis already smooths input, so scrub is `true` (no double smoothing).

Memory: a decoded 1080p frame is ~8 MB (720p ~3.7 MB). Do not convert all frames to `ImageBitmap` up front; 150 decoded 1080p bitmaps need roughly 1.2 GB. The decoded sharp window costs ~200 MB on desktop and ~63 MB on phones, plus the small frames (~78 MB / ~35 MB); lower `keepDecoded` if that is too much, at the cost of less look-ahead on fast scrolls.

Measured browser memory (sum of all Chrome processes, headless Chrome on Intel UHD): the page adds ~420 MB on desktop / ~220 MB on a phone viewport at idle, then grows to about +1.2 GB / +1.0 GB after scrolling the whole hero. That growth is in Chrome's **GPU process** (189 → 1011 MB; the page's renderer only grows ~90 MB), it plateaus rather than climbing, and it is the same without the small frames and with the original committed hero, so it is Chrome caching a texture for every frame drawn on the canvas, not something the decoded windows hold. Not investigated further; if it matters, the next things to try are drawing from fewer distinct bitmaps or measuring on real devices.

## Responsive and accessibility

- Canvas uses cover-fit centred on the tree, so it stays in frame from ultrawide monitors down to portrait phones.
- Cards sit left and right of the tree on desktop (the video has empty space there) and at the bottom on phones. Card backgrounds are plain translucent fills, not `backdrop-filter`, so they cost nothing per frame.
- `prefers-reduced-motion`: Lenis is disabled, the section collapses to one screen, the last frame (finished tree) is shown statically, and both cards are shown stacked (side by side on desktop) with no animation.
- Canvas is `aria-hidden`. The real content is in HTML: one `h1`, `h2`s for later beats, and real links for CTAs with visible focus rings.
- Safe-area inset is respected at the bottom on notched phones.

## Integration

In this project (already done):

1. Frames in `public/frames-v3/`, components in `src/components/`.
2. `gsap`, `@gsap/react` and `lenis` are in `package.json`.
3. `layout/RootLayout.jsx` wraps the storefront in `<SmoothScroll>`; `pages/Home.jsx` lazy-loads `<ScrollTreeHero />` as the first section.
4. Content and links: edit `heroContent.js`. Button links are `/shop` and `/tree-studio`; the `shopHref` and `studioHref` props override them.
5. Fonts: headings use the `font-serif` token (`HEADING` constant in `HeroCards.jsx`), small labels use `font-mono`. Body text inherits `font-sans`.
6. The navbar is sticky, not fixed, so the stage sits under it (see "Header offset" above).

Needs Tailwind 3.4+ or v4 (`h-svh`, `min-h-svh`). On older versions replace those with `h-screen` / `min-h-screen`. Only standard utilities and arbitrary values are used, so no config changes are needed.

## Tuning

| What | Where | Effect |
|---|---|---|
| Scroll length | `scrollClass` prop (default `h-[450svh]`) | A Tailwind height class, written out in full (e.g. `h-[600svh]`) so Tailwind can see it. Higher = slower growth per scroll; 350–600 is the useful range. |
| Wheel feel | `lerp` in `SmoothScroll.jsx` (default `0.1`) | 0.07 floatier, 0.15 snappier. |
| Touch catch-up | `scrub` in `ScrollTreeHero.jsx` | 0.3 tighter, 0.8 smoother. |
| Card timing | Positions (0.5 on desktop; 0.14 / 0.36 / 0.62 / 0.8 on phones) in the timeline | Move cards to match specific moments in the video. |
| Card size and position | `POS` constant in `ScrollTreeHero.jsx` | Width uses `clamp()` so cards stay clear of the tree between 1024 px and ultrawide. |
| Frame-set cutoff | `pickFrameSet()` | Raise 1300 to send more devices the lighter set. |
| Parallel requests | `concurrency` in `useFrameSequence` | 4–8. Higher helps on HTTP/2 hosts. |
| Parallax strength | `PARALLAX` in `ScrollTreeHero.jsx` (`hero: 32, craft: 12` px) | 0 turns it off; above ~48 the cards start to feel detached. |
| Small frames | `previewSrc` / `SMALL_SUFFIX` in `ScrollTreeHero.jsx`, files in `public/frames-v3/*-small/` | Remove `previewSrc` to turn them off (fast scrolls then lag again above ~100 frames/s). Smaller files = less memory, softer fast scrolls. |
| Header height | `--header-h` in `styles/index.css` (76px) | Header, Home placeholder and hero all follow it. |
| Unknown icon name | `iconFor()` in `HeroCards.jsx` | Falls back to the sparkles icon (and warns in development) instead of crashing. |

## Rebuilding the frames from a video

`scripts/make-frames.mjs` builds all four folders (`desktop`, `mobile`, `desktop-small`, `mobile-small`) from one video with ffmpeg (no other tools): `node scripts/make-frames.mjs <video.mp4> --frames 150 --out frames-v3`. It picks that many frames evenly across the video (first and last included), removes the Gemini sparkle in the bottom-right corner, and writes `frame_0001.webp`, ... After running it: set `FRAME_COUNT` in `ScrollTreeHero.jsx` to the same number, and use a new `--out` name with the same `FRAMES_DIR`, so browsers refetch.

Watermark removal uses ffmpeg `removelogo` with a mask drawn as a 4-point star at (1740, 900), 92 px across. A plain rectangle (`delogo`) smeared branches and snowflakes touching its edge. The sparkle sits at the same spot in every frame of 1920×1080 Gemini videos; for other sizes or positions change `WATERMARK` in the script. Checked on this video: the sparkle spot averaged brightness 74–91 before and at most 37 after, in all 150 frames.

The card timings (0.5 on desktop; 0.14 / 0.36 / 0.62 / 0.8 on phones) are positions in the timeline, not frames, so they still apply with a different frame count, but check them against the new video.

## Deployment

- Serve `/frames-v3/*` with long cache headers, e.g. `Cache-Control: public, max-age=31536000, immutable`. If you replace the frames later, rename the folder again (e.g. `frames-v4`, and update `FRAMES_DIR`) so users do not see stale ones. The new `desktop-small` / `mobile-small` folders are part of this: deploy them with the rest of `public/`, or the site silently falls back to sharp frames only (and fast scrolls lag again).
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
