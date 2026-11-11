# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Raave's Evergreen: a storefront and admin dashboard for a Christmas-tree retailer. React 19, Vite 8, Tailwind CSS v4 and react-router-dom 7, written in plain JS/JSX with no TypeScript. Its data lives in the shop API, `ecommerce/backend` (FastAPI); that folder's `README.md` is the contract this app is written against (paths, request and response shapes).

This app lives at `ecommerce/frontend/` in the repo. All paths and commands below are relative to that folder. The other folders (`ecommerce/backend`, `billing/`) are described in the root `README.md`.

## Commands

```bash
npm run dev       # Vite dev server
npm run build     # production build to dist/
npm run lint      # ESLint (flat config, react-hooks + react-refresh rules)
npm run preview   # serve dist/
```

There is no test suite. Verify changes with `npm run lint`, `npm run build`, and by viewing the page in a browser at several widths, with the API running (`ecommerce/backend`, port 8001). For the hero's mobile video, use Chrome rather than the bundled Playwright Chromium, which has no H.264.

**`VITE_API_URL`** is the API's address up to and including `/api/v1` (default `http://localhost:8001/api/v1`; see `.env.example`). Vite bakes it in at build time, so the hosting (Cloudflare Pages) sets it as a build environment variable.

Asset scripts need `ffmpeg` and `ffprobe` on PATH:

```bash
node scripts/make-frames.mjs <video> [--frames N]        # desktop hero frames  -> public/frames-<id>/,     src/data/heroFrames.json
node scripts/make-frames.mjs <video> --alt [--frames N]  # alternate frame set  -> public/frames-alt-<id>/, src/data/heroFramesAlt.json
node scripts/make-mobile-video.mjs <video>               # phone hero video     -> public/hero-mobile-<id>.mp4/.webp, src/data/heroMobileVideo.json
node scripts/scrape-site.mjs                             # one-off: scrape christmasraave.in -> src/data/products.js, categories.js
```

- **Generated files:** each script writes a new timestamped name, deletes the older output of the same set, and rewrites the JSON manifest that the hero imports. Never hand-edit the manifests or hardcode frame counts.
- **`public/` is git-ignored** (frames, videos; the old product photos and `logo.svg` were force-added before the API). The live site must not depend on anything in it: product and category photos come from the API, and the logo and favicon are imported from `src/assets/`. `npm run build` works from a clean checkout.

## Architecture

