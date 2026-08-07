// Playwright global teardown: remove data the E2E runs created so the demo stays clean.
const BASE = process.env.BASE_URL || "http://localhost:8787";

async function get(p) { return (await fetch(BASE + p)).json(); }
async function send(p, method, body) {
  try {
    await fetch(BASE + p, {
      method, headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (_) {}
}

module.exports = async function cleanup() {
  try {
    for (const p of await get("/api/profiles")) {
      if (String(p.name).startsWith("E2E")) await send("/api/profiles/" + p.id, "DELETE");
    }
    for (const l of await get("/api/barter")) {
      if (String(l.posterName).startsWith("E2E")) await send("/api/barter/" + l.id, "DELETE", { profileId: l.posterId });
    }
  } catch (_) {}
};
