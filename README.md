# Raidex — ARC Raiders Companion Tracker

A **mobile-first PWA** that acts as a content library *and* tracker for **ARC Raiders**
(Embark Studios). It catalogues real in-game items, quests, recipes and stations, and lets
you track your **quests**, **inventory** (loot carried Topside) and **stash** (loot stored
in Speranza) — synced to the cloud.

## What's inside

| Area | What it does |
|------|--------------|
| **Library · Items** | Browse **194 real items** — rarity, sell price, category, what they recycle into, and what to keep each one for (workshop / quests / projects / crafting). Searchable & filterable. **Every item now shows its real icon** (scraped from the wiki). |
| **Library · Recipes** | **30 crafting recipes** with station + ingredients, **plus a cost-vs-value profit calculator** (sums ingredient sell prices vs. the crafted output's sell price, sortable by profit/loss/cost). Ingredient chips and the output link through to the item detail. |
| **Library · Stations** | The **Workshop crafting stations** (Workbench, Gunsmith, Medical Lab, Explosives Station, Utility Station, Refiner) and their upgrade costs. |
| **Library · Projects** | "Items to keep" checklists for quests, workshop upgrades, Expeditions, Flickering Flames and the Trophy Display. |
| **Quests** | **All 47 quests** across the 5 Speranza traders (Apollo, Celeste, Lance, Shani, Tian Wen) with objectives + rewards. Check off objectives, mark active, mark complete. Filter by trader and status. **Objective and reward items are auto-linked to the library** — tap any linked chip to open that item's detail sheet (with icon, price, recycling and keep-info). |
| **Inventory** | Track the items you're currently carrying (stack quantities) with live total value. |
| **Stash** | Track stored loot per Raider, with slot usage vs. your **Stash level** (Lv 1–10, 64→280 slots), grouping by category and a near-full warning. |
| **Raider** | Per-profile data, stash level picker, free-text notes, **export/import JSON**, and switching between Raiders. |
| **Trade (Barter Board)** | A **community player↔player trade post** shared by everyone on the server. Post what you HAVE vs what you WANT (multi-item, with icons and quantities), browse/search the board, **claim** an open trade to reserve it, **release** it back, and see the poster’s name to coordinate. Own posts can be deleted. Includes: **filter by a specific item**, **stash-match alerts** (a count badge + “You can fill” stat + per-card MATCH tag when your stash can cover a listing’s WANT items), and **trader ratings** (▲/▼ votes per poster, with your vote persisted). |

## Architecture

```
arc-raider-tracker/
├─ e2e/             # Playwright browser tests (raidex.spec.js, playwright.config.js)
├─ smoke_test.sh    # API smoke test (bash + curl)
├─ Dockerfile       # build frontend + run API/static server in one image
├─ render.yaml      # Render blueprint (web service + persistent disk)
├─ fly.toml         # Fly.io config
├─ railway.json     # Railway config
├─ DEPLOY.md        # deployment guide
├─ data/            # Real content dataset (seed)
│   ├─ items.json      # 194 items
│   ├─ quests.json     # 47 quests
│   ├─ traders.json    # 5 traders
│   ├─ recipes.json    # 30 recipes
│   ├─ stations.json   # workshop stations
│   ├─ stash.json      # stash upgrade costs
│   └─ projects.json   # keep-lists
├─ server/          # Node + Express REST API (cloud sync)
│   ├─ index.js
│   ├─ store.js        # JSON-file persistence for profiles (userdata.json)
│   ├─ barter.js       # community trade-board persistence (barter.json)
│   └─ ratings.js      # trader reputation votes (ratings.json)
└─ app/             # React + Vite mobile-first PWA
    ├─ src/components/  # Library, Quests, Inventory, Stash, Profile…
    └─ public/          # manifest, icons
```

## Testing

Two automated test suites live alongside the app:

**1. API smoke test** — `./smoke_test.sh [base_url]` (bash + curl, no deps). Exercises the
REST endpoints end-to-end: content library, profiles, the full barter flow (post → self-claim
blocked → claim → double-claim blocked → release) and ratings (upvote → self-vote blocked).

**2. Playwright E2E** — real browser, drives the actual UI:
```bash
cd e2e
npm install
npx playwright install chromium      # once (needs system libs; see below)
npm test                              # run all 7 UI tests
npm run test:headed                   # watch it run in a visible browser
npm run test:ui                       # Playwright UI runner
```
It covers: content library (items + icons + detail sheet), recipe profit calculator,
quest objective tracking, adding inventory items, **stash-match alerts on the trade board**,
posting/claiming/releasing trades + rating a poster, and nav rendering. Tests create their
own `E2E…` data and a `globalTeardown` (`e2e/cleanup.js`) removes it automatically, so the
demo stays clean.

> **System deps note:** Playwright's Chromium needs a few shared libraries. On a fresh Linux
> box run: `sudo npx playwright install-deps chromium` (or the distro equivalent).

## How it runs
- **Backend** (`server/`): `npm install && npm run start` → serves the REST API **and** the
  built frontend on one port. User data lives in `server/userdata.json`.
- **Frontend** (`app/`): `npm install && npm run dev` (dev server proxies `/api` to the
  backend). `npm run build` outputs `app/dist`, which the server also serves.
- Cloud sync = the PWA `PUT`s your profile state to the API, so it follows you across
  devices/browsers that point at the same server.

## Deploying to the web
This is an installable PWA served by the backend — one container is the whole app. See
**[`DEPLOY.md`](DEPLOY.md)** for step-by-step guides to Render, Fly.io, Railway and any
VPS/Docker host, plus the env-var reference and post-deploy checks. A ready-made
**Dockerfile**, `render.yaml`, `fly.toml` and `railway.json` are included at the repo root.

## Data provenance & caveats
- Items, project keep-lists, workshop stations and stash costs are **scraped from the
  community wikis** (`arc-raiders.fandom.com`, `arcraiders.wiki`) via the MediaWiki API
  (see `scripts/`).
- Quests come from the community quest guide (`arcraidermap.com`). Some multi-step
  objectives were condensed and are labeled with a note when trimmed.
- This is a **fan companion tool**, not affiliated with Embark Studios. Item prices,
  recipes and quest details may change with patches — re-run `scripts/extract_items.py`
  and `scripts/fetch_icons.py` to refresh the item dataset and its icons.
- Item **icons** are scraped from the wiki into `app/public/icons/{slug}.png` (194 items),
  with a rarity-colored fallback tile for anything missing.
- **Recipe profit ratings** are limited to recipes whose output appears in the item
  catalog with a sell price — most weapons/mods/augments aren't sellable there, so only
  material-type recipes (e.g. Power Rod, Magnetic Accelerator, gun parts) get a numeric
  profit rating; the rest are marked "Value not catalogued".