**Two route trees** live in `src/App.jsx`, and every page is `React.lazy()`:
- **Storefront:** under `layout/RootLayout.jsx`, which provides the Header, Footer, CartDrawer, ToastContainer, SantaLayer, and SmoothScroll (Lenis on GSAP's ticker).
- **Admin:** `/admin/*` under `admin/layout/AdminLayout.jsx`, with its own sidebar and topbar and native scrolling.

`src/admin/**` must stay isolated from the storefront: it has its own contexts and never uses the storefront's (`context/`, `auth/`) or its pages and layout parts. It does share the plain UI primitives in `components/` (Button, FormField, Input, Modal…) and `lib/` (the API client, validation, formatting), and the storefront never imports from `src/admin`.

**Data and state:**
- **API client** (`lib/api.js`): `api(path, { method, body, token })` speaks JSON and throws `Error(detail)` with `status`; `upload()` sends a photo with progress. Both the storefront and the admin use it.
- **A plain online store:** every product on the website is added to the cart and paid for online with Razorpay. There are no quote requests and no "price on request": a product without a price isn't for sale yet, and the API leaves it out of the storefront (the admin still sees it, marked "Hidden: no price"). An out-of-stock product (`inStock: false`) is shown with an "Out of Stock" badge and a disabled button.
- **Catalogue** (`context/StorefrontContext.jsx`): `GET /storefront` once per visit gives the products, categories, showrooms, testimonials and delivery settings. The last copy is kept in localStorage (`raave-storefront`) so a reload paints at once; `components/StorefrontGate.jsx` (in RootLayout) shows a loader, or a friendly error with a retry, only when there is no copy yet. It adds the "All Collections" category (`id: 'all'`) and fills in missing photos.
  - `src/data/products.js`, `categories.js`, `showrooms.js` and `testimonials.js` are no longer read by the site: they seed the backend's database. `data/home.js` and the other data files are page copy.
  - Prices are rupees with GST (`lib/catalogue.js`, `lib/format.js`, `components/Price.jsx`, which strikes through a higher MRP). Never invent prices.
- **Global state:** Context plus `hooks/useLocalStorage.js`, with no state library.
  - Providers are in `main.jsx`: Toast → Storefront → CustomerAuth → Cart → Wishlist.
  - `SantaProvider` is mounted inside RootLayout.
- **Customer auth** (`auth/context/CustomerAuthContext.jsx`): the API's accounts. The token is in localStorage (`raave-customer-token`, checked with `GET /auth/me` on load and dropped on a 401), the profile beside it (`raave-customer`). Actions answer `{ ok, error }`; `request()` is the API call with the customer's token. Pages: sign in / up, `/forgot-password`, `/reset-password?token=…`, `/account` (profile, password, orders) and `/account/orders/:id`. Cart, checkout and order pages are wrapped in `auth/RequireCustomer.jsx`.
- **Cart** (`context/CartContext.jsx`): `[{ productId, quantity }]` in localStorage (`raave-cart`), shown with the current product from the storefront data. `cart` holds the lines that can be bought; `unavailable` the ones out of stock or gone from the shop, which `components/UnavailableItems.jsx` calls out (cart, drawer, checkout) with a way to remove them. Totals add `settings.deliveryFee` (free from `freeDeliveryOver`).
- **Checkout** (`pages/Checkout.jsx`, `components/checkout/`): the delivery address, then payment with Razorpay (`PayOnline`: `POST /orders` with an id kept in sessionStorage for retries, Razorpay Checkout via `lib/razorpay.js`, then `POST /orders/<id>/verify`). It won't take payment while the cart has unavailable lines (the server would refuse them).
- **Enquiries** (`POST /enquiries`): only the Contact page's ConsultForm (a `consult` enquiry); they aren't price quotes. The admin still shows older `quote-request` enquiries from before the shop sold online.
- **Admin auth** (`admin/context/AdminAuthContext.jsx`): `POST /admin/login`, token in localStorage (`raave-admin-token`, checked with `GET /admin/me`).
- **Admin data** (`admin/context/AdminDataContext.jsx`): the catalogue (`GET /admin/catalogue`, hidden items too), showrooms and testimonials, each `{ items, create, update, remove, reorder }` and loaded again after every change. Orders, enquiries and customers are loaded by their own pages (`admin/useAdminList.js`). Photos are uploaded as soon as they are chosen (`admin/components/usePhotoUploads.js`).

**Home page** (`pages/Home.jsx`): a product-led shop front, the "Storefront" design the client chose from five (the other four are in commit cddbe5f). Its sections are in `components/home/`, and their copy is in `data/home.js`.
- **Content vs. look:** the words (brand story, why choose us, vision/mission, stores in `data/showrooms.js`, stories in `data/stories.js`) come from the old site, christmasraave.in. The logo, photos and product images are ours: never take images from the old site. The colour palette (ivory, deep evergreen, antique gold) follows the old site's, at the client's request.

**Cinematic hero** (`components/CinematicHero/`): not used on the site (the client asked for the hero to go). The code is kept in case it is wanted back.
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
  - The default palette is light. `.theme-dark` restores the dark one: it is on the (unused) cinematic hero and, for `/admin` routes, on `<html>` (`App.jsx`). It is also on every section or panel that shows one of the dark green background photos (`PageBackdrop` pages except Why Raave, Contact and Showrooms, whose backgrounds are ivory: the product page, checkout, the 404 page and `StorefrontGate`'s error; the stores band, the dark hero slides, the quick-view panel). A component that can sit in either palette uses only tokens (`Price`, `CheckoutList`), never `white`/`black`. The admin pages, always dark, still use `text-white` and `white/` tints.
  - **No washes or fades over photos:** the client wants every photo shown as it is. Put light text (`.theme-dark`) on a dark photo's plain area, or put the words on a solid strip beside the photo (the home promo cards), rather than a gradient over it. For faint lines and tints use `border-contrast/10` and `bg-contrast/5`, not white, and use `text-text-primary` for headings.
  - The `short:` custom variant means max-height 760px.
  - `--header-h` is the header height.
  - Important uses the suffix form, `class!`.
- **Icons:** every icon comes from a package.
  - `lucide-react` for UI icons.
  - `react-icons` only for what lucide lacks, such as brand logos.
  - No hand-written `<svg>` unless no package has the icon.
- **Reuse primitives:** use the components in `components/` (Button, Eyebrow, FormField, Modal, Decoration, Price…). Every form wraps its fields in `FormField`.
- **Ornaments:** the client's transparent cut-outs in `assets/decorations` (pine corners, the snowflake bauble, the footer corners) go in a `Decoration` with `fade="none"` and `imgClassName="object-contain!"` (add `-scale-x-100` to mirror a corner), sized with the `aspect-[w/h]` its import comment gives. `HangingBauble` hangs the bauble on a gold string from a section's top. Side ornaments only show where the margin beside the 1360px column can hold them (`hidden min-[1600px]:block`), so they never cover content.
- **React 19 refs:** `ref` is passed as a normal prop with `useImperativeHandle`, and `forwardRef` is not used.
- **Header breakpoint:** the desktop nav switches on at `xl` (1280px) because the bar's minimum content width is about 1260px. If you add anything to the header, sweep widths from 320 to 1920 and compare `document.documentElement.scrollWidth` against the viewport width.
- **Header spacing:** keep the gap between the header and page content tight on every page.

## Docs and files to know about

- **`architecture.md`:** the original design document, covering the folder layout, routing tables, state and the admin scope. Its hero section, which describes `ScrollTreeHero`, `frames-v3` and GSAP ScrollTrigger, is **out of date**. The hero is now `CinematicHero`, as described above.
- **The two client PDFs** (`RaavesEvergreen_Proposal.pdf` and `RaavesEvergreen_Project_Schedule.pdf`) are client documents. Never modify them.
- **The `*.mp4` files** in the project root are hero source videos, the inputs to the scripts above.
