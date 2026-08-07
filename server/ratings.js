import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Writable data dir defaults to alongside this file; override for cloud persistent storage.
const DATA_DIR = process.env.RAIDEX_DATA_DIR || __dirname;
const FILE = path.join(DATA_DIR, "ratings.json");

function load() {
  if (!existsSync(FILE)) {
    const seed = { votes: [] };
    writeFileSync(FILE, JSON.stringify(seed, null, 2));
    return seed;
  }
  try { return JSON.parse(readFileSync(FILE, "utf-8")); }
  catch { return { votes: [] }; }
}
function save(db) { writeFileSync(FILE, JSON.stringify(db, null, 2)); }

function aggregate(db) {
  const map = {};
  for (const v of db.votes) {
    if (!map[v.posterId]) map[v.posterId] = { score: 0, up: 0, down: 0, votes: 0 };
    const a = map[v.posterId];
    a.score += v.value;
    if (v.value > 0) a.up++; else a.down++;
    a.votes++;
  }
  return map;
}

export function getRatings() {
  return aggregate(load());
}

// Vote: value is 1 or -1. Toggle behavior:
//  - no prior vote -> add
//  - prior vote same value -> remove (toggle off)
//  - prior vote different value -> change to new value
export function vote(posterId, { voterId, value }) {
  const db = load();
  const v = Math.sign(Number(value));
  if (!v || !posterId) return { error: "Invalid vote." };
  if (voterId === posterId) return { error: "You can't rate yourself." };
  const idx = db.votes.findIndex(x => x.posterId === posterId && x.voterId === voterId);
  if (idx >= 0) {
    if (db.votes[idx].value === v) {
      db.votes.splice(idx, 1); // toggle off
    } else {
      db.votes[idx].value = v;
      db.votes[idx].updatedAt = Date.now();
    }
  } else {
    db.votes.push({ id: "v-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), posterId, voterId, value: v, createdAt: Date.now() });
  }
  save(db);
  const all = aggregate(db);
  return { posterId, myVote: (() => { const f = db.votes.find(x => x.posterId === posterId && x.voterId === voterId); return f ? f.value : 0; })(), ...(all[posterId] || { score: 0, up: 0, down: 0, votes: 0 }) };
}

export function myVotes(voterId) {
  const db = load();
  const out = {};
  for (const v of db.votes) {
    if (v.voterId === voterId) out[v.posterId] = v.value;
  }
  return out;
}
