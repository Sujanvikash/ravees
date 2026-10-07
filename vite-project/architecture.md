# Raave's Evergreen — Architecture

Rebuild of `D:\raaves-evergreen-r` (a single-page, flat-structure React app) as a proper
multi-page e-commerce site: separated layout/components/pages, Tailwind CSS theme tokens,
`react-router-dom` routing, icon packages instead of hand-written SVG, and route-level lazy
loading.

**Icon rule:** every icon comes from an npm package. Hand-written inline `<svg>` is only
allowed when no package has the icon.
- `lucide-react`: UI icons (search, heart, cart, arrows, trash, and so on).
- `react-icons`: whatever lucide lacks. That means brand logos (`react-icons/fa`: Facebook,
  Instagram, YouTube, WhatsApp) and the Christmas-tree brand mark
  (`react-icons/tb` `TbChristmasTreeFilled`).
- The full wordmark logo is the `public/logo.svg` asset, rendered with `<img>`.

**Hero animation:** `components/ScrollTreeHero/` plays a 150-frame WebP sequence (watermark-free
re-render) from `public/frames-v3/desktop` (1920×1080) or `public/frames-v3/mobile` (1280×720) on a
2D canvas. One GSAP ScrollTrigger timeline scrubs the frames and choreographs the two hero cards;
`components/SmoothScroll/` (Lenis) smooths wheel input for the storefront. Full design, tuning
and performance rules: `src/components/ScrollTreeHero/ARCHITECTURE.md`. This replaced the older
MP4 → JPEG frames + `engines/renderer-4k.js` hero, which has been removed.

The scrub works in both directions. Scrolling down grows the tree, scrolling up rewinds it.
Scrolling never causes a React re-render (frame state lives in a ref). `prefers-reduced-motion`
shows the finished tree statically with both cards.

Data source: scraped from https://www.christmasraave.in/ (WooCommerce, 7 categories, ~76
unique products). The live site publishes no prices, so the UI shows "Enquire for Price"
instead of fabricated numbers.

**Visual UI parity requirement:** the rebuild must look like `D:\raaves-evergreen-r`, not
just borrow its color/font tokens. What changes is the *code organization and tech stack*
(folders, Tailwind instead of hand-written CSS, real routes instead of anchor-scroll
sections, lucide-react instead of inline SVGs) — the *visual result* (layout, spacing,
card/button styling, section designs, the dark-emerald/gold aesthetic, the 250-frame hero
animation) should read as the same site. Concretely:
- Every Tailwind utility combination for a component should reproduce the equivalent rule
  in the old `src/styles/style.css` (e.g. `.product-card`, `.btn-gold`, `.cat-tab-btn`,
  `.showroom-tab-btn`) — check that file's rules for the component being built before
  styling it from scratch.
- Sections that become pages keep their old visual design (`HeroExperience`, `TrustBar`,
  `TreeStudio`, the product grid, `ShowroomsSection`, `HeritageSection`, `Testimonials`)
  — only their container/routing changes, not their look.
- lucide-react icons should be swapped in at the same size/stroke-width the old inline SVGs
  used, so icon rows don't visually shift.
- The admin dashboard (below) is the one part with **no old-project equivalent** — it gets
  its own new visual design (sidebar/topbar admin UI), consistent with the site's Tailwind
  theme tokens but not a port of any existing page.

## Folder structure

