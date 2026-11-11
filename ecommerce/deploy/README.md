# Deploying the shop

| Part | Where | How it updates |
|---|---|---|
| Shop API (`ecommerce/backend`) | its own AWS Lightsail server, apart from billing's: PostgreSQL, the API, Caddy for HTTPS and a nightly backup (`compose.yml`, in `~/ecommerce`) | `.github/workflows/ecommerce.yml` on every push to `main` touching `ecommerce/` |
| Website (`ecommerce/frontend`) | Cloudflare Pages | Cloudflare builds it on every push to `main` |

The workflow runs the backend tests and the website's lint and build, then builds the API image
(`ghcr.io/<owner>/raaves-shop-api`), copies `compose.yml` and `Caddyfile` to `~/ecommerce` and restarts the API.
Migrations run when it starts. The shop has its own server so the website's traffic never slows billing.

## Once, before the first deploy

### 1. The server

1. Lightsail → **Create instance**: region **Mumbai (ap-south-1)**, **Linux/Unix → OS only → Ubuntu 24.04 LTS** (not
   a "Linux apps" blueprint: those take ports 80 and 443), the **2 GB plan** (with a public IPv4 address). Name it
   e.g. `raaves-shop`.
2. On the instance's **Networking** tab: attach a **static IP**, and add a firewall rule for **HTTPS (443)** (SSH 22
   and HTTP 80 are open already).
3. SSH in (`ssh ubuntu@<static ip>`, or the browser SSH button in Lightsail), then:
   ```bash
   curl -fsSL https://get.docker.com | sudo sh
   sudo usermod -aG docker $USER      # then log out and back in
   mkdir -p ~/ecommerce
   ```
4. A key for GitHub to deploy with. On your own computer:
   ```bash
   ssh-keygen -t ed25519 -f shop-deploy -N "" -C github-shop-deploy
   ```
   Add the contents of `shop-deploy.pub` as a new line in `~/.ssh/authorized_keys` on the server. The private key
   `shop-deploy` goes into GitHub (step 4), then delete both files from your computer.

The API's address: until there is a domain, `shop-api.<static ip>.sslip.io` works (sslip.io answers with the IP in the
name, and Caddy gets a real certificate for it).

### 2. Resend (password-reset and order emails)

resend.com → **Domains → Add domain**: a domain you control (a subdomain such as `mail.yourdomain.in` keeps it
apart from your normal email). Add the records it shows at your DNS provider and wait for "Verified". Then **API Keys
→ Create** (sending access). Emails reach customers only from a verified domain.

### 3. Razorpay

Dashboard → **Account & Settings → API keys** (start in **Test mode**; switch to Live keys when ready). **Webhooks →
Add**: URL `https://<API_DOMAIN>/api/v1/payments/razorpay/webhook`, a secret you make up, events `payment.captured`
and `order.paid`. Payments must be captured automatically (the default).

### 4. GitHub

The repository's owner (or an admin): **Settings → Environments → production**, add:

| Secret | Value |
|---|---|
| `SHOP_DEPLOY_HOST` | the shop server's static IP |
| `SHOP_DEPLOY_USER` | `ubuntu` |
| `SHOP_DEPLOY_SSH_KEY` | the whole private key file `shop-deploy` |

### 5. Cloudflare Pages

Dashboard → **Workers & Pages → Create → Pages → Connect to Git**, this repository, then: production branch `main`,
root directory `ecommerce/frontend`, build command `npm run build`, output directory `dist`, and the environment
variable `VITE_API_URL=https://<API_DOMAIN>/api/v1`. Its address (`<project>.pages.dev`) goes in `SITE_URL` and
`CORS_ORIGINS` below.

### 6. The settings on the server

On the server, in `~/ecommerce` (the passwords are made there, so they never travel anywhere):

```bash
cd ~/ecommerce
cat > .env <<EOF
API_DOMAIN=shop-api.<static ip>.sslip.io
API_IMAGE=ghcr.io/<owner in lower case>/raaves-shop-api:latest
POSTGRES_PASSWORD=$(openssl rand -hex 24)
JWT_SECRET=$(openssl rand -hex 32)
PUBLIC_URL=https://shop-api.<static ip>.sslip.io
SITE_URL=https://<project>.pages.dev
CORS_ORIGINS=https://<project>.pages.dev
RESEND_API_KEY=
MAIL_FROM=Raave's Evergreen <no-reply@mail.yourdomain.in>
ADMIN_EMAIL=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
ADMIN_USERNAME=admin
ADMIN_PASSWORD=$(openssl rand -hex 8)
EOF
chmod 600 .env
nano .env        # paste the Resend and Razorpay keys
```

### 7. The first deploy

Push to `main` (or **Actions → ecommerce → Run workflow**). Then, once:

```bash
cd ~/ecommerce && docker compose exec shop-api python -m app.cli seed
grep ADMIN_PASSWORD .env          # the admin password
curl https://<API_DOMAIN>/health    # {"status":"ok"}
```

`seed` makes the admin login and loads the starting catalogue (the old website's categories, products, photos,
showrooms and testimonials), without prices. Sign in at `<website>/admin`, add prices, and change the admin password.

## Day to day

| Task | Command (in `~/ecommerce`) |
|---|---|
| See the API's log | `docker compose logs -f --tail 100 shop-api` |
| Change a setting | edit `.env`, then `docker compose up -d` |
| Back up now | `docker compose exec shop-backup pg_dump -Fc -f /backups/shop-now.dump` |
| Restore a backup | `docker compose exec -T shop-db pg_restore -U shop -d raaves_shop --clean < backups/<file>.dump` |
