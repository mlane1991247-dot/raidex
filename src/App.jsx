import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api } from "./api.js";
import Library from "./components/Library.jsx";
import Quests from "./components/Quests.jsx";
import Inventory from "./components/Inventory.jsx";
import Stash from "./components/Stash.jsx";
import Barter from "./components/Barter.jsx";
import Profile from "./components/Profile.jsx";
import { ProfileGate } from "./components/ProfileGate.jsx";

const AppCtx = createContext(null);
export const useApp = () => useContext(AppCtx);

export default function App() {
  const [meta, setMeta] = useState(null);
  const [items, setItems] = useState([]);
  const [quests, setQuests] = useState([]);
  const [traders, setTraders] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [stations, setStations] = useState([]);
  const [projects, setProjects] = useState([]);
  const [stashInfo, setStashInfo] = useState(null);

  const [profiles, setProfiles] = useState([]);
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState("library");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [tradeMatchCount, setTradeMatchCount] = useState(0);
  const saveTimer = useRef(null);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  // Load all content data
  useEffect(() => {
    (async () => {
      try {
        const [items, quests, traders, recipes, stations, projects, stashInfo, profiles] = await Promise.all([
          api.items(), api.quests(), api.traders(), api.recipes(), api.stations(), api.projects(), api.stash(), api.profiles(),
        ]);
        setItems(items); setQuests(quests); setTraders(traders); setRecipes(recipes);
        setStations(stations); setProjects(projects); setStashInfo(stashInfo); setProfiles(profiles);
        setMeta({ items: items.length, quests: quests.length, recipes: recipes.length });
      } catch (e) {
        setError(String(e && e.message ? e.message : e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const selectProfile = async (id) => {
    if (!id) { setProfile(null); return; }
    try {
      const p = await api.getProfile(id);
      setProfile(p);
    } catch (e) {
      setError(String(e.message || e));
    }
  };

  const createProfile = async (name) => {
    const p = await api.createProfile(name);
    const list = await api.profiles();
    setProfiles(list);
    setProfile(p);
    return p;
  };

  // Persist profile changes (cloud sync) with small debounce
  const saveProfile = (next) => {
    setProfile(next);
    setSyncing(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await api.putProfile(next.id, {
          inventory: next.inventory,
          stash: next.stash,
          quests: next.quests,
          stashLevel: next.stashLevel,
          notes: next.notes,
        });
      } catch (e) {
        setError("Sync failed: " + (e.message || e));
      } finally {
        setSyncing(false);
      }
    }, 250);
  };

  const value = {
    meta, items, quests, traders, recipes, stations, projects, stashInfo,
    profiles, profile, tab, setTab, loading, error, online, syncing,
    tradeMatchCount, setTradeMatchCount,
    selectProfile, createProfile, saveProfile,
  };

  if (loading) return <Splash />;

  return (
    <AppCtx.Provider value={value}>
      <div className="shell">
        <Header />
        <main className="content">
          {!profile ? <ProfileGate /> : <TabView />}
        </main>
        <BottomNav />
      </div>
    </AppCtx.Provider>
  );
}

function Header() {
  const { meta, online, syncing, profile } = useApp();
  return (
    <header className="app-header">
      <div className="brand">
        <span className="brand-mark">⚙</span>
        <div>
          <h1>RAIDEX</h1>
          <span className="sub">ARC Raiders Companion</span>
        </div>
      </div>
      <div className="header-meta">
        {syncing && <span className="sync" title="Syncing to cloud">⇄</span>}
        <span className={online ? "dot on" : "dot off"} title={online ? "Cloud online" : "Offline"}></span>
        {profile && <span className="chip">{profile.name}</span>}
      </div>
    </header>
  );
}

function TabView() {
  const { tab } = useApp();
  switch (tab) {
    case "library": return <Library />;
    case "quests": return <Quests />;
    case "inventory": return <Inventory />;
    case "stash": return <Stash />;
    case "trade": return <Barter />;
    default: return <Profile />;
  }
}

function BottomNav() {
  const { tab, setTab, profile, tradeMatchCount } = useApp();
  const tabs = [
    { id: "library", label: "Library", icon: "▦" },
    { id: "quests", label: "Quests", icon: "✦" },
    { id: "inventory", label: "Loot", icon: "⬡" },
    { id: "stash", label: "Stash", icon: "▤" },
    { id: "trade", label: "Trade", icon: "⇄", badge: tradeMatchCount },
    { id: "profile", label: "Raider", icon: "◉" },
  ];
  return (
    <nav className="bottom-nav">
      {tabs.map(t => (
        <button
          key={t.id}
          className={"nav-item" + (tab === t.id ? " active" : "")}
          onClick={() => setTab(t.id)}
          disabled={!profile && t.id !== "profile"}
        >
          <span className="nav-icon">{t.icon}
            {t.badge > 0 && <span className="nav-badge">{t.badge}</span>}
          </span>
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}

function Splash() {
  return (
    <div className="splash">
      <div className="splash-mark">⚙</div>
      <h1>RAIDEX</h1>
      <p>Loading the Rust Belt…</p>
    </div>
  );
}
