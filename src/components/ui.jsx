import React, { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "../App.jsx";

export const RARITY = {
  Common: "#9aa3ab",
  Uncommon: "#5fbf6a",
  Rare: "#4b8de0",
  Epic: "#b06de0",
  Legendary: "#e8a33d",
};

export function rarityColor(r) { return RARITY[r] || "#9aa3ab"; }

// Renders an item's icon with a rarity-colored fallback tile when no icon exists.
export function ItemIcon({ item, size = 40 }) {
  const color = rarityColor(item?.rarity);
  return (
    <span className="ii" style={{ width: size, height: size, "--rc": color }}>
      {item?.icon ? (
        <img src={item.icon} alt="" className="ii-img" loading="lazy" />
      ) : (
        <span className="ii-fb">◈</span>
      )}
    </span>
  );
}

// Shared item detail sheet, openable from anywhere (library, quests, recipes).
export function ItemDetail({ slug, onClose }) {
  const { items } = useApp();
  const item = items.find(i => i.slug === slug);
  if (!item) return null;
  const rows = [
    ["Rarity", item.rarity],
    ["Sell price", item.sell_value ? "$" + item.sell_value.toLocaleString() : "—"],
    ["Category", item.category],
    ["Recycles into", item.recycles || "—"],
  ];
  const keeps = [
    ["For Workshop", item.keep_for_workshop],
    ["For Quests", item.keep_for_quests],
    ["For Projects", item.keep_for_projects],
    ["Crafted into", item.crafted_into],
  ].filter(k => k[1]);
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-head">
          <h3 style={{ color: rarityColor(item.rarity), display: "flex", alignItems: "center", gap: 10 }}>
            <ItemIcon item={item} size={40} /> {item.name}
          </h3>
          <button className="close" onClick={onClose}>×</button>
        </div>
        <div className="kv">
          {rows.map(([k, v]) => (
            <div className="kv-row" key={k}><span className="k">{k}</span><span className="v">{v}</span></div>
          ))}
        </div>
        {keeps.map(([k, v]) => (
          <div className="keep" key={k}>
            <div className="keep-title">{k}</div>
            <div className="keep-body">{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Chip({ children, color }) {
  return <span className="chipx" style={color ? { borderColor: color, color } : undefined}>{children}</span>;
}

export function SearchBox({ value, onChange, placeholder }) {
  return (
    <div className="search">
      <span className="search-ic">⌕</span>
      <input className="input" placeholder={placeholder || "Search…"} value={value} onChange={e => onChange(e.target.value)} />
      {value && <button className="clear" onClick={() => onChange("")}>×</button>}
    </div>
  );
}

// Generic item picker modal — lets the user search items and add to a list.
export function ItemPicker({ open, onClose, onAdd }) {
  const { items } = useApp();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [added, setAdded] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => { if (open) { setQ(""); setCat("All"); setAdded(null); setTimeout(() => inputRef.current && inputRef.current.focus(), 30); } }, [open]);

  const cats = useMemo(() => ["All", ...new Set(items.map(i => i.category))], [items]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return items.filter(i =>
      (cat === "All" || i.category === cat) &&
      (!query || i.name.toLowerCase().includes(query))
    );
  }, [items, q, cat]);

  if (!open) return null;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-head">
          <h3>Add item</h3>
          <button className="close" onClick={onClose}>×</button>
        </div>
        <SearchBox value={q} onChange={setQ} placeholder="Search items…" />
        <div className="cat-scroll">
          {cats.map(c => (
            <button key={c} className={"cat" + (cat === c ? " on" : "")} onClick={() => setCat(c)}>{c}</button>
          ))}
        </div>
        <div className="sheet-list">
          {filtered.slice(0, 80).map(i => (
            <button key={i.slug} className="pick-row" onClick={() => { onAdd(i); setAdded(i.slug); }}>
              <ItemIcon item={i} size={34} />
              <span className="pick-mid">
                <span className="item-name" style={{ color: rarityColor(i.rarity) }}>{i.name}</span>
                <span className="item-sub">{i.category} · {i.sell_value ? "$" + i.sell_value : "—"}</span>
              </span>
              {added === i.slug && <span className="tick">✓</span>}
            </button>
          ))}
          {filtered.length === 0 && <p className="muted center">No items found.</p>}
        </div>
      </div>
    </div>
  );
}

// Qty stepper used in inventory / stash rows
export function Stepper({ value, onChange, max }) {
  return (
    <div className="stepper">
      <button onClick={() => onChange(Math.max(1, value - 1))}>−</button>
      <input
        className="qty"
        type="number"
        min={1}
        value={value}
        onChange={e => {
          const v = parseInt(e.target.value, 10);
          if (Number.isFinite(v)) onChange(Math.min(max ?? 9999, Math.max(1, v)));
        }}
      />
      <button onClick={() => onChange((max ? Math.min(max, value + 1) : value + 1))}>+</button>
    </div>
  );
}
