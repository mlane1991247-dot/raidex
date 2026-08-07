import React, { useMemo, useState } from "react";
import { useApp } from "../App.jsx";
import { ItemIcon, ItemDetail } from "./ui.jsx";
import { useItemsIndex, itemsInTexts } from "../lib.js";

export default function Quests() {
  const { quests, traders, profile } = useApp();
  const [filter, setFilter] = useState("all");
  const [trader, setTrader] = useState("all");
  const [open, setOpen] = useState(null);

  const qstate = profile.quests || {};

  const filtered = useMemo(() => {
    return quests.filter(q => {
      const st = qstate[q.id];
      if (trader !== "all" && q.trader !== trader) return false;
      if (filter === "active" && !st?.active) return false;
      if (filter === "complete" && !st?.completed) return false;
      if (filter === "incomplete" && st?.completed) return false;
      return true;
    });
  }, [quests, qstate, filter, trader]);

  const counts = {
    all: quests.length,
    active: quests.filter(q => qstate[q.id]?.active).length,
    complete: quests.filter(q => qstate[q.id]?.completed).length,
  };

  return (
    <div>
      <div className="stat-bar">
        <Stat label="Total" v={counts.all} />
        <Stat label="Active" v={counts.active} />
        <Stat label="Done" v={counts.complete} />
      </div>
      <div className="cat-scroll">
        <button className={"cat" + (trader === "all" ? " on" : "")} onClick={() => setTrader("all")}>All</button>
        {traders.map(t => (
          <button key={t.id} className={"cat" + (trader === t.id ? " on" : "")} onClick={() => setTrader(t.id)}>{t.name}</button>
        ))}
      </div>
      <div className="cat-scroll sub">
        {["all", "active", "incomplete", "complete"].map(f => (
          <button key={f} className={"cat small" + (filter === f ? " on" : "")} onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>
      <div className="list">
        {filtered.map(q => {
          const st = qstate[q.id] || {};
          const t = traders.find(t => t.id === q.trader);
          const doneCount = (st.done || []).filter(Boolean).length;
          const progress = q.objectives.length ? doneCount / q.objectives.length : 0;
          return (
            <div className={"quest-card" + (st.completed ? " done" : "") + (st.active ? " act" : "")} key={q.id} onClick={() => setOpen(q)}>
              <div className="qc-left">
                <span className={"qc-status " + (st.completed ? "c" : st.active ? "a" : "")}></span>
              </div>
              <div className="qc-body">
                <div className="qc-title">
                  <strong>{q.name}</strong>
                  {q.inOneRound && <ChipB>1 round</ChipB>}
                </div>
                <div className="qc-trader">{t?.name}</div>
                {q.objectives.length > 0 && (
                  <div className="progress">
                    <div className="progress-bar"><div className="progress-fill" style={{ width: (progress * 100) + "%" }} /></div>
                    <span className="progress-n">{doneCount}/{q.objectives.length}</span>
                  </div>
                )}
              </div>
              {st.active && <span className="act-tag">ACTIVE</span>}
            </div>
          );
        })}
        {filtered.length === 0 && <p className="muted center pad">No quests here.</p>}
      </div>
      <QuestDetail quest={open} onClose={() => setOpen(null)} />
    </div>
  );
}

function ChipB({ children }) {
  return <span className="chipb">{children}</span>;
}
function Stat({ label, v }) {
  return <div className="stat"><span className="stat-v">{v}</span><span className="stat-l">{label}</span></div>;
}

function QuestDetail({ quest, onClose }) {
  const { profile, saveProfile, traders } = useApp();
  const { byName } = useItemsIndex();
  const [detail, setDetail] = useState(null);
  const linkedObjectives = useMemo(() => quest ? itemsInTexts(quest.objectives, byName) : [], [quest, byName]);
  const linkedRewards = useMemo(() => quest ? itemsInTexts(quest.rewards, byName) : [], [quest, byName]);
  if (!quest) return null;
  const t = traders.find(t => t.id === quest.trader);
  const st = profile.quests[quest.id] || {};
  const done = Array.isArray(st.done) ? st.done : quest.objectives.map(() => false);

  const set = (patch) => {
    const next = { ...profile };
    next.quests = { ...profile.quests, [quest.id]: { active: false, completed: false, done, ...st, ...patch } };
    saveProfile(next);
  };
  const toggleObj = (i) => {
    const d = done.slice();
    d[i] = !d[i];
    set({ done: d });
  };
  const allDone = done.every(Boolean) && done.length > 0;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-head">
          <h3>{quest.name}</h3>
          <button className="close" onClick={onClose}>×</button>
        </div>
        <div className="qd-meta">
          <ChipB>{t?.name}</ChipB>
          {quest.inOneRound && <ChipB>In one round</ChipB>}
        </div>
        <div className="section-t">Objectives</div>
        <div className="obj-list">
          {quest.objectives.map((o, i) => (
            <button key={i} className={"obj" + (done[i] ? " on" : "")} onClick={() => toggleObj(i)}>
              <span className="check">{done[i] ? "✓" : ""}</span>
              <span>{o}</span>
            </button>
          ))}
        </div>
        {linkedObjectives.length > 0 && (
          <>
            <div className="section-t">Linked items</div>
            <div className="link-row">
              {linkedObjectives.map(i => (
                <button key={i.slug} className="link-chip" onClick={() => setDetail(i.slug)}>
                  <ItemIcon item={i} size={22} />
                  <span>{i.name}</span>
                </button>
              ))}
            </div>
          </>
        )}
        {quest.rewards.length > 0 && (
          <>
            <div className="section-t">Rewards</div>
            <div className="rew-list">
              {quest.rewards.map((r, i) => {
                const m = linkedRewards.find(x => x.name.toLowerCase() === r.toLowerCase() || r.toLowerCase().includes(x.name.toLowerCase()));
                if (m) return <button key={i} className="chipb link" onClick={() => setDetail(m.slug)}>{m.icon && <ItemIcon item={m} size={16} />} {r}</button>;
                return <ChipB key={i}>{r}</ChipB>;
              })}
            </div>
          </>
        )}
        <div className="sheet-actions">
          <button className={"btn " + (st.active ? "ghost on" : "ghost")} onClick={() => set({ active: !st.active })}>
            {st.active ? "✓ Active" : "Mark Active"}
          </button>
          <button
            className={"btn " + (st.completed ? "primary" : "primary-dim")}
            onClick={() => {
              if (st.completed) set({ completed: false, active: false });
              else set({ completed: true, active: false, done: done.map(() => true) });
            }}
          >
            {st.completed ? "Completed ✓" : allDone ? "Complete Quest" : "Mark Complete"}
          </button>
        </div>
      </div>
      {detail && <ItemDetail slug={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