```
src/
  main.jsx                  # createRoot + BrowserRouter + Toast/Cart/Wishlist providers
  App.jsx                   # <Routes> tree only — no business logic
  layout/                   # global chrome, mounted once, persists across route changes
    RootLayout.jsx           # Header + <Outlet/> + Footer + CartDrawer + ToastContainer
    Header.jsx
    Footer.jsx
    CartDrawer.jsx
    ToastContainer.jsx
  components/               # reusable UI primitives (stateless where possible)
    ScrollTreeHero/          # 150-frame scroll-scrubbed canvas hero (lazy-loaded inside Home), see its ARCHITECTURE.md
    SmoothScroll/            # Lenis + GSAP ticker; wraps RootLayout (storefront only)
    PageLoader.jsx           # Suspense fallback
    Button.jsx
    FormField.jsx            # label+field wrapper shared by every form on the site
    SearchBar.jsx            # icon+input+Enter-to-submit; shared by Header's two search UIs
    Badge.jsx
    RatingStars.jsx
    SectionHeading.jsx
    ProductCard.jsx
    ProductGrid.jsx
    CategoryTabs.jsx
    PriceTag.jsx             # "Enquire for Price" CTA
    Modal.jsx                # generic backdrop + esc-to-close wrapper
    QuickViewModal.jsx
    ShowroomCard.jsx
    TestimonialCard.jsx
    TrustBadge.jsx
    ConsultForm.jsx
  pages/                    # one component per route, lazy-loaded
    Home.jsx
    Shop.jsx
    ProductDetail.jsx
    TreeStudioPage.jsx
    Cart.jsx
    Checkout.jsx
    Showrooms.jsx
    About.jsx
    Contact.jsx
    Testimonials.jsx
    NotFound.jsx
  context/
    CartContext.jsx          # localStorage-persisted cart
    WishlistContext.jsx      # localStorage-persisted wishlist Set
    ToastContext.jsx
  hooks/
    useLocalStorage.js
  lib/
    enquiries.js             # localStorage enquiry log: storefront writes, admin reads
  auth/                      # customer login/signup — separate from the public site/admin
    pages/
      Login.jsx
      Signup.jsx
      Account.jsx             # protected: redirects to /login if not signed in
    context/
      CustomerAuthContext.jsx  # localStorage customer accounts + session (see State management)
  data/
    products.js               # generated by scripts/scrape-site.mjs
    categories.js              # generated by scripts/scrape-site.mjs
    showrooms.js                # hand-migrated (correct field names)
    testimonials.js              # hand-migrated (not on the live site)
  assets/
    logo.svg
  styles/
    index.css                  # single Tailwind entry, @theme tokens
  admin/                      # internal admin dashboard — separate from the public site
    layout/
      AdminLayout.jsx           # auth guard (redirects to /admin/login) + sidebar/topbar shell + <Outlet/>
      AdminSidebar.jsx
      AdminTopbar.jsx
    pages/
      AdminLogin.jsx
      AdminDashboard.jsx         # overview stat cards (product count, enquiries, low-stock, per-category counts)
      AdminProducts.jsx           # table: list/search/delete products
      AdminProductForm.jsx        # shared add/edit form (create + edit routes)
      AdminCategories.jsx
      AdminShowrooms.jsx
      AdminTestimonials.jsx
      AdminEnquiries.jsx          # cart-checkout + contact-form submissions, with status (new/contacted/closed)
    components/
      DataTable.jsx               # generic sortable/searchable table used by every admin list page
      AdminStatCard.jsx
      ConfirmDialog.jsx
    context/
      AdminAuthContext.jsx        # gated session flag in localStorage (demo-level auth, see note below)
      AdminDataContext.jsx        # merges src/data/*.js with localStorage overrides; exposes CRUD helpers
public/
  frames-v3/desktop|mobile/    # 150 WebP hero frames per set (frame_0001.webp … frame_0150.webp), plus *-small twins
  images/products/             # scraped product photos
  logo.svg
scripts/
  scrape-site.mjs               # one-time Node scraper (run during implementation)
```

**Layout vs. components rule of thumb:** if it is mounted once in `RootLayout` and persists
across every route (nav, footer, cart drawer, toasts), it lives in `layout/`. If it is a
reusable piece of UI instantiated by pages wherever needed (a card, a button, a badge), it
lives in `components/`.

