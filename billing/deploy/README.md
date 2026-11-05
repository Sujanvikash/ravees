# Deploying billing

| Part | Where | How it updates |
|---|---|---|
| API (`billing/backend`) | One AWS server (Lightsail or EC2) running Docker: PostgreSQL, the API, Caddy for HTTPS and a nightly backup (`compose.yml`) | GitHub Actions on every push to `main` |
| Frontend (`billing/frontend`) | Cloudflare Pages | Cloudflare builds it on every push to `main` |

The workflow is `.github/workflows/billing.yml`. On every push or pull request touching `billing/` it runs the backend lint and tests (on a throwaway PostgreSQL) and the frontend lint and build. On `main` it then builds the API image, pushes it to GitHub's registry (`ghcr.io/<owner>/raaves-billing-api`) and restarts the server on it. Migrations run each time the API starts, so a new image brings its tables with it.

## 1. The server (once)

1. **Create the server.** Lightsail → **Create instance**: region **Mumbai (ap-south-1)**, platform **Linux operating system** (not "Linux apps": those blueprints come with a web server that takes ports 80 and 443), blueprint **Ubuntu 24.04 LTS**, the **$12 plan** (2 GB RAM, 2 vCPU, with a public IPv4 address). Then, under the instance's **Networking** tab, attach a **static IP** and add a firewall rule for **HTTPS (443)**; SSH (22) and HTTP (80) are open already. On EC2 it is the same with a **t3.small**, an Elastic IP and a security group.

   Why 2 GB: with all five showrooms (two counters each) and the admin working at once, the API, database and Caddy use about 350 MB and 0.1–0.2 of a CPU core. The 2 GB plan sustains 0.4 of a core, so it stays at full speed; the 1 GB plan sustains 0.2 and slows down once its burst credits run out on a busy day. If the load grows, a snapshot of the instance can be started on a bigger plan.
2. **Point the API's name at it.** At your domain's DNS add an `A` record: `api.yourdomain.com` → the static IP.
3. **Install Docker.** SSH in (`ssh ubuntu@<ip>`), then:
   ```bash
   curl -fsSL https://get.docker.com | sudo sh
   sudo usermod -aG docker $USER      # then log out and back in
   mkdir -p ~/billing
   ```
4. **Write the settings.** Copy `billing/deploy/.env.example` to `~/billing/.env` on the server and fill it in: the domain, `API_IMAGE` with your GitHub owner in lower case, a new `POSTGRES_PASSWORD` (`openssl rand -hex 24`), a new `JWT_SECRET` (`openssl rand -base64 48`) and `CORS_ORIGINS` with the frontend's address from step 3. Then `chmod 600 ~/billing/.env`.
5. **A key for GitHub to deploy with.** On your own computer:
   ```bash
   ssh-keygen -t ed25519 -f billing-deploy -N "" -C github-deploy
   ```
   Add the contents of `billing-deploy.pub` as a new line in `~/.ssh/authorized_keys` on the server. The private key `billing-deploy` goes into GitHub in the next step, then delete both files from your computer.

## 2. GitHub (once)

In the repository: **Settings → Environments → New environment** called `production`, and add these secrets to it:

| Secret | Value |
|---|---|
| `DEPLOY_HOST` | the server's static IP |
| `DEPLOY_USER` | `ubuntu` (Lightsail/EC2 Ubuntu) |
| `DEPLOY_SSH_KEY` | the whole private key file `billing-deploy` |

Adding **required reviewers** to the environment makes each deploy wait for a click, if you want that.

Then push to `main` (or **Actions → billing → Run workflow** on `main`). The first deploy starts PostgreSQL, the API and Caddy, and Caddy gets the HTTPS certificate. After the first deploy, fill the database once:

```bash
cd ~/billing
docker compose exec api python -m app.cli seed
curl https://api.yourdomain.com/health          # {"ok":true}
```

**Then sign in as admin and change every password** (Stores). The defaults (`<username>@2026`) are written in the backend README.

## 3. The frontend on Cloudflare Pages (once)

Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**, pick this repository, then:

| Setting | Value |
|---|---|
| Production branch | `main` |
| Root directory | `billing/frontend` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Environment variable | `VITE_API_URL` = `https://api.yourdomain.com/api/v1` |
| Build watch paths (Settings → Builds) | include `billing/frontend/*` only, so website changes don't rebuild it |

`VITE_API_URL` is built into the app, so changing it needs a new build (**Retry deployment**). Add `billing.yourdomain.com` under **Custom domains** if you want one, and make sure every frontend address is in `CORS_ORIGINS` on the server (then `docker compose up -d` there).

## Running it

All on the server, in `~/billing`:

| What | Command |
|---|---|
| Is everything up | `docker compose ps` |
| API logs | `docker compose logs -f api` |
| Restart after changing `.env` | `docker compose up -d` |
| Go back to an earlier build | set `API_IMAGE=ghcr.io/<owner>/raaves-billing-api:<commit sha>` in `.env`, then `docker compose up -d` (only if that build's migrations match the database) |
| A backup now | `docker compose exec backup sh -c 'pg_dump -Fc -f /backups/manual-$(date +%F-%H%M).dump'` |
| Restore a backup | `docker compose stop api` then `docker compose exec -T db pg_restore -U billing -d raaves_billing --clean --if-exists < backups/billing-YYYY-MM-DD.dump`, then `docker compose start api` |

Backups are made every night at 02:00 IST into `~/billing/backups` and kept for 14 days. They are on the same server, so also copy them off it now and then (or turn on Lightsail's automatic snapshots), in case the server itself is lost.

To try the image on your own computer: `docker build -t raaves-billing-api:local billing/backend`, then use `compose.yml` with a `.env` that has `API_DOMAIN=localhost` and `API_IMAGE=raaves-billing-api:local`.
