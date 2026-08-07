import React, { useMemo, useState } from "react";
import { useApp } from "../App.jsx";
import { SearchBox, ItemIcon, ItemDetail, rarityColor } from "./ui.jsx";
import { useItemsIndex } from "../lib.js";

export default function Library() {
  const { meta } = useApp();
  const [sub, setSub] = useState("items");
  const subs = [
    { id: "items", label: "Items", n: meta?.items },
    { id: "recipes", label: "Recipes", n: meta?.recipes },
    { id: "stations", label: "Stations" },
    { id: "projects", label: "Projects" },
  ];
  return (
    <div>
      <div className="sub-tabs">
        {subs.map(s => (
          <button key={s.id} className={"sub-tab" + (sub === s.id ? " on" : "")} onClick={() => setSub(s.id)}>
            {s.label}{s.n != null && <em>{s.n}</em>}
          </button>
        ))}
      </div>
      {sub === "items" && <ItemsView />}
      {sub === "recipes" && <RecipesView />}
      {sub === "stations" && <StationsView />}
      {sub === "projects" && <ProjectsView />}
    </div>
  );
}

function ItemsView() {
  const { items } = useApp();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [detail, setDetail] = useState(null); // slug
  const cats = useMemo(() => ["All", ...new Set(items.map(i => i.category))], [items]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return items.filter(i => (cat === "All" || i.category === cat) && (!query || i.name.toLowerCase().includes(query)));
  }, [items, q, cat]);

  return (
    <div>
      <SearchBox value={q} onChange={setQ} placeholder="Search items…" />
      <div className="cat-scroll">
        {cats.map(c => (
          <button key={c} className={"cat" + (cat === c ? " on" : "")} onClick={() => setCat(c)}>{c}</button>
        ))}
      </div>
      <p className="count-line">{filtered.length} items</p>
      <div className="item-grid">
        {filtered.map(i => (
          <button key={i.slug} className="item-cell" onClick={() => setDetail(i.slug)}>
            <ItemIcon item={i} size={40} />
            <span className="item-name" style={{ color: rarityColor(i.rarity) }}>{i.name}</span>
            <span className="item-sub">{i.category}</span>
            <span className="item-val">{i.sell_value ? "$" + i.sell_value.toLocaleString() : "—"}</span>
          </button>
        ))}
      </div>
      {filtered.length === 0 && <p className="muted center pad">No items match.</p>}
      {detail && <ItemDetail slug={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

function RecipesView() {
  const { recipes } = useApp();
  const { byName } = useItemsIndex();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("default");
  const [detail, setDetail] = useState(null); // output item slug

  // Compute cost (sum of ingredient sell value) and output value for each recipe.
  const computed = useMemo(() => {
    return recipes.map(r => {
      const cost = r.ingredients.reduce((s, ing) => {
        const item = byName[ing.item.toLowerCase()];
        return s + ((item && item.sell_value) || 0) * ing.qty;
      }, 0);
      const outItem = byName[r.name.toLowerCase()];
      const outVal = outItem ? outItem.sell_value || 0 : null;
      const profit = outVal == null ? null : outVal - cost;
      return { ...r, cost, outItem, outVal, profit };
    });
  }, [recipes, byName]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    let list = computed.filter(r => r.name.toLowerCase().includes(query) || (r.station || "").toLowerCase().includes(query));
    if (sort === "profit") list = [...list].filter(r => r.profit != null).sort((a, b) => b.profit - a.profit);
    else if (sort === "loss") list = [...list].filter(r => r.profit != null).sort((a, b) => a.profit - b.profit);
    else if (sort === "cost") list = [...list].sort((a, b) => b.cost - a.cost);
    else if (sort === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [computed, q, sort]);

  return (
    <div>
      <SearchBox value={q} onChange={setQ} placeholder="Search recipes…" />
      <div className="cat-scroll sub">
        {["default", "profit", "loss", "cost", "name"].map(s => (
          <button key={s} className={"cat small" + (sort === s ? " on" : "")} onClick={() => setSort(s)}>{s === "default" ? "Default" : s === "profit" ? "Most profitable" : s === "loss" ? "Biggest loss" : s === "cost" ? "Highest cost" : "A→Z"}</button>
        ))}
      </div>
      <p className="count-line">Profit = output sell value − total ingredient cost (only craftable items with a sell price are rated).</p>
      <div className="list">
        {filtered.map((r, idx) => {
          const showVal = r.outVal != null && r.cost > 0;
          return (
            <div className="row-card" key={idx}>
              <div className="rc-head">
                {r.outItem ? (
                  <button className="rc-name-link" onClick={() => setDetail(r.outItem.slug)}>
                    <ItemIcon item={r.outItem} size={26} />
                    <strong>{r.name}</strong>
                  </button>
                ) : <strong>{r.name}</strong>}
                <span className="muted">{r.type}</span>
              </div>
              <div className="rc-station">🔧 {r.station}</div>
              <div className="rc-ing">
                {r.ingredients.map((ing, i) => {
                  const mat = byName[ing.item.toLowerCase()];
                  return (
                    <button
                      key={i}
                      className="ing ing-btn"
                      disabled={!mat}
                      onClick={() => mat && setDetail(mat.slug)}
                      title={mat ? (mat.sell_value ? "$" + mat.sell_value : "No sell price") : ""}
                    >
                      {ing.qty}× {ing.item}
                    </button>
                  );
                })}
              </div>
              {showVal && (
                <div className="profit-line">
                  <span>Cost <b>${r.cost.toLocaleString()}</b> → Value <b>${r.outVal.toLocaleString()}</b></span>
                  <span className={"profit " + (r.profit >= 0 ? "pos" : "neg")}>
                    {r.profit >= 0 ? "▲" : "▼"} ${Math.abs(r.profit).toLocaleString()}
                  </span>
                </div>
              )}
              {!showVal && <div className="profit-line muted">Value not catalogued (uncraftable-out or no sell price).</div>}
            </div>
          );
        })}
        {filtered.length === 0 && <p className="muted center pad">No recipes match.</p>}
      </div>
      {detail && <ItemDetail slug={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

function StationsView() {
  const { stations } = useApp();
  const [open, setOpen] = useState(null);
  return (
    <div className="list">
      {stations.map((s, idx) => {
        const key = idx;
        const expanded = open === key;
        return (
          <div className="row-card" key={key}>
            <button className="station-head" onClick={() => setOpen(expanded ? null : key)}>
              <span>
                <strong>{s.name}</strong> <em>Lv {s.level}</em>
              </span>
              <span className="caret">{expanded ? "▾" : "▸"}</span>
            </button>
            <div className="rc-station">Requires: {s.requirement}</div>
            {expanded && (
              <div className="rc-ing">
                {s.crafts.map(c => <span className="ing" key={c}>{c}</span>)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ProjectsView() {
  const { projects } = useApp();
  const [open, setOpen] = useState(projects[0]?.id);
  return (
    <div className="list">
      <p className="muted pad">Items worth keeping for quests, workshop upgrades and projects in Speranza.</p>
      {projects.map(p => (
        <div className="row-card" key={p.id}>
          <button className="station-head" onClick={() => setOpen(open === p.id ? null : p.id)}>
            <span><strong>{p.name}</strong> <em>({p.count} items)</em></span>
            <span className="caret">{open === p.id ? "▾" : "▸"}</span>
          </button>
          {open === p.id && (
            <div className="project-list">
              {p.items.map((it, i) => (
                <div className="proj-row" key={i}><span>{it.item}</span><span className="q">{it.qty}×</span></div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
