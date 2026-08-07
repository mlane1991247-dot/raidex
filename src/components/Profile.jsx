import React from "react";
import { useApp } from "../App.jsx";

export default function Profile() {
  const { profile, saveProfile, stashInfo, profiles, selectProfile, online, syncing, items, quests } = useApp();

  const setLevel = (l) => saveProfile({ ...profile, stashLevel: l });
  const setNotes = (n) => saveProfile({ ...profile, notes: n });

  const done = Object.values(profile.quests || {}).filter(q => q.completed).length;

  const onExport = () => {
    const blob = new Blob([JSON.stringify(profile, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = profile.name.replace(/\s+/g, "-").toLowerCase() + ".json"; a.click();
    URL.revokeObjectURL(url);
  };
  const onImport = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (data && data.id) {
          saveProfile({ ...profile, inventory: data.inventory || profile.inventory, stash: data.stash || profile.stash, quests: data.quests || profile.quests, stashLevel: data.stashLevel || profile.stashLevel, notes: data.notes || profile.notes });
          alert("Imported into “" + profile.name + "”.");
        }
      } catch { alert("Invalid file."); }
    };
    reader.readAsText(file);
  };

  return (
    <div className="list">
      <div className="card raider-hero">
        <div className="avatar big">◉</div>
        <div>
          <h2>{profile.name}</h2>
          <p className="muted">
            {done}/{quests.length} quests done · {items.length} items catalogued
          </p>
          <span className={"sync-pill " + (online ? "on" : "off")}>{online ? (syncing ? "Syncing…" : "Cloud synced") : "Offline"}</span>
        </div>
      </div>

      <div className="card">
        <h3>Stash Level</h3>
        <div className="level-row">
          {stashInfo?.upgrades?.map(u => (
            <button key={u.level} className={"lvl" + (profile.stashLevel === u.level ? " on" : "")} onClick={() => setLevel(u.level)}>{u.level}</button>
          ))}
        </div>
        <div className="kv-row"><span className="k">Capacity</span><span className="v">{stashInfo?.upgrades?.find(u => u.level === profile.stashLevel)?.slots} slots</span></div>
        <div className="kv-row"><span className="k">Next upgrade</span><span className="v">{profile.stashLevel < 10 ? "$" + stashInfo?.upgrades?.[profile.stashLevel]?.cost?.toLocaleString() + " → " + stashInfo?.upgrades?.[profile.stashLevel]?.slots + " slots" : "Max"}</span></div>
      </div>

      <div className="card">
        <h3>Notes</h3>
        <textarea className="input area" rows={3} placeholder="Goals, routes, spawn notes…" value={profile.notes || ""} onChange={e => setNotes(e.target.value)} />
      </div>

      <div className="card">
        <h3>Data</h3>
        <div className="btn-row">
          <button className="btn ghost" onClick={onExport}>⬇ Export</button>
          <label className="btn ghost">⬆ Import<input type="file" accept="application/json" style={{ display: "none" }} onChange={onImport} /></label>
        </div>
        <p className="muted small pad">Your data lives on the Raidex cloud and syncs across devices. Export to back it up.</p>
      </div>

      <div className="card">
        <h3>Switch Raider</h3>
        <div className="profile-list">
          {profiles.filter(p => p.id !== profile.id).map(p => (
            <button key={p.id} className="profile-row" onClick={() => selectProfile(p.id)}>
              <span className="avatar">◉</span><span className="p-name">{p.name}</span><span className="p-sub">Stash Lv {p.stashLevel}</span>
            </button>
          ))}
          {profiles.filter(p => p.id !== profile.id).length === 0 && <p className="muted small">Only one Raider here.</p>}
        </div>
      </div>
    </div>
  );
}
