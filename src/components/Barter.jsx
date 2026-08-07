import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "../App.jsx";
import { api } from "../api.js";
import { SearchBox, ItemIcon, ItemPicker, Stepper, ItemDetail } from "./ui.jsx";

// Check whether the profile's stash can cover a listing's WANT items.
function canFulfill(stash, want) {
  return want.length > 0 && want.every(w => {
    const have = stash.find(s => s.slug === w.slug);
    return have && have.qty >= w.qty;
  });
}

export default function Barter() {
  const { profile, setTradeMatchCount } = useApp();
  const [listings, setListings] = useState([]);
  const [ratings, setRatings] = useState({});
  const [myVotes, setMyVotes] = useState({});
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("open");
  const [matchFilter, setMatchFilter] = useState(false);
  const [itemFilter, setItemFilter] = useState(null); // {slug,name}
  const [posting, setPosting] = useState(false);
  const [detail, setDetail] = useState(null);
  const [itemPicker, setItemPicker] = useState(false);
  const [flash, setFlash] = useState(null);

  const refresh = async () => {
    try {
      const [l, r, mine] = await Promise.all([api.barter(), api.ratings(), api.myRatings(profile.id)]);
      setListings(l); setRatings(r); setMyVotes(mine.myVotes || {});
    } catch (e) { setFlash("Couldn't load trade board."); }
  };
  useEffect(() => { refresh(); }, []);

  const notify = (msg) => { setFlash(msg); setTimeout(() => setFlash(null), 2500); };

  const stash = profile.stash || [];
  // Listings whose WANT items your stash can cover.
  const matches = useMemo(() => new Set(listings.filter(l => l.status === "open" && canFulfill(stash, l.want)).map(l => l.id)), [listings, stash]);
  useEffect(() => { setTradeMatchCount(matches.size); }, [matches.size, setTradeMatchCount]);
  // Listings that reference a specific item (for the item filter).
  const hasItem = (l, slug) => (l.offer.concat(l.want)).some(i => i.slug === slug);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return listings.filter(l => {
      if (tab === "open" && l.status !== "open") return false;
      if (tab === "claimed" && l.status !== "claimed") return false;
      if (matchFilter && !matches.has(l.id)) return false;
      if (itemFilter && !hasItem(l, itemFilter.slug)) return false;
      if (query) {
        const hay = (l.offer.concat(l.want).map(i => i.name).join(" ") + " " + l.posterName + " " + (l.note || "")).toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });
  }, [listings, q, tab, matchFilter, itemFilter, matches]);

  const onClaim = async (l) => {
    try {
      const r = await api.claimBarter(l.id, { profileId: profile.id, profileName: profile.name });
      if (r.error) return notify(r.error);
      setListings(await api.barter());
      notify("Claimed — coordinate with " + l.posterName + ".");
    } catch (e) { notify("Claim failed."); }
  };
  const onUnclaim = async (l) => {
    try {
      const r = await api.unclaimBarter(l.id, { profileId: profile.id });
      if (r.error) return notify(r.error);
      setListings(await api.barter());
      notify("Released back to the board.");
    } catch (e) { notify("Failed."); }
  };
  const onDelete = async (l) => {
    if (!confirm("Delete this trade?")) return;
    try {
      const r = await api.deleteBarter(l.id, { profileId: profile.id });
      if (r.error) return notify(r.error);
      setListings(await api.barter());
      notify("Trade removed.");
    } catch (e) { notify("Failed."); }
  };

  const onVote = async (l, value) => {
    try {
      const r = await api.vote(l.posterId, { voterId: profile.id, value });
      if (r.error) return notify(r.error);
      setRatings(prev => ({ ...prev, [l.posterId]: r }));
      setMyVotes(prev => ({ ...prev, [l.posterId]: r.myVote }));
    } catch (e) { notify("Vote failed."); }
  };

  return (
    <div>
      <div className="barter-head">
        <div>
          <h2 className="page-title">Trade Board</h2>
          <p className="muted small">Post what you have, ask for what you need. Claim to reserve, then coordinate with the poster.</p>
        </div>
        <button className="btn primary" onClick={() => setPosting(true)}>+ Post</button>
      </div>

      {flash && <div className="flash">{flash}</div>}

      <div className="stat-bar">
        <div className="stat"><span className="stat-v">{listings.filter(l => l.status === "open").length}</span><span className="stat-l">Open</span></div>
        <div className="stat"><span className="stat-v">{listings.filter(l => l.status === "claimed").length}</span><span className="stat-l">Claimed</span></div>
        <div className="stat"><span className="stat-v">{matches.size}</span><span className="stat-l">You can fill</span></div>
      </div>

      {matches.size > 0 && (
        <div className="match-banner" onClick={() => { setMatchFilter(!matchFilter); setTab("open"); }}>
          <span>🎯 {matches.size} open trade{matches.size > 1 ? "s" : ""} match{matches.size > 1 ? "" : "es"} your stash</span>
          <button className={"cat small" + (matchFilter ? " on" : "")} onClick={(e) => { e.stopPropagation(); setMatchFilter(!matchFilter); }}>{matchFilter ? "Showing matches" : "Show matches"}</button>
        </div>
      )}

      <div className="bar">
        <SearchBox value={q} onChange={setQ} placeholder="Search trades…" />
        <button className={"btn filter-btn" + (itemFilter ? " active" : "")} onClick={() => setItemPicker(true)} title="Filter by item">
          {itemFilter ? "◆" : "◇"}
        </button>
      </div>

      {itemFilter && (
        <div className="active-filter">
          <span>Filtering by: <ItemIcon item={itemFilter} size={20} /> {itemFilter.name}</span>
          <button className="clear" onClick={() => setItemFilter(null)}>×</button>
        </div>
      )}

      <div className="cat-scroll sub">
        <button className={"cat" + (tab === "open" ? " on" : "")} onClick={() => setTab("open")}>Open</button>
        <button className={"cat" + (tab === "claimed" ? " on" : "")} onClick={() => setTab("claimed")}>Claimed</button>
      </div>

      <div className="list">
        {filtered.map(l => (
          <div className={"trade-card" + (l.status === "claimed" ? " claimed" : "") + (matches.has(l.id) ? " match" : "")} key={l.id}>
            <div className="tc-head">
              <span className="tc-poster">
                <span className="poster-avatar">◉</span> {l.posterName}
                <Rating r={ratings[l.posterId]} myVote={myVotes[l.posterId]} onVote={v => onVote(l, v)} self={l.posterId === profile.id} />
              </span>
              {matches.has(l.id) && <span className="tc-match">MATCH</span>}
              {l.status === "claimed"
                ? <span className="tc-status c">Claimed by {l.claimedBy?.name}</span>
                : <span className="tc-status o">Open</span>}
            </div>

            <div className="tc-trade">
              <div className="tc-col">
                <div className="tc-label">HAVE</div>
                {l.offer.map(i => (
                  <button key={i.slug} className="tc-item" onClick={() => setDetail(i.slug)}>
                    <ItemIcon item={i} size={30} />
                    <span>{i.qty}× {i.name}</span>
                  </button>
                ))}
                {l.offer.length === 0 && <span className="muted small">—</span>}
              </div>
              <div className="tc-arrow">⇄</div>
              <div className="tc-col">
                <div className="tc-label">WANT</div>
                {l.want.map(i => (
                  <button key={i.slug} className="tc-item" onClick={() => setDetail(i.slug)}>
                    <ItemIcon item={i} size={30} />
                    <span>{i.qty}× {i.name}</span>
                  </button>
                ))}
                {l.want.length === 0 && <span className="muted small">—</span>}
              </div>
            </div>

            {l.note && <div className="tc-note">“{l.note}”</div>}

            <div className="tc-actions">
              {l.status === "open" && l.posterId !== profile.id && (
                <button className="btn primary-dim" onClick={() => onClaim(l)}>Claim</button>
              )}
              {l.status === "open" && l.posterId === profile.id && (
                <span className="muted small">Your post</span>
              )}
              {l.status === "claimed" && (l.claimedBy?.profileId === profile.id) && (
                <button className="btn ghost" onClick={() => onUnclaim(l)}>Release</button>
              )}
              {l.status === "claimed" && (l.claimedBy?.profileId === profile.id) && (
                <span className="muted small">Coordinate with {l.posterName}.</span>
              )}
              {l.posterId === profile.id && (
                <button className="remove" onClick={() => onDelete(l)}>🗑 Delete</button>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="muted center pad">No trades here yet. Post one to get the community going.</p>}
      </div>

      {posting && <PostTrade profile={profile} onClose={() => setPosting(false)} onPosted={() => { setPosting(false); refresh(); }} notify={notify} />}
      {detail && <ItemDetail slug={detail} onClose={() => setDetail(null)} />}
      {itemPicker && (
        <ItemPicker open={itemPicker} onClose={() => setItemPicker(false)} onAdd={(item) => { setItemFilter({ slug: item.slug, name: item.name, icon: item.icon, rarity: item.rarity }); setItemPicker(false); }} />
      )}
    </div>
  );
}

// ---- Rating block ----
function Rating({ r, myVote, onVote, self }) {
  const r0 = r || { score: 0, up: 0, down: 0, votes: 0 };
  return (
    <span className="rating" title={self ? "You can't rate yourself" : "Rate this Raider"}>
      <button className={"rate up" + (myVote === 1 ? " on" : "")} disabled={self} onClick={() => onVote(1)}>▲</button>
      <span className={"rscore " + (r0.score > 0 ? "pos" : r0.score < 0 ? "neg" : "")}>{r0.score > 0 ? "+" : ""}{r0.score}</span>
      <button className={"rate down" + (myVote === -1 ? " on" : "")} disabled={self} onClick={() => onVote(-1)}>▼</button>
      <span className="rvotes">({r0.votes})</span>
    </span>
  );
}

function PostTrade({ profile, onClose, onPosted, notify }) {
  const [offer, setOffer] = useState([]);
  const [want, setWant] = useState([]);
  const [note, setNote] = useState("");
  const [pickerTarget, setPickerTarget] = useState(null);
  const [busy, setBusy] = useState(false);

  const addTo = (target, item) => {
    const setter = target === "offer" ? setOffer : setWant;
    const list = target === "offer" ? offer : want;
    const idx = list.findIndex(e => e.slug === item.slug);
    if (idx >= 0) setter(list.map((e, i) => i === idx ? { ...e, qty: e.qty + 1 } : e));
    else setter([...list, { slug: item.slug, name: item.name, icon: item.icon, rarity: item.rarity, sell_value: item.sell_value, qty: 1 }]);
  };
  const setQty = (target, slug, qty) => {
    const setter = target === "offer" ? setOffer : setWant;
    const list = target === "offer" ? offer : want;
    setter(list.map(e => e.slug === slug ? { ...e, qty } : e));
  };
  const removeFrom = (target, slug) => {
    const setter = target === "offer" ? setOffer : setWant;
    const list = target === "offer" ? offer : want;
    setter(list.filter(e => e.slug !== slug));
  };

  const submit = async () => {
    if (offer.length === 0 && want.length === 0) { notify("Add at least one item."); return; }
    setBusy(true);
    try {
      const clean = (arr) => arr.map(({ slug, name, icon, qty }) => ({ slug, name, icon: icon || null, qty }));
      await api.createBarter({ profileId: profile.id, profileName: profile.name, offer: clean(offer), want: clean(want), note });
      notify("Trade posted!");
      onPosted();
    } catch (e) { notify("Couldn't post. Try again."); setBusy(false); }
  };

  const ItemSection = ({ title, items, target }) => (
    <div className="pt-section">
      <div className="pt-head"><span className="pt-title">{title}</span><button className="btn ghost small-btn" onClick={() => setPickerTarget(target)}>+ Add</button></div>
      <div className="pt-list">
        {items.map(e => (
          <div className="inv-row" key={e.slug}>
            <ItemIcon item={e} size={32} />
            <div className="inv-name"><span>{e.name}</span><span className="muted small">{e.category || ""}</span></div>
            <Stepper value={e.qty} onChange={v => setQty(target, e.slug, v)} />
            <button className="remove" onClick={() => removeFrom(target, e.slug)}>✕</button>
          </div>
        ))}
        {items.length === 0 && <p className="muted small pad">None yet.</p>}
      </div>
    </div>
  );

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-head">
          <h3>Post a trade</h3>
          <button className="close" onClick={onClose}>×</button>
        </div>
        <p className="muted small">List the items you’re offering (HAVE) and what you want in return (WANT).</p>
        <ItemSection title="HAVE (you offer)" items={offer} target="offer" />
        <ItemSection title="WANT (you need)" items={want} target="want" />
        <div className="pt-note">
          <label className="pt-label">Note (optional)</label>
          <textarea className="input area" rows={2} placeholder="Details, condition, contact…" value={note} onChange={e => setNote(e.target.value)} />
        </div>
        <div className="sheet-actions">
          <button className="btn ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn primary" onClick={submit} disabled={busy}>{busy ? "Posting…" : "Post Trade"}</button>
        </div>
      </div>
      {pickerTarget && (
        <ItemPicker open={!!pickerTarget} onClose={() => setPickerTarget(null)} onAdd={(item) => { addTo(pickerTarget, item); setPickerTarget(null); }} />
      )}
    </div>
  );
}
