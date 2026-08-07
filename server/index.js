import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync, existsSync } from "node:fs";
import * as store from "./store.js";
import * as barter from "./barter.js";
import * as ratings from "./ratings.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Read-only content library (items.json, quests.json, …). Overridable in container.
const DATA_DIR = process.env.RAIDEX_CONTENT_DIR || path.join(__dirname, "..", "data");
// Built frontend served by the server. Overridable in container.
const DIST_DIR = process.env.RAIDEX_DIST_DIR || path.join(__dirname, "..", "app", "dist");
const app = express();
app.use(express.json());

const load = (name) => JSON.parse(readFileSync(path.join(DATA_DIR, name), "utf-8"));

// ---- Content Library (read-only reference data) ----
app.get("/api/meta", (_req, res) => {
  res.json({
    items: load("items.json").length,
    quests: load("quests.json").length,
    recipes: load("recipes.json").length,
    stations: load("stations.json").length,
    projects: load("projects.json").length,
    traders: load("traders.json").length,
    stash: load("stash.json"),
  });
});

app.get("/api/items", (_req, res) => res.json(load("items.json")));
app.get("/api/items/:slug", (req, res) => {
  const item = load("items.json").find(i => i.slug === req.params.slug || i.name.toLowerCase() === req.params.slug.toLowerCase());
  if (!item) return res.status(404).json({ error: "not found" });
  res.json(item);
});
app.get("/api/quests", (_req, res) => res.json(load("quests.json")));
app.get("/api/traders", (_req, res) => res.json(load("traders.json")));
app.get("/api/recipes", (_req, res) => res.json(load("recipes.json")));
app.get("/api/stations", (_req, res) => res.json(load("stations.json")));
app.get("/api/projects", (_req, res) => res.json(load("projects.json")));
app.get("/api/stash", (_req, res) => res.json(load("stash.json")));

// ---- User profile / cloud sync ----
app.get("/api/profiles", (_req, res) => res.json(store.listProfiles()));
app.post("/api/profiles", (req, res) => {
  const profile = store.createProfile(req.body?.name);
  res.status(201).json(profile);
});
app.get("/api/profiles/:id", (req, res) => {
  const profile = store.getProfile(req.params.id);
  if (!profile) return res.status(404).json({ error: "profile not found" });
  res.json(profile);
});
app.put("/api/profiles/:id", (req, res) => {
  const profile = store.putProfile(req.params.id, req.body || {});
  if (!profile) return res.status(404).json({ error: "profile not found" });
  res.json(profile);
});
app.delete("/api/profiles/:id", (req, res) => {
  const ok = store.deleteProfile(req.params.id);
  res.status(ok ? 200 : 404).json({ ok });
});

// ---- Community barter / trade post ----
app.get("/api/barter", (_req, res) => res.json(barter.listBarter()));

app.post("/api/barter", (req, res) => {
  const { profileId, profileName, offer, want, note } = req.body || {};
  const result = barter.createBarter({ profileId, profileName, offer, want, note });
  if (result.error) return res.status(400).json(result);
  res.status(201).json(result);
});

app.post("/api/barter/:id/claim", (req, res) => {
  const result = barter.claimBarter(req.params.id, req.body || {});
  if (!result) return res.status(404).json({ error: "not found" });
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

app.post("/api/barter/:id/unclaim", (req, res) => {
  const result = barter.unclaimBarter(req.params.id, req.body || {});
  if (!result) return res.status(404).json({ error: "not found" });
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

app.delete("/api/barter/:id", (req, res) => {
  const result = barter.deleteBarter(req.params.id, req.body || {});
  if (!result) return res.status(404).json({ error: "not found" });
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

// ---- Community trader ratings / reputation ----
app.get("/api/ratings", (_req, res) => res.json(ratings.getRatings()));
app.get("/api/ratings/mine", (req, res) => res.json({ myVotes: ratings.myVotes(req.query.voterId) }));
app.post("/api/ratings/:posterId", (req, res) => {
  const result = ratings.vote(req.params.posterId, req.body || {});
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

// Serve built frontend if present
if (existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(DIST_DIR, "index.html")));
}

const PORT = process.env.PORT || 8787;
app.listen(PORT, "0.0.0.0", () => {
  console.log("ARC Raider Tracker server listening on port " + PORT);
});
