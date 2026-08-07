#!/usr/bin/env python3
"""Parse ARC Raiders Items wikitext into structured JSON seed data."""
import json, re, html

RAW = open("items_wikitext.txt").read()

def clean(s):
    s = re.sub(r"\[\[([^\]|]*\|)?([^\]]*)\]\]", lambda m: m.group(2), s)
    s = re.sub(r"<[^>]+>", "", s)
    s = html.unescape(s).strip()
    return s

def strip_name_cell(s):
    # return just the item name, dropping image alias
    return clean(s)

def split_row_cells(row):
    # row is text between table row markers. Cells start with '|' at line start.
    # Return list of cell strings (cleaned of leading | ).
    cells = []
    for line in row.split("\n"):
        if line.startswith("|"):
            cells.append(line[1:])
    return cells

# ---- Main Items table ----
main_start = RAW.index("== Items ==")
keep_start = RAW.index("== Items to keep ==")
main_section = RAW[main_start:keep_start]

rows = re.split(r"\n\|-\s*\n", main_section)
items = []
for row in rows:
    if not row.strip() or row.strip().startswith("{|") or row.strip().startswith("!"):
        continue
    cells = split_row_cells(row)
    if len(cells) < 6:
        continue
    name = clean(cells[1])
    if not name or name.startswith("Name"):
        continue
    item = {
        "name": name,
        "rarity": clean(cells[2]),
        "recycles": clean(cells[3]),
        "sell_price": clean(cells[4]),
        "category": clean(cells[5]),
        "keep_for_workshop": clean(cells[6]) if len(cells) > 6 else "",
        "keep_for_quests": clean(cells[7]) if len(cells) > 7 else "",
        "keep_for_projects": clean(cells[8]) if len(cells) > 8 else "",
        "crafted_into": clean(cells[9]) if len(cells) > 9 else "",
    }
    items.append(item)

# dedupe by name
seen = set(); deduped = []
for it in items:
    if it["name"].lower() not in seen:
        seen.add(it["name"].lower()); deduped.append(it)

print("Parsed main items:", len(deduped))
json.dump(deduped, open("items.json", "w"), indent=2)
print("Sample:", deduped[0]["name"], "|", deduped[0]["rarity"], "|", deduped[0]["sell_price"], "|", deduped[0]["category"])
