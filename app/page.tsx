"use client";

import { useMemo, useState } from "react";
import { opportunities, type EvidenceStatus, type Opportunity } from "../lib/data";

const statusCopy: Record<EvidenceStatus, string> = { early: "Early", mixed: "Mixed", crowded: "Crowded" };

export default function Home() {
  const [selected, setSelected] = useState<Opportunity | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | EvidenceStatus>("all");
  const [view, setView] = useState<"cards" | "table">("cards");
  const [showUnknowns, setShowUnknowns] = useState(true);

  const visible = useMemo(() => opportunities.filter((item) => {
    const matchesFilter = filter === "all" || item.status === filter;
    const haystack = `${item.title} ${item.category} ${item.thesis} ${item.tags.join(" ")}`.toLowerCase();
    return matchesFilter && haystack.includes(query.toLowerCase());
  }), [filter, query]);

  return <main className="shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">o</span><span>oppie<span className="muted">.lab</span></span></div>
      <div className="side-label">Workspace</div>
      <button className="nav active"><span>◈</span> Opportunity board <span className="count">06</span></button>
      <button className="nav"><span>⌁</span> Research queue <span className="count dim">03</span></button>
      <button className="nav"><span>↗</span> Source library</button>
      <div className="side-label lower">Working rules</div>
      <div className="rule"><span className="rule-dot green" /> Evidence over vibes</div>
      <div className="rule"><span className="rule-dot yellow" /> Unknowns stay visible</div>
      <div className="rule"><span className="rule-dot red" /> Kill before you build</div>
      <div className="sidebar-bottom"><div className="avatar">A</div><div><strong>Artem</strong><span>Private workspace</span></div><span className="dots">•••</span></div>
    </aside>

    <section className="content">
      <header className="topbar"><div className="breadcrumb"><span>Workspace</span><b>/</b><strong>Opportunity board</strong></div><div className="top-actions"><span className="sync"><i /> Research snapshot · Sep 24, 2026</span><button className="icon-button">?</button><button className="avatar small">A</button></div></header>
      <div className="page-head"><div><div className="eyebrow">OPPIE.LAB / ROUND 01</div><h1>Business opportunities</h1><p>Six directions. Evidence first. No optimistic scores.</p></div><button className="primary" onClick={() => setSelected(opportunities[5])}><span>＋</span> Add opportunity</button></div>

      <div className="signal-strip"><div className="signal-intro"><span className="signal-icon">◒</span><div><strong>Read the signal, not the story</strong><span>We are still researching. Each card separates what we know from what could kill the idea.</span></div></div><div className="signal-stats"><div><b>06</b><span>candidates</span></div><div><b>11</b><span>sources linked</span></div><div><b>06</b><span>kill reasons</span></div></div></div>

      <div className="toolbar"><div className="search"><span>⌕</span><input aria-label="Search opportunities" placeholder="Search opportunities" value={query} onChange={(e) => setQuery(e.target.value)} /></div><div className="filters"><button className={filter === "all" ? "filter active" : "filter"} onClick={() => setFilter("all")}>All <em>06</em></button><button className={filter === "early" ? "filter active" : "filter"} onClick={() => setFilter("early")}>Early <em>01</em></button><button className={filter === "mixed" ? "filter active" : "filter"} onClick={() => setFilter("mixed")}>Mixed <em>02</em></button><button className={filter === "crowded" ? "filter active" : "filter"} onClick={() => setFilter("crowded")}>Crowded <em>03</em></button></div><div className="view-toggle"><button className={view === "cards" ? "selected" : ""} onClick={() => setView("cards")}>▦</button><button className={view === "table" ? "selected" : ""} onClick={() => setView("table")}>☷</button></div></div>

      {view === "cards" ? <div className="cards-grid">{visible.map((item) => <OpportunityCard key={item.id} item={item} onOpen={() => setSelected(item)} />)}</div> : <OpportunityTable items={visible} onOpen={setSelected} />}
      {visible.length === 0 && <div className="empty">No opportunities match that filter.</div>}
      <footer className="footer"><span>oppie.lab is a research tool, not a prediction engine.</span><span>Last edited just now · <button onClick={() => setShowUnknowns(!showUnknowns)}>{showUnknowns ? "Hide" : "Show"} unknowns</button></span></footer>
    </section>
    {selected && <DetailPanel item={selected} onClose={() => setSelected(null)} showUnknowns={showUnknowns} />}
  </main>;
}

