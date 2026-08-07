import { useApp } from "./App.jsx";

// Returns a map name->item for fast lookup, cached once per module via hook
const cache = { itemsByName: null, itemsBySlug: null };

export function useItemsIndex() {
  const { items } = useApp();
  if (!cache.itemsByName || cache.itemsByName._src !== items) {
    const byName = {};
    const bySlug = {};
    for (const it of items) {
      byName[it.name.toLowerCase()] = it;
      bySlug[it.slug] = it;
    }
    byName._src = items;
    cache.itemsByName = byName;
    cache.itemsBySlug = bySlug;
  }
  return { byName: cache.itemsByName, bySlug: cache.itemsBySlug };
}

// Match a raw string (objective / reward text) to a known item, best-effort.
export function findItemInText(text, byName) {
  if (!text) return null;
  const lower = text.toLowerCase();
  // exact name match first
  if (byName[lower]) return byName[lower];
  // try a normalization without punctuation/apostrophes
  const norm = (s) => s.replace(/[^a-z0-9]/g, "");
  for (const [name, item] of Object.entries(byName)) {
    if (name === "_src") continue;
    const n = norm(name);
    if (n.length > 3 && (norm(lower) === n || norm(lower).includes(n))) return item;
  }
  return null;
}

// Extract the set of items mentioned in an array of objective/reward strings.
export function itemsInTexts(texts, byName) {
  const found = new Map();
  for (const t of texts || []) {
    // strip leading "Nx " counts and standalone words
    const item = findItemInText(t, byName);
    if (item && !found.has(item.slug)) found.set(item.slug, item);
  }
  return [...found.values()];
}
