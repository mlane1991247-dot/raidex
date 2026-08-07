#!/usr/bin/env python3
"""Pull real ARC Raiders item data from the community wiki's MediaWiki API."""
import json, re, urllib.request, urllib.parse, html, time

WIKI = "https://arc-raiders.fandom.com"

def api_get(title, prop="revisions", rvprop="content", rvslots="main"):
    params = {
        "action": "parse",
        "page": title,
        "prop": "wikitext",
        "format": "json",
        "formatversion": "2",
        "origin": "*",
    }
    url = WIKI + "/api.php?" + urllib.parse.urlencode(params)
    for attempt in range(4):
        try:
            with urllib.request.urlopen(url, timeout=30) as r:
                data = json.loads(r.read().decode("utf-8"))
            return data
        except Exception as e:
            print("  retry", attempt, e)
            time.sleep(2)
    return None

def clean(s):
    s = re.sub(r"\[\[([^\]|]*\|)?([^\]]*)\]\]", lambda m: m.group(2), s)
    s = html.unescape(s)
    s = s.replace("'''", "").replace("''", "")
    s = re.sub(r"<ref.*?</ref>", "", s, flags=re.S)
    s = re.sub(r"<[^>]+>", "", s)
    s = s.strip()
    return s

def main():
    data = api_get("Items")
    if not data or "parse" not in data:
        print("No data")
        return
    wikitext = data["parse"]["wikitext"]["content"]
    with open("items_wikitext.txt", "w") as f:
        f.write(wikitext)
    print("Saved items_wikitext.txt, length", len(wikitext))

if __name__ == "__main__":
    main()