**Forms:** every form on the site (Login, Signup, Checkout, ConsultForm, and every admin
add/edit form) uses `components/FormField.jsx` for its "label above one field" layout — it
only standardizes that wrapper, not the field's own styling, since admin forms intentionally
use a slightly smaller/tighter input (`text-[0.85rem]`, `px-3 py-2`) than the public-facing
ones (`text-[0.88-0.9rem]`, `px-3.5 py-2.5`). Pass `labelClassName` to `FormField` to keep a
form's existing label size when it differs from the 0.78rem default. Only two forms are true
standalone reusable components in the "used in more than one place" sense: `ConsultForm.jsx`
(used by `Contact.jsx`) and `AdminProductForm.jsx` (one file serves both `/admin/products/new`
and `/admin/products/:id/edit`) — every other form is one-off and lives directly in its page.
`components/SearchBar.jsx` similarly de-duplicates the icon+input+Enter-to-submit logic that
`layout/Header.jsx` needs twice (the desktop dropdown and the mobile menu panel); it has no
wrapping element of its own so each call site keeps its own container styling.

## Styling — Tailwind CSS v4

Single entry `src/styles/index.css`, using `@theme` to declare brand color scales as real
Tailwind tokens (ported ~1:1 from the old project's CSS custom properties):

| Token | Hex | Old CSS var |
|---|---|---|
| `--color-bg-primary` | `#05160f` | `--bg-primary` |
| `--color-bg-dark-emerald` | `#082117` | `--bg-dark-emerald` |
| `--color-gold-100` … `600` | `#fff6df` … `#b89146` | `--gold-100` … `--gold-600` |
| `--color-emerald-300` … `700` | `#6ee7b7` … `#047857` | `--emerald-300` … `--emerald-700` |
| `--color-ruby-500` / `600` | `#e11d48` / `#be123c` | `--ruby-500` / `--ruby-600` |
| `--color-text-primary/secondary/muted` | `#f8fafc` / `#9cb3a8` / `#627c70` | same |
| `--font-serif` | Cinzel | display headings |
| `--font-sans` | Outfit | body |
| `--font-quote` | Playfair Display | testimonial quotes |
| `--font-mono` | Space Mono | eyebrow/labels |

Fonts stay loaded via the same Google Fonts `<link>` tags in `index.html`. The old
2286-line hand-written `style.css` is retired entirely; every component uses Tailwind
utility classes built on these tokens (`bg-emerald-500`, `text-gold-300`, `font-serif`, …).

## Data pipeline

`scripts/scrape-site.mjs` (Node, plain `fetch`, no dependencies) crawls christmasraave.in
once during implementation:

1. Fetch all 7 category archive pages + pagination, and all pages of `/shop/`; regex-parse
   product `<li class="product ...">` blocks for slug/title/thumbnail/category classes.
2. Dedupe by slug into a `Map` (a product can sit in multiple sub-categories) — log raw vs.
   deduped counts.
3. Fetch each unique product's detail page for title, description (generated fallback one-
   liner if the site has none), spec table (`sizes` from a `Feet` row), full-res gallery
   image URLs, stock status.
4. Download every gallery image into `public/images/products/<slug>-<n>.<ext>`, preserving
   the real extension; skip existing files (idempotent re-runs).
5. Emit `src/data/products.js` — no fabricated `price`/`rating` fields, `priceOnRequest: true`.
6. Emit `src/data/categories.js` (7 categories, counts from the deduped map).
7. `src/data/showrooms.js` / `testimonials.js` are hand-migrated from the old project's
   `engines/products.js` (not present on the live site).

### Product shape

```js
{
  id, name, category, categoryLabel, description,
  specs: [{ label, value }], sizes: [],
  images: [], image,           // image = images[0]
  inStock, priceOnRequest: true,
  sourceUrl
}
```

## Routing (`react-router-dom`)

Two independent route trees share one router: the public storefront (wrapped in
`RootLayout`) and the internal admin dashboard (wrapped in `AdminLayout`, no site
header/footer/cart drawer). They are separate top-level `<Route>` branches in `App.jsx`.

