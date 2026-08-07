import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Writable data dir defaults to alongside this file; override for cloud persistent storage.
const DATA_DIR = process.env.RAIDEX_DATA_DIR || __dirname;
const DATA_FILE = path.join(DATA_DIR, "userdata.json");

const emptyProfile = () => ({
  id: null,
  name: "",
  createdAt: Date.now(),
  updatedAt: Date.now(),
  stashLevel: 1,
  inventory: [],       // [{ item, qty }] items carried Topside
  stash: [],           // [{ item, qty, category }]
  quests: {},          // { questId: { active, completed, done:[bool], note } }
  notes: "",
});

function load() {
  if (!existsSync(DATA_FILE)) {
    writeFileSync(DATA_FILE, JSON.stringify({ profiles: {} }));
    return { profiles: {} };
  }
  try {
    return JSON.parse(readFileSync(DATA_FILE, "utf-8"));
  } catch {
    return { profiles: {} };
  }
}

function save(db) {
  writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

export function listProfiles() {
  const db = load();
  return Object.values(db.profiles).map(p => ({
    id: p.id, name: p.name, updatedAt: p.updatedAt,
    stashLevel: p.stashLevel, note: p.note,
  }));
}

export function getProfile(id) {
  const db = load();
  return db.profiles[id] || null;
}

export function createProfile(name) {
  const db = load();
  const id = "r-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const profile = emptyProfile();
  profile.id = id;
  profile.name = name || "Raider " + id.slice(-4);
  db.profiles[id] = profile;
  save(db);
  return profile;
}

export function putProfile(id, body) {
  const db = load();
  if (!db.profiles[id]) return null;
  const profile = db.profiles[id];
  profile.updatedAt = Date.now();
  if (Array.isArray(body.inventory)) profile.inventory = body.inventory;
  if (Array.isArray(body.stash)) profile.stash = body.stash;
  if (body.quests && typeof body.quests === "object") profile.quests = body.quests;
  if (Number.isFinite(body.stashLevel)) profile.stashLevel = body.stashLevel;
  if (typeof body.notes === "string") profile.notes = body.notes;
  db.profiles[id] = profile;
  save(db);
  return profile;
}

export function deleteProfile(id) {
  const db = load();
  if (!db.profiles[id]) return false;
  delete db.profiles[id];
  save(db);
  return true;
}
