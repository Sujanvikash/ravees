# Deploying the shop

| Part | Where | How it gets there |
|---|---|---|
| Shop API (`ecommerce/backend`) | the billing AWS server, in `~/ecommerce` (its own PostgreSQL) | `.github/workflows/ecommerce.yml` on every push to `main` touching `ecommerce/` |
| HTTPS for it | billing's Caddy (`billing/deploy`), over the shared Docker network `web` | the name in `SHOP_API_DOMAIN` in `~/billing/.env` |
| Website (`ecommerce/frontend`) | Cloudflare Pages | Cloudflare builds it on every push to `main` |

The workflow runs the backend tests and the website's lint and build, then builds the API image
(`ghcr.io/<owner>/raaves-shop-api`), copies `compose.yml` to `~/ecommerce` and restarts the API. Migrations run when it
starts. It uses the same `DEPLOY_HOST`, `DEPLOY_USER` and `DEPLOY_SSH_KEY` secrets as billing.

## Once, before the first deploy

### 1. Resend (password-reset and order emails)

resend.com → **Domains → Add domain**: a domain you can add DNS records to (a subdomain such as `mail.yourdomain.in`
keeps it apart from your normal email). Add the records it shows (DKIM, SPF, MX) at your DNS provider and wait for
"Verified". Then **API Keys → Create** (sending access). Emails can only go to customers from a verified domain.

### 2. Razorpay

Dashboard → **Account & Settings → API keys**: generate the key (start in **Test mode**; switch to Live keys when
ready). **Webhooks → Add**: URL `https://<SHOP_API_DOMAIN>/api/v1/payments/razorpay/webhook`, a secret you make up,
events `payment.captured` and `order.paid`. Payments must be captured automatically (the default; Account & Settings →
Payment capture).

### 3. The server

```bash
ssh ubuntu@<server>
# the shop API's name (an sslip.io name works until there is a domain), for billing's Caddy
echo 'SHOP_API_DOMAIN=shop-api.<server ip>.sslip.io' >> ~/billing/.env
mkdir -p ~/ecommerce && cd ~/ecommerce
cat > .env <<EOF
API_IMAGE=ghcr.io/<owner>/raaves-shop-api:latest
POSTGRES_PASSWORD=$(openssl rand -hex 24)
JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')
PUBLIC_URL=https://shop-api.<server ip>.sslip.io
SITE_URL=https://<project>.pages.dev
CORS_ORIGINS=https://<project>.pages.dev
RESEND_API_KEY=re_...
MAIL_FROM=Raave's Evergreen <no-reply@mail.yourdomain.in>
ADMIN_EMAIL=
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
ADMIN_USERNAME=admin
ADMIN_PASSWORD=$(openssl rand -base64 12)
EOF
grep ADMIN_PASSWORD .env    # note the admin password
```

### 4. Cloudflare Pages

Dashboard → **Workers & Pages → Create → Pages → Connect to Git**, this repository, then: production branch `main`,
root directory `ecommerce/frontend`, build command `npm run build`, output directory `dist`, and the environment
variable `VITE_API_URL=https://shop-api.<server ip>.sslip.io/api/v1`. Its address (`<project>.pages.dev`) goes in
`SITE_URL` and `CORS_ORIGINS` above.

### 5. After the first deploy

```bash
cd ~/ecommerce && docker compose exec shop-api python -m app.cli seed
```

makes the admin login and loads the starting catalogue (the old website's categories, products, photos, showrooms and
testimonials), without prices. Then sign in at `<website>/admin`, add prices, and change the admin password.

## Day to day

| Task | Command (in `~/ecommerce`) |
|---|---|
| See the API's log | `docker compose logs -f --tail 100 shop-api` |
| Change a setting | edit `.env`, then `docker compose up -d` |
| Back up now | `docker compose exec shop-backup pg_dump -Fc -f /backups/shop-now.dump` |
| Restore a backup | `docker compose exec -T shop-db pg_restore -U shop -d raaves_shop --clean < backups/<file>.dump` |