**Public storefront** — `RootLayout` wraps every page so Header/Footer/CartDrawer/
ToastContainer persist:

| Path | Page |
|---|---|
| `/` | Home |
| `/shop` (`?category=`, `?q=`) | Shop |
| `/product/:slug` | ProductDetail |
| `/tree-studio` | TreeStudioPage |
| `/cart` | Cart |
| `/checkout` | Checkout |
| `/showrooms` | Showrooms |
| `/about` | About |
| `/contact` | Contact |
| `/testimonials` | Testimonials |
| `/login` | Login |
| `/signup` | Signup |
| `/account` | Account (redirects to `/login` if not signed in) |
| `*` | NotFound |

**Admin dashboard** — `AdminLayout` (sidebar + topbar), every path except `/admin/login`
is wrapped in `RequireAdminAuth`:

| Path | Page |
|---|---|
| `/admin/login` | AdminLogin |
| `/admin` | AdminDashboard (overview) |
| `/admin/products` | AdminProducts |
| `/admin/products/new` | AdminProductForm (create) |
| `/admin/products/:id/edit` | AdminProductForm (edit) |
| `/admin/categories` | AdminCategories |
| `/admin/showrooms` | AdminShowrooms |
| `/admin/testimonials` | AdminTestimonials |
| `/admin/enquiries` | AdminEnquiries |

## State management

No Redux/Zustand — Context + a small `useLocalStorage` hook, same simplicity level as the
old project but without prop drilling:

- **CartContext** — `cart: [{product, quantity}]`, `addToCart`/`updateQuantity`/
  `removeFromCart`/`clearCart`, persisted. No price total (enquiry-only pricing).
- **WishlistContext** — persisted `Set` of product ids, `toggleWishlist`/`isWishlisted`.
- **ToastContext** — `showToast(message)` + auto-dismissing toast list.
- **CustomerAuthContext** — customer accounts, entirely client-side (no backend to call).
  `localStorage['raave-customers']` holds the account list (`name, email, phone,
  passwordHash, createdAt`); `localStorage['raave-customer-session']` holds the signed-in
  user (`name, email, phone`, no password). Passwords are never stored in the clear —
  `signup`/`login` hash them with the Web Crypto API (`SHA-256`, salted with the email)
  before writing or comparing. This is **still not real security**: anyone with devtools
  access to this browser profile can read the hash list and brute-force weak passwords
  offline, and there's no password reset, email verification, or rate limiting. It exists so
  a look at localStorage doesn't hand over a plaintext password, not to guarantee account
  safety. Do not reuse this pattern for anything handling real customer data — that needs a
  real backend with server-side hashing (bcrypt/argon2) and cannot live entirely in the
  browser. `Checkout` and `Contact` tag submitted enquiries with `customerEmail` from the
  session (if signed in) so `Account.jsx` can list "my enquiries" by matching against
  `src/lib/enquiries.js`.

Admin-only state (not used by the public storefront):

- **AdminAuthContext** — a boolean session flag persisted to `localStorage`
  (`raave-admin-session`). `login(username, password)` checks against a hardcoded
  credential pair for now; `logout()` clears the flag. This is demo-level gating, not real
  security — there is no backend, so anyone with browser devtools access to this build can
  bypass it. Fine for an internal/staging tool; **do not use this pattern if the dashboard
  will ever be exposed publicly** — that would need real server-side auth.
- **AdminDataContext** — the single place admin CRUD operations happen. It loads the base
  arrays from `src/data/{products,categories,showrooms,testimonials}.js`, layers any
  `localStorage`-persisted overrides on top (`raave-admin-overrides`), and exposes
  `addProduct`/`updateProduct`/`deleteProduct` (+ the same trio for categories, showrooms,
  testimonials), plus `addEnquiry`/`updateEnquiryStatus`/`listEnquiries`. The public site's
  `data/*.js` imports are unaffected — `AdminDataContext` is only mounted under `/admin/*`.
  Because overrides live in `localStorage`, edits are per-browser only (no shared database),
  consistent with how Cart/Wishlist already persist in this project.

