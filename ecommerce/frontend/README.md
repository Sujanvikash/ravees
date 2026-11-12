# ecommerce/frontend

The Raave's Evergreen website: the shop front (collections, product pages, cart and checkout, showrooms,
invoices) and the admin at `/admin`. React 19, Vite 8, Tailwind CSS v4 and react-router-dom 7, in plain JSX.

```bash
npm install
npm run dev       # http://localhost:5173
npm run lint
npm run build     # to dist/
```

## The shop API

Everything the site shows and stores comes from the shop API in `ecommerce/backend` (its `README.md` is the
contract): the catalogue, showrooms and testimonials, customer accounts, enquiries, orders and the admin.
Run it on port 8001 while working on the site.

- **`VITE_API_URL`**: the API's address up to and including `/api/v1`, `http://localhost:8001/api/v1` by default.
  Copy `.env.example` to `.env.local` to change it locally; on Cloudflare Pages set it as a build environment
  variable (it is built into the site). The API's `CORS_ORIGINS` must include the site's address.
- **Storefront data**: one `GET /storefront` per visit, with the last copy kept in the browser so a reload
  paints at once. If the API can't be reached on a first visit, the site says so and offers a retry.
- **Customers**: sign up, sign in, reset a forgotten password by email (`/forgot-password` → the emailed
  `/reset-password?token=…` link), and see their orders under `/account`.
- **Shopping**: a plain online store. Customers add products to the cart and pay with Razorpay at checkout,
  after giving a delivery address. Every product on the website has a price; one without a price isn't for
  sale yet and stays hidden. Out-of-stock products show as such and can't be added, and checkout asks for
  any cart line that is out of stock or gone from the shop to be removed before paying.
- **Enquiries**: the Contact page's styling consultation form.
- **Admin** (`/admin`): sign in with the admin login the backend's `seed` created. Products (details, prices,
  photos, order), categories, showrooms, testimonials, enquiries, orders (move them along, e.g. with a
  tracking number), customers, delivery charges and the admin password.

`src/data/products.js`, `categories.js`, `showrooms.js` and `testimonials.js` are no longer read by the site;
they are the backend's first catalogue (its `seed` command). `public/` is not needed to build or run the site.
