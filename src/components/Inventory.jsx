import React, { useMemo, useState } from "react";
import { useApp } from "../App.jsx";
import { ItemPicker, ItemIcon, Stepper, SearchBox, rarityColor } from "./ui.jsx";

export default function Inventory() {
  const { profile, saveProfile } = useApp();
  const [q, setQ] = useState("");
  const [picker, setPicker] = useState(false);

  const inv = profile.inventory || [];

  const addItem = (item) => {
    const idx = inv.findIndex(e => e.slug === item.slug);
    let next;
    if (idx >= 0) {
      next = inv.map((e, i) => i === idx ? { ...e, qty: e.qty + 1 } : e);
    } else {
      next = [...inv, { slug: item.slug, name: item.name, category: item.category, rarity: item.rarity, sell_value: item.sell_value, qty: 1 }];
    }
    saveProfile({ ...profile, inventory: next });
  };
  const setQty = (slug, qty) => {
    saveProfile({ ...profile, inventory: inv.map(e => e.slug === slug ? { ...e, qty } : e) });
  };
  const remove = (slug) => {
    saveProfile({ ...profile, inventory: inv.filter(e => e.slug !== slug) });
  };

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return inv.filter(e => !query || e.name.toLowerCase().includes(query));
  }, [inv, q]);

  const totalVal = inv.reduce((s, e) => s + (e.sell_value || 0) * e.qty, 0);
  const totalCount = inv.reduce((s, e) => s + e.qty, 0);

  return (
    <div>
      <div className="stat-bar">
        <Stat label="Items carried" v={totalCount} />
        <Stat label="Types" v={inv.length} />
        <Stat label="Value" v={"$" + totalVal.toLocaleString()} />
      </div>
      <div className="bar">
        <SearchBox value={q} onChange={setQ} placeholder="Filter carried items…" />
        <button className="btn primary add" onClick={() => setPicker(true)}>+ Add</button>
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
        {filtered.length === 0 && <p className="muted center pad">Nothing carried. Tap “Add” to log loot from Topside.</p>}
      </div>
      <ItemPicker open={picker} onClose={() => setPicker(false)} onAdd={(item) => { addItem(item); setPicker(false); }} />
    </div>
  );
}

function Stat({ label, v }) {
  return <div className="stat"><span className="stat-v">{v}</span><span className="stat-l">{label}</span></div>;
}
