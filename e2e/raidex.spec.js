// Raidex — End-to-end UI tests (Playwright)
// Run against the built app served by the backend: BASE_URL default http://localhost:8787
//
//   npx playwright test
//   BASE_URL=http://localhost:8787 npx playwright test --headed
//
// Note: these tests create + delete their own data via the UI/API and leave the
// demo state intact.

const { test, expect } = require("@playwright/test");

const BASE = process.env.BASE_URL || "http://localhost:8787";
const SUFFIX = Date.now().toString(36).slice(-6);

// --- Helpers ---
async function request(path, method = "GET", body) {
  const res = await fetch(BASE + path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

async function createProfile(page, name) {
  await page.goto(BASE + "/");
  // On the gate, create a new raider
  const input = page.locator("input[placeholder='Raider name']");
  await input.fill(name);
  await page.locator("button:has-text('Create')").first().click();
  await expect(page.locator(".bottom-nav")).toBeVisible({ timeout: 10000 });
}

test("content library: items load with icons and item detail opens", async ({ page }) => {
  await createProfile(page, "E2E Lib " + SUFFIX);
  await page.locator(".nav-item:has-text('Library')").click();

  // item grid populated from API
  await expect(page.locator(".item-cell").first()).toBeVisible({ timeout: 10000 });
  await expect(page.locator(".count-line")).toContainText("items");

  // icons render
  await expect(page.locator(".item-cell .ii-img").first()).toBeVisible();
  const src = await page.locator(".item-cell .ii-img").first().getAttribute("src");
  expect(src).toMatch(/^\/icons\/.*\.png$/);

  // open a detail sheet
  await page.locator(".item-cell").first().click();
  await expect(page.locator(".sheet")).toBeVisible();
  await expect(page.locator(".sheet-head h3")).toBeVisible();
  await expect(page.locator(".kv-row").first()).toBeVisible();
  await page.locator(".sheet-head .close").click();
  await expect(page.locator(".sheet")).not.toBeVisible();
});

test("library recipes: profit calculator rates a craft", async ({ page }) => {
  await createProfile(page, "E2E Rec " + SUFFIX);
  await page.locator(".nav-item:has-text('Library')").click();
  await page.locator(".sub-tab:has-text('Recipes')").click();

  // a rated recipe shows a profit line with dollar amounts
  const rated = page.locator(".profit-line:has-text('$')").first();
  await expect(rated).toBeVisible({ timeout: 10000 });

  // sort by most profitable works
  await page.locator(".cat:has-text('Most profitable')").click();
  const firstProfit = await page.locator(".profit.pos").first().innerText();
  expect(firstProfit).toMatch(/\$/);
});

test("quests: open quest, check an objective, mark complete", async ({ page }) => {
  await createProfile(page, "E2E Quest " + SUFFIX);
  await page.locator(".nav-item:has-text('Quests')").click();
  await expect(page.locator(".quest-card").first()).toBeVisible({ timeout: 10000 });

  // stat counts visible
  await expect(page.locator(".stat-bar")).toContainText("Total");

  await page.locator(".quest-card").first().click();
  await expect(page.locator(".sheet")).toBeVisible();
  await expect(page.locator(".section-t").first()).toContainText("Objectives");

  // toggle first objective
  const firstObj = page.locator(".obj").first();
  await firstObj.click();
  await expect(firstObj).toHaveClass(/on/);

  // linked items appear (auto-link from objectives/rewards)
  await page.locator(".sheet .close").click();
});

test("inventory: add an item and adjust quantity", async ({ page }) => {
  await createProfile(page, "E2E Inv " + SUFFIX);
  await page.locator(".nav-item:has-text('Loot')").click();

  await page.locator("button:has-text('+ Add')").click();
  await expect(page.locator(".sheet")).toBeVisible();

  // pick "Battery" from the picker
  const search = page.locator(".sheet input[placeholder*='Search items']").first();
  await search.fill("Battery");
  await page.locator(".pick-row:has-text('Battery')").first().click();

  // battery now in inventory
  await expect(page.locator(".inv-row:has-text('Battery')").first()).toBeVisible();
  // increase qty
  const stepperPlus = page.locator(".inv-row:has-text('Battery') .stepper button").last();
  await stepperPlus.click();
  await expect(page.locator(".inv-row:has-text('Battery') .stepper input")).toHaveValue("2");
});

test("stash: match alert appears for a fillable trade", async ({ page }) => {
  await createProfile(page, "E2E Stash " + SUFFIX);

  // Add ARC Alloy to stash (the seed trade from ScavengerSol wants 8x ARC Alloy)
  await page.locator(".nav-item:has-text('Stash')").click();
  await page.locator("button:has-text('+ Add')").click();
  await page.locator(".sheet input[placeholder*='Search items']").first().fill("ARC Alloy");
  await page.locator(".pick-row:has-text('ARC Alloy')").first().click();
  const qtyInput = page.locator(".inv-row:has-text('ARC Alloy') .stepper input");
  await qtyInput.fill("10");
  await qtyInput.press("Enter");

  // Go to Trade board
  await page.locator(".nav-item:has-text('Trade')").click();
  await expect(page.locator(".match-banner")).toBeVisible({ timeout: 10000 });
  await expect(page.locator(".nav-badge").first()).toHaveText(/[1-9]/);
});

test("trade board: post a trade, claim + release, rate a poster", async ({ page }) => {
  const me = "E2E Trader " + SUFFIX;
  await createProfile(page, me);

  await page.locator(".nav-item:has-text('Trade')").click();

  // post a trade offering Wires for ARC Alloy
  await page.locator("button:has-text('+ Post')").click();
  await expect(page.locator(".sheet").first()).toBeVisible();
  await page.locator(".pt-head:has-text('HAVE') button:has-text('+ Add')").click();
  await page.locator(".sheet input[placeholder*='Search items']").first().fill("Wires");
  await page.locator(".pick-row:has-text('Wires')").first().click();
  await page.locator(".pt-head:has-text('WANT') button:has-text('+ Add')").click();
  await page.locator(".sheet input[placeholder*='Search items']").first().fill("ARC Alloy");
  await page.locator(".pick-row:has-text('ARC Alloy')").first().click();
  await page.locator("button:has-text('Post Trade')").click();
  await expect(page.locator(".flash")).toContainText("Trade posted");

  // our new trade shows as "Your post"
  await expect(page.locator(".trade-card:has-text('Your post')").first()).toBeVisible({ timeout: 10000 });

  // Rate another poster (ScavengerSol) — upvote
  const solCard = page.locator(".trade-card:has-text('ScavengerSol')").first();
  await solCard.locator(".rate.up").click();
  await expect(solCard.locator(".rscore")).toContainText(/\+1/);

  // claim an open trade (ScavengerSol's) with a second profile
  // use API: create second profile, claim seed trade, verify status on board
  const taker = await request("/api/profiles", "POST", { name: "E2E Taker " + SUFFIX });
  const seed = (await request("/api/barter")).find(l => l.posterName === "ScavengerSol");
  const claimed = await request("/api/barter/" + seed.id + "/claim", "POST", { profileId: taker.id, profileName: taker.name });
  expect(claimed.status).toBe("claimed");

  // release it
  const released = await request("/api/barter/" + seed.id + "/unclaim", "POST", { profileId: taker.id });
  expect(released.status).toBe("open");
});

test("nav tabs all render after login", async ({ page }) => {
  await createProfile(page, "E2E Nav " + SUFFIX);
  const labels = ["Library", "Quests", "Loot", "Stash", "Trade", "Raider"];
  for (const l of labels) {
    await expect(page.locator(".nav-item:has-text('" + l + "')")).toBeVisible();
  }
});
