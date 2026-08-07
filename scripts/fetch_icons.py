#!/usr/bin/env python3
"""Download item icons from the ARC Raiders wiki into app/public/icons/{slug}.png."""
import json, re, os, time, urllib.request, urllib.parse

WIKI = "https://arc-raiders.fandom.com"
HDRS = {"User-Agent": "Mozilla/5.0 (ARC Raider Tracker data tool/1.0)"}

items = json.load(open("../data/items.json"))
file_by_name = json.load(open("file_by_name.json"))

OUT = os.path.abspath("../app/public/icons")
os.makedirs(OUT, exist_ok=True)

# Build lookup name->slug, handling filename variants
def norm(s):
    return re.sub(r"[^a-z0-9]", "", s.lower())

# File name may differ from display name (e.g. Dried-Out ARC Resin). Try exact, then normalized.
name_to_slug = {}
for it in items:
    name_to_slug[norm(it["name"])] = it["slug"]

def slug_for_file(fname, display_name):
    # try normalized display name first, then normalized file stem
    if norm(display_name) in name_to_slug:
        return name_to_slug[norm(display_name)]
    stem = os.path.splitext(fname)[0]
    for k, s in name_to_slug.items():
        if norm(stem) == k:
            return s
    # fuzzy: file stem without underscores
    stem_clean = norm(stem)
    for k, s in name_to_slug.items():
        if stem_clean in k or k in stem_clean:
            return s
    return None

# Build list of File titles to query (file name already no ext)
file_titles = []
slug_by_title = {}
for name, fname in file_by_name.items():
    title = "File:" + fname + ".png"
    slug = slug_for_file(fname, name)
    if slug:
        slug_by_title[title] = slug
        file_titles.append(title)
print("Resolved file titles to slugs:", len(slug_by_title))

def get_thumb_urls(titles):
    params = {
        "action": "query", "titles": "|".join(titles),
        "prop": "imageinfo", "iiprop": "url", "iiurlwidth": 96,
        "format": "json", "formatversion": "2",
    }
    url = WIKI + "/api.php?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers=HDRS)
    with urllib.request.urlopen(req, timeout=40) as r:
        data = json.loads(r.read().decode())
    out = {}
    for page in data.get("query", {}).get("pages", []):
        title = page.get("title")
        ii = (page.get("imageinfo") or [{}])[0]
        out[title] = ii.get("thumburl")
    return out

# Download in batches
missing = []
done = 0
for i in range(0, len(file_titles), 50):
    batch = file_titles[i:i+50]
    urls = get_thumb_urls(batch)
    for title in batch:
        slug = slug_by_title[title]
        url = urls.get(title)
        if not url:
            missing.append((title, slug))
            continue
        dest = os.path.join(OUT, slug + ".png")
        try:
            req = urllib.request.Request(url, headers=HDRS)
            with urllib.request.urlopen(req, timeout=40) as r:
                blob = r.read()
            with open(dest, "wb") as f:
                f.write(blob)
            done += 1
        except Exception as e:
            missing.append((title, slug))
    time.sleep(0.3)

print("Downloaded icons:", done)
print("Missing:", len(missing))
for m in missing[:15]:
    print("  ", m)

# Record icon availability into a map slug->bool for the app
slug_ok = {slug: os.path.exists(os.path.join(OUT, slug + ".png")) for slug in set(slug_by_title.values())}
json.dump(slug_ok, open("icon_map.json", "w"))
print("Wrote icon_map.json with", sum(slug_ok.values()), "icons")
