import React, { useState } from "react";
import { useApp } from "../App.jsx";

export function ProfileGate() {
  const { profiles, selectProfile, createProfile, meta } = useApp();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const onCreate = async () => {
    setBusy(true);
    try {
      await createProfile(name.trim());
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="gate">
      <div className="gate-hero">
        <div className="gate-mark">⚙</div>
        <h2>Welcome, Raider</h2>
        <p>Select your Raider profile or start a new one. Your quests, inventory and stash are tracked per profile and synced to the cloud.</p>
      </div>

      {meta && (
        <div className="meta-strip">
          <span>{meta.items} items</span>
          <span>{meta.quests} quests</span>
          <span>{meta.recipes} recipes</span>
        </div>
      )}

      <div className="card">
        <h3>Your Raiders</h3>
        {profiles.length === 0 && <p className="muted">No profiles yet. Create one to begin.</p>}
        <div className="profile-list">
          {profiles.map(p => (
            <button key={p.id} className="profile-row" onClick={() => selectProfile(p.id)}>
              <span className="avatar">◉</span>
              <span className="p-name">{p.name}</span>
              <span className="p-sub">Stash Lv {p.stashLevel}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>New Raider</h3>
        <div className="row">
          <input
            className="input"
            placeholder="Raider name"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && onCreate()}
          />
          <button className="btn primary" onClick={onCreate} disabled={!name.trim() || busy}>
            {busy ? "…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
