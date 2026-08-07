import React, { useMemo, useState } from "react";
import { useApp } from "../App.jsx";
import { ItemPicker, ItemIcon, Stepper, SearchBox, rarityColor } from "./ui.jsx";

export default function Stash() {
  const { profile, saveProfile, stashInfo } = useApp();
  const [q, setQ] = useState("");
  const [picker, setPicker] = useState(false);
  const [group, setGroup] = useState("all");

  const stash = profile.stash || [];
  const stashLevel = profile.stashLevel || 1;
  const cap = stashInfo?.upgrades?.find(u => u.level === stashLevel)?.slots ?? 64;

  const addItem = (item) => {
    const idx = stash.findIndex(e => e.slug === item.slug);
    let next;
    if (idx >= 0) {
      next = stash.map((e, i) => i === idx ? { ...e, qty: e.qty + 1 } : e);
    } else {
      next = [...stash, { slug: item.slug, name: item.name, category: item.category, rarity: item.rarity, sell_value: item.sell_value, qty: 1 }];
    }
    saveProfile({ ...profile, stash: next });
  };
  const setQty = (slug, qty) => saveProfile({ ...profile, stash: stash.map(e => e.slug === slug ? { ...e, qty } : e) });
  const remove = (slug) => saveProfile({ ...profile, stash: stash.filter(e => e.slug !== slug) });

  const groups = useMemo(() => {
    const g = {};
    stash.forEach(e => { g[e.category] = (g[e.category] || 0) + e.qty; });
    return Object.entries(g).sort((a, b) => b[1] - a[1]);
  }, [stash]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return stash.filter(e => (group === "all" || e.category === group) && (!query || e.name.toLowerCase().includes(query)));
  }, [stash, q, group]);

  const slotsUsed = stash.length;
  const totalCount = stash.reduce((s, e) => s + e.qty, 0);

  return (
    <div>
      <div className="stash-cap">
        <div className="cap-label">
          <span><strong>Stash Lv {stashLevel}</strong> · {slotsUsed}/{cap} slots</span>
          <span>{totalCount} items total</span>
        </div>
        <div className="progress-bar"><div className="progress-fill warn" style={{ width: Math.min(100, (slotsUsed / cap) * 100) + "%" }} /></div>
        {slotsUsed / cap >= 0.8 && <span className="cap-warn">Stash nearly full — consider selling or recycling.</span>}
      </div>
      <div className="bar">
        <SearchBox value={q} onChange={setQ} placeholder="Filter stash…" />
        <button className="btn primary add" onClick={() => setPicker(true)}>+ Add</button>
      </div>
      <div className="cat-scroll">
        <button className={"cat" + (group === "all" ? " on" : "")} onClick={() => setGroup("all")}>All</button>
        {groups.map(([c, n]) => (
          <button key={c} className={"cat" + (group === c ? " on" : "")} onClick={() => setGroup(c)}>{c} · {n}</button>
        ))}
      </div>
      <div className="list">
        {filtered.map(e => (
          <div className="inv-row" key={e.slug}>
            <ItemIcon item={e} size={36} />
            <div className="inv-name">
              <span style={{ color: rarityColor(e.rarity) }}>{e.name}</span>
              <span className="muted small">{e.category}</span>
            </div>
            <Stepper value={e.qty} onChange={v => setQty(e.slug, v)} />
            <button className="remove" onClick={() => remove(e.slug)}>🗑</button>
          </div>
        ))}
        {filtered.length === 0 && <p className="muted center pad">Stash is empty. Add loot you’ve brought back from Topside.</p>}
      </div>
      <ItemPicker open={picker} onClose={() => setPicker(false)} onAdd={(item) => { addItem(item); setPicker(false); }} />
    </div>
  );
}
