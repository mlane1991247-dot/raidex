import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Writable data dir defaults to alongside this file; override for cloud persistent storage.
const DATA_DIR = process.env.RAIDEX_DATA_DIR || __dirname;
const FILE = path.join(DATA_DIR, "barter.json");

function load() {
  if (!existsSync(FILE)) {
    const seed = { listings: [] };
    writeFileSync(FILE, JSON.stringify(seed, null, 2));
    return seed;
  }
  try {
    return JSON.parse(readFileSync(FILE, "utf-8"));
  } catch {
    return { listings: [] };
  }
}

function save(db) {
  writeFileSync(FILE, JSON.stringify(db, null, 2));
}

const publicListing = (l) => ({
  id: l.id,
  posterId: l.posterId,
  posterName: l.posterName,
  offer: l.offer,
  want: l.want,
  note: l.note || "",
  status: l.status, // "open" | "claimed"
  claimedBy: l.claimedBy || null,
  createdAt: l.createdAt,
  claimedAt: l.claimedAt || null,
});

export function listBarter() {
  const db = load();
  return db.listings
    .map(publicListing)
    .sort((a, b) => {
      // open first, then newest
      if (a.status !== b.status) return a.status === "open" ? -1 : 1;
      return b.createdAt - a.createdAt;
    });
}

export function createBarter({ profileId, profileName, offer, want, note }) {
  const db = load();
  const listing = {
    id: "b-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    posterId: profileId || "unknown",
    posterName: profileName || "Raider",
    offer: (offer || []).map(o => ({ slug: o.slug, name: o.name, icon: o.icon || null, qty: Math.max(1, o.qty || 1) })),
    want: (want || []).map(w => ({ slug: w.slug, name: w.name, icon: w.icon || null, qty: Math.max(1, w.qty || 1) })),
    note: (note || "").slice(0, 500),
    status: "open",
    claimedBy: null,
    createdAt: Date.now(),
    claimedAt: null,
  };
  if (listing.offer.length === 0 && listing.want.length === 0) {
    return { error: "A trade needs at least one item." };
  }
  db.listings.push(listing);
  save(db);
  return publicListing(listing);
}

export function claimBarter(id, { profileId, profileName }) {
  const db = load();
  const l = db.listings.find(x => x.id === id);
  if (!l) return null;
  if (l.status !== "open") return { error: "Already claimed." };
  if (l.posterId === profileId) return { error: "You can't claim your own trade." };
  l.status = "claimed";
  l.claimedBy = { profileId: profileId || "unknown", name: profileName || "Raider" };
  l.claimedAt = Date.now();
  save(db);
  return publicListing(l);
}

export function unclaimBarter(id, { profileId }) {
  const db = load();
  const l = db.listings.find(x => x.id === id);
  if (!l) return null;
  if (l.claimedBy?.profileId !== profileId && l.posterId !== profileId) {
    return { error: "Only the claimer or the poster can release this." };
  }
  l.status = "open";
  l.claimedBy = null;
  l.claimedAt = null;
  save(db);
  return publicListing(l);
}

export function deleteBarter(id, { profileId }) {
  const db = load();
  const idx = db.listings.findIndex(x => x.id === id);
  if (idx === -1) return null;
  const l = db.listings[idx];
  if (l.posterId !== profileId) return { error: "Only the poster can delete this trade." };
  db.listings.splice(idx, 1);
  save(db);
  return { ok: true };
}