function StatusPill({ item }: { item: Opportunity }) { return <span className={`status ${item.status}`}><i />{statusCopy[item.status]}</span>; }
function OpportunityCard({ item, onOpen }: { item: Opportunity; onOpen: () => void }) { return <article className={`op-card ${item.status}`} onClick={onOpen}><div className="card-top"><span className="index">{item.number}</span><StatusPill item={item} /><span className="arrow">↗</span></div><h2>{item.title}</h2><span className="category">{item.category}</span><p>{item.thesis}</p><div className="card-divider" /><div className="card-meta"><div><span>Evidence</span><strong>{item.statusLabel}</strong></div><div><span>Build est.</span><strong>{item.build}</strong></div></div><div className="card-bottom"><div className="source-stack">{item.sources.map((source) => <span key={source.type} className={`source ${source.type.toLowerCase()}`}>{source.type === "Company" ? "C" : source.type === "Reddit" ? "R" : "Y"}</span>)}</div><span className="source-count">{item.sources.length} sources <b>→</b></span></div></article>; }
function OpportunityTable({ items, onOpen }: { items: Opportunity[]; onOpen: (item: Opportunity) => void }) { return <div className="table-wrap"><table><thead><tr><th>Opportunity</th><th>Evidence</th><th>Build est.</th><th>Price hypothesis</th><th>Next test</th></tr></thead><tbody>{items.map((item) => <tr key={item.id} onClick={() => onOpen(item)}><td><span className="table-number">{item.number}</span><strong>{item.title}</strong><small>{item.category}</small></td><td><StatusPill item={item} /></td><td>{item.build}</td><td>{item.price}</td><td>{item.nextTest}</td></tr>)}</tbody></table></div>; }
function DetailPanel({ item, onClose, showUnknowns }: { item: Opportunity; onClose: () => void; showUnknowns: boolean }) { return <div className="drawer-backdrop" onClick={onClose}><aside className="drawer" onClick={(e) => e.stopPropagation()}><div className="drawer-head"><span className="eyebrow">OPPORTUNITY / {item.number}</span><button className="close" onClick={onClose}>×</button></div><StatusPill item={item} /><h2>{item.title}</h2><p className="drawer-thesis">{item.thesis}</p><div className="detail-block"><span className="detail-label">WHAT WE KNOW</span><p>{item.evidence}</p></div>{showUnknowns && <div className="detail-block unknown-block"><span className="detail-label">WHAT WE DON&apos;T KNOW YET</span><p>{item.unknown}</p></div>}<div className="economics"><div><span>Build estimate</span><strong>{item.build}</strong></div><div><span>Pricing hypothesis</span><strong>{item.price}</strong></div></div><div className="detail-block kill"><span className="detail-label">KILL REASON</span><p>{item.killReason}</p></div><div className="next-test"><span className="detail-label">NEXT TEST</span><strong>{item.nextTest}</strong></div><div className="drawer-sources"><span className="detail-label">SOURCES</span>{item.sources.map((source) => <a key={source.label} href={source.url} target="_blank" rel="noreferrer"><span className={`source ${source.type.toLowerCase()}`}>{source.type === "Company" ? "C" : source.type === "Reddit" ? "R" : "Y"}</span>{source.label}<b>↗</b></a>)}</div><button className="secondary" onClick={onClose}>Back to board</button></aside></div>; }
