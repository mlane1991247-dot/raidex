# Deploying Raidex to the web

Raidex is a **PWA** (installable web app), so "publishing" means hosting it on a public
server with HTTPS. Users open the URL and add it to their home screen — no app-store
review, no developer accounts.

The backend (`server/`) already serves **both** the REST API and the built frontend from
one process, and the app uses same-origin `/api` calls — so **one running container is the
whole deployment.**

## What you need before deploying
1. **A Git repository** with this project pushed (GitHub/GitLab/Bitbucket). All hosts below
   deploy from a repo.
2. A **host account** (pick one — instructions for each below).
3. That's it. No domain purchase required for a starter URL (each host gives you one), and
   HTTPS is automatic.

> **One non-negotiable:** your data store must be writable across restarts. The container
> writes user profiles/trades/ratings to `RAIDEX_DATA_DIR` (default `/data`). You **must**
> attach a persistent disk/volume there, or everything resets on every redeploy.

---

## Option 1 — Render (simplest, free tier)
1. Push the project to a GitHub repo.
2. In Render → **New → Blueprint**, pick the repo. Render reads `render.yaml` automatically
   (web service + a 1 GB persistent disk mounted at `/data`).
3. Click **Apply**. Render builds the Dockerfile and gives you a `https://raidex.onrender.com` URL.
4. Health check is `/api/meta` (used for the service to show "Live").

## Option 2 — Fly.io (nice free-ish allowance)
1. Install the Fly CLI, `fly auth login`.
2. In the project root: `fly launch` (answer prompts; it uses the existing `fly.toml`),
   then `fly volumes create raidex_data --size 1` (attach the persistent volume),
   then `fly deploy`.
3. Get your URL: `fly open`.

## Option 3 — Railway
1. Connect the repo in Railway, add a new service from it.
2. It auto-detects the `Dockerfile` (`railway.json` is provided). 
3. Add a **Volume** and set its mount to `/data` (Railway volumes require a paid plan).
4. Set env `RAIDEX_DATA_DIR=/data`. Deploy.

## Option 4 — Any VPS / Docker host (DO droplet, Hetzner, a home server)
```bash
# on the server
docker build -t raidex .
docker run -d --name raidex \
  -p 8080:8080 \
  -v raidex_data:/data \
  -e RAIDEX_DATA_DIR=/data \
  -e PORT=8080 \
  --restart unless-stopped \
  raidex
```
Then put it behind a reverse proxy (Caddy/Nginx) for TLS. Caddy one-liner:
```
raidex.example.com { reverse_proxy localhost:8080 }
```

---

## Configuration reference
| Env var | Purpose | Default |
|---|---|---|
| `PORT` | HTTP port the server listens on | `8080` (local `8787`) |
| `RAIDEX_DATA_DIR` | **Writable** dir for `userdata.json`, `barter.json`, `ratings.json` | `/data` (container) |
| `RAIDEX_CONTENT_DIR` | Read-only content library (`items.json`, …) | `/app/data` |
| `RAIDEX_DIST_DIR` | Built frontend | `/app/app/dist` |

---

## Verify after deploy
- Open your URL → you should land on the "Welcome, Raider" screen.
- `/api/meta` should return JSON like `{"items":194,"quests":47,…}`.
- Create a Raider, add a stash item, post a trade — then **redeploy** and confirm the data
  survived (proves the disk/volume is mounted correctly).
- Open it **on your phone**, tap the browser menu → **Add to Home Screen** → it installs as a
  fullscreen app with the Raidex icon.

## Scale notes / honesty
- The JSON-file store is great for a **personal/friends** tool (a few dozen users). If you
  expect real public traffic, replace `server/store.js`/`barter.js`/`ratings.js` with a
  database (SQLite or Postgres). Everything else already scales fine.
- User data is **server-wide**: everyone who hits your deployed URL shares the same profiles
  and trade board. That's by design for this tool.

## Legal reminder
You're hosting a fan companion that uses the "ARC Raiders" name, scraped game data and
artwork. For a small community link that's generally low-risk, but if it gets popular:
rename/re-skin the branding, add the "unofficial fan project" disclaimer, and ideally ask
Embark for permission. Don't put it in an app store without that — see the main README.