## Admin dashboard

An internal, password-gated `/admin` area for managing the catalog and reviewing customer
enquiries, since the storefront itself has no backend to manage this data from.

**Scope:**
- **Products** — list (searchable/sortable `DataTable`), create, edit (name, category,
  description, specs/sizes, images, stock status), delete. Edits are written as overrides
  in `AdminDataContext`, not back into the scraped `src/data/products.js` file.
- **Categories** — edit label/count overrides for the 7 top-level categories.
- **Showrooms** — edit the 5 showroom entries (address, phone, timing, features).
- **Testimonials** — add/edit/delete testimonial entries.
- **Enquiries** — every `Checkout` submission and `Contact`/`ConsultForm` submission is
  logged (via `AdminDataContext.addEnquiry`) instead of just showing a toast; the admin can
  view each enquiry's details and mark it `new` / `contacted` / `closed`. This gives the
  dashboard something real to manage, since there is no live payment/order backend.
- **Dashboard overview** — stat cards: total products, products by category, open
  enquiries count, out-of-stock count.

**Auth:** a single hardcoded admin credential (documented in the admin login page, not
committed as a real secret) gates access via `AdminAuthContext`; `RequireAdminAuth` redirects
unauthenticated visitors to `/admin/login`. This matches the project's "no backend, keep it
simple" approach used elsewhere (Cart/Wishlist), but should be replaced with real
authentication before any production/public deployment.

**Isolation from the public site:** `src/admin/**` only imports from `src/data/**` (read the
same base arrays) and its own context — it does not import `layout/`, `components/`, or
`pages/` from the public site, and vice versa. `AdminLayout` supplies its own chrome
(sidebar/topbar) instead of `RootLayout`'s Header/Footer/CartDrawer.

## Lazy loading

Every route in the tables above — public and admin — is `React.lazy()`-imported behind a
shared `<Suspense fallback={<PageLoader/>}>` per route tree, so the admin dashboard's code
(DataTable, forms, etc.) is never downloaded by a storefront visitor who never visits
`/admin`. The 150-frame canvas `ScrollTreeHero` inside `Home.jsx` is additionally split with
its own nested `lazy()`/`Suspense` so the rest of the homepage can paint without waiting on
the hero code and its frame sequence.

## Header responsive breakpoint

`layout/Header.jsx`'s desktop nav (the 6 text links) switches on at Tailwind's `xl`
(1280px), not `lg` (1024px). This was moved up after adding the account icon: with the
brand name, 6 nav links, and 4 utility icons (search, wishlist, account, cart) all visible
at once, the row's minimum content width is ~1260px — below that, something has to give.
The two options tried and rejected: letting the brand name shrink below its own text
(the text overflowed onto the nav) and forcing the row to keep its natural width (the whole
page gained a horizontal scrollbar at 1024–1279px). Moving the nav's breakpoint to `xl` means
1024–1279px shows the mobile hamburger menu instead — a deliberate trade-off, not an
oversight. If you add another header icon in the future, re-check this: search/wishlist/
account icons also had to move from `sm` (640px) to `md` (768px) for the same reason
(4 icons + hamburger + logo don't fit in 640px). Verify with a width sweep (320 through 1920)
checking `document.documentElement.scrollWidth` against the viewport width, not just a couple
of screenshots — the failure only shows up at specific narrow ranges.

## Known bug fixed in this rebuild

The old `ShowroomsSection.jsx` read `s.type` / `s.name` / `s.hours` / `s.size`, none of
which exist on the `SHOWROOMS` data (which has `title` / `timing` / `isFlagship`, no size
field) — several fields silently rendered `undefined`. The new `ShowroomCard.jsx` reads the
real field names.
