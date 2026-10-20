# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Raave's Evergreen: a storefront and admin dashboard for a Christmas-tree retailer. It is **frontend only**: React 19, Vite 8, Tailwind CSS v4 and react-router-dom 7, written in plain JS/JSX with no TypeScript. There is no backend. Every bit of "persistence" is localStorage.

This app lives at `ecommerce/frontend/` in the repo. All paths and commands below are relative to that folder. The other folders (`ecommerce/backend`, `billing/`) are described in the root `README.md`.

## Commands

```bash
npm run dev       # Vite dev server
npm run build     # production build to dist/
npm run lint      # ESLint (flat config, react-hooks + react-refresh rules)
npm run preview   # serve dist/
```

There is no test suite. Verify changes with `npm run lint`, `npm run build`, and by viewing the page in a browser at several widths. For the hero's mobile video, use Chrome rather than the bundled Playwright Chromium, which has no H.264.

Asset scripts need `ffmpeg` and `ffprobe` on PATH:

```bash
node scripts/make-frames.mjs <video> [--frames N]        # desktop hero frames  -> public/frames-<id>/,     src/data/heroFrames.json
node scripts/make-frames.mjs <video> --alt [--frames N]  # alternate frame set  -> public/frames-alt-<id>/, src/data/heroFramesAlt.json
node scripts/make-mobile-video.mjs <video>               # phone hero video     -> public/hero-mobile-<id>.mp4/.webp, src/data/heroMobileVideo.json
node scripts/scrape-site.mjs                             # one-off: scrape christmasraave.in -> src/data/products.js, categories.js
```

- **Generated files:** each script writes a new timestamped name, deletes the older output of the same set, and rewrites the JSON manifest that the hero imports. Never hand-edit the manifests or hardcode frame counts.
- **`public/` is git-ignored:** frames, videos, product images and the logo are not in the repo.

## Architecture

**Two route trees** live in `src/App.jsx`, and every page is `React.lazy()`:
- **Storefront:** under `layout/RootLayout.jsx`, which provides the Header, Footer, CartDrawer, ToastContainer, SantaLayer, and SmoothScroll (Lenis on GSAP's ticker).
- **Admin:** `/admin/*` under `admin/layout/AdminLayout.jsx`, with its own sidebar and topbar and native scrolling.

`src/admin/**` must stay isolated from the storefront. It imports only `src/data/**` and its own contexts, and never `layout/`, `components/` or `pages/`. The reverse also holds.

**Data and state:**
- **Catalogue:** static modules in `src/data/*.js`.
  - `products.js` and `categories.js` are scraped.
  - `showrooms.js` and `testimonials.js` were migrated by hand.
  - The live site has no prices, so every product is `priceOnRequest: true` and the UI says "Enquire for Price". Never invent prices.
- **Global state:** Context plus `hooks/useLocalStorage.js`, with no state library.
  - Providers are in `main.jsx`: Toast → CustomerAuth → Cart → Wishlist.
  - `SantaProvider` is mounted inside RootLayout.
- **Checkout and contact:** neither creates an order. Both log an *enquiry* through `lib/enquiries.js` (`raave-enquiries`), which the admin reads.
- **Customer auth** (`auth/context/CustomerAuthContext.jsx`): browser-only, with salted SHA-256 hashes in localStorage. Cart and checkout are wrapped in `auth/RequireCustomer.jsx`.
- **Admin auth** (`admin/context/AdminAuthContext.jsx`): a demo with hardcoded credentials, not real security.
- **Admin edits** (`admin/context/AdminDataContext.jsx`): saved as whole-collection overrides in localStorage (`raave-admin-<key>`), layered over `src/data`. They stay in one browser.

**Cinematic hero** (`components/CinematicHero/`, lazy-loaded inside `pages/Home.jsx`):
- `heroConfig.js` is the single place for the asset manifests, the mobile/desktop media query, the scroll length, the choreography thresholds (fractions of scroll from 0 to 1) and the copy.
- `CinematicHero.jsx` turns a scroll listener and requestAnimationFrame into a 0–1 progress value. It applies that progress by writing styles directly; **scrolling never causes a React re-render**, so keep it that way.
- It uses `MOBILE_QUERY` to mount exactly one visual, so only one kind of asset downloads:
  - **`HeroCanvas.jsx` (desktop):** WebP frames on a canvas, loaded by `useFrameSequence.js`. It crossfades between adjacent frames, cover-fits with the image pinned to the top so the star is never cropped, and caps DPR at 2. `HeroFrameToggle` switches between the `FRAME_SETS`.
  - **`MobileHeroVideo.jsx` (phones and upright tablets):** sets the video's `currentTime` from scroll. If seeking is slow or stalls, it falls back to a single play-through.
- The hero controls the header's visibility through the `--hero-chrome` CSS variable and the `data-hero-chrome-hidden` attribute on `<html>`, which `layout/Header.jsx` reads.
- `RootLayout` fades pages in using opacity only. A transform there would break the hero's sticky stage and every `position: fixed` popup.

## Styling conventions

- **Tailwind v4:** the single entry is `src/styles/index.css`.
  - Brand tokens are declared in `@theme`: `bg-primary`, gold, emerald, ruby, text, the serif/sans/quote/mono fonts, and the eases and animations. Use those tokens, not raw hex values.
  - The `short:` custom variant means max-height 760px.
  - `--header-h` is the header height.
  - Important uses the suffix form, `class!`.
- **Icons:** every icon comes from a package.
  - `lucide-react` for UI icons.
  - `react-icons` only for what lucide lacks, such as brand logos.
  - No hand-written `<svg>` unless no package has the icon.
- **Reuse primitives:** use the components in `components/` (Button, Eyebrow, FormField, Modal, Decoration…). Every form wraps its fields in `FormField`.
- **React 19 refs:** `ref` is passed as a normal prop with `useImperativeHandle`, and `forwardRef` is not used.
- **Header breakpoint:** the desktop nav switches on at `xl` (1280px) because the bar's minimum content width is about 1260px. If you add anything to the header, sweep widths from 320 to 1920 and compare `document.documentElement.scrollWidth` against the viewport width.
- **Header spacing:** keep the gap between the header and page content tight on every page.

## Docs and files to know about

- **`architecture.md`:** the original design document, covering the folder layout, routing tables, state and the admin scope. Its hero section, which describes `ScrollTreeHero`, `frames-v3` and GSAP ScrollTrigger, is **out of date**. The hero is now `CinematicHero`, as described above.
- **The two client PDFs** (`RaavesEvergreen_Proposal.pdf` and `RaavesEvergreen_Project_Schedule.pdf`) are client documents. Never modify them.
- **The `*.mp4` files** in the project root are hero source videos, the inputs to the scripts above.
