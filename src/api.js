const BASE = ""; // same origin (Vite proxies /api to backend)

async function get(path) {
  const res = await fetch(BASE + path);
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}
async function send(path, method, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}

export const api = {
  meta: () => get("/api/meta"),
  items: () => get("/api/items"),
  quests: () => get("/api/quests"),
  traders: () => get("/api/traders"),
  recipes: () => get("/api/recipes"),
  stations: () => get("/api/stations"),
  projects: () => get("/api/projects"),
  stash: () => get("/api/stash"),
  profiles: () => get("/api/profiles"),
  createProfile: (name) => send("/api/profiles", "POST", { name }),
  getProfile: (id) => get("/api/profiles/" + id),
  putProfile: (id, body) => send("/api/profiles/" + id, "PUT", body),
  barter: () => get("/api/barter"),
  createBarter: (body) => send("/api/barter", "POST", body),
  claimBarter: (id, body) => send("/api/barter/" + id + "/claim", "POST", body),
  unclaimBarter: (id, body) => send("/api/barter/" + id + "/unclaim", "POST", body),
  deleteBarter: (id, body) => send("/api/barter/" + id, "DELETE", body),
  ratings: () => get("/api/ratings"),
  myRatings: (voterId) => get("/api/ratings/mine?voterId=" + encodeURIComponent(voterId)),
  vote: (posterId, body) => send("/api/ratings/" + posterId, "POST", body),
};
