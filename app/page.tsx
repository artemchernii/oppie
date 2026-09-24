"use client";

import { useEffect, useMemo, useState } from "react";
import {
  confidences,
  emptyOpportunity,
  evidenceStatusCopy,
  evidenceStatuses,
  sourceTypes,
  stages,
  type Confidence,
  type EvidenceStatus,
  type Opportunity,
  type Source
} from "../lib/data";
import { nextOpportunityId } from "../lib/persistence";
import { useOpportunities } from "../lib/store";

const pad = (n: number) => String(n).padStart(2, "0");

const parseTags = (value: string) =>
  value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

const sourceInitial = (type: Source["type"]) => (type === "Reddit" ? "R" : type === "YC" ? "Y" : type.slice(0, 1).toUpperCase());

export default function Home() {
  const { opportunities, hydrated, storageError, lastSavedAt, updateOpportunity, insertOpportunity, resetToSeed } = useOpportunities();

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | EvidenceStatus>("all");
  const [view, setView] = useState<"cards" | "table">("cards");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // A draft is either a brand-new record or a detached copy of an existing one.
  // Detached on purpose: Cancel must not touch stored data.
  const [draft, setDraft] = useState<{ item: Opportunity; isNew: boolean } | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (!savedFlash) return;
    const timer = window.setTimeout(() => setSavedFlash(false), 2400);
    return () => window.clearTimeout(timer);
  }, [savedFlash]);

  const selected = useMemo(() => opportunities.find((item) => item.id === selectedId) ?? null, [opportunities, selectedId]);

  const visible = useMemo(
    () =>
      opportunities.filter((item) => {
        const matchesFilter = filter === "all" || item.evidenceStatus === filter;
        const haystack = [
          item.title,
          item.category,
          item.thesis,
          item.stage,
          item.statusNote,
          item.evidenceSummary,
          item.unknowns,
          item.killReason,
          item.nextTest,
          item.tags.join(" "),
          item.sources.map((source) => `${source.label} ${source.type}`).join(" ")
        ]
          .join(" ")
          .toLowerCase();
        return matchesFilter && haystack.includes(query.trim().toLowerCase());
      }),
    [opportunities, filter, query]
  );

  const counts = useMemo(() => {
    const sources = opportunities.reduce((total, item) => total + item.sources.length, 0);
    const killReasons = opportunities.filter((item) => item.killReason.trim().length > 0).length;
    const byStatus: Record<EvidenceStatus, number> = { early: 0, mixed: 0, crowded: 0 };
    for (const item of opportunities) byStatus[item.evidenceStatus] += 1;
    const queue = opportunities.filter((item) => item.stage === "investigate" || item.stage === "validate").length;
    return { sources, killReasons, byStatus, queue };
  }, [opportunities]);

  const lastEdited = useMemo(() => {
    if (opportunities.length === 0) return null;
    return opportunities.reduce((latest, item) => (item.updatedAt > latest ? item.updatedAt : latest), opportunities[0].updatedAt);
  }, [opportunities]);

  const openAdd = () => {
    setSelectedId(null);
    setDraft({ item: emptyOpportunity(nextOpportunityId(opportunities)), isNew: true });
  };

  const openEdit = (item: Opportunity) => setDraft({ item, isNew: false });

  const saveDraft = (next: Opportunity) => {
    if (draft?.isNew) insertOpportunity(next);
    else updateOpportunity(next.id, next);
    setDraft(null);
    setSelectedId(next.id);
    setSavedFlash(true);
  };

  const confirmReset = () => {
    if (!window.confirm("Reset all opportunities to the six seeded candidates? Local edits in this browser will be discarded.")) return;
    resetToSeed();
    setSelectedId(null);
    setDraft(null);
  };

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">o</span>
          <span>
            oppie<span className="muted">.lab</span>
          </span>
        </div>
        <div className="side-label">Workspace</div>
        <button className="nav active">
          <span>◈</span> Opportunity board <span className="count">{pad(opportunities.length)}</span>
        </button>
        <button className="nav">
          <span>⌁</span> Research queue <span className="count dim">{pad(counts.queue)}</span>
        </button>
        <button className="nav">
          <span>↗</span> Source library
        </button>
        <div className="side-label lower">Working rules</div>
        <div className="rule">
          <span className="rule-dot green" /> Evidence over vibes
        </div>
        <div className="rule">
          <span className="rule-dot yellow" /> Unknowns stay visible
        </div>
        <div className="rule">
          <span className="rule-dot red" /> Kill before you build
        </div>
        <div className="sidebar-bottom">
          <div className="avatar">A</div>
          <div>
            <strong>Artem</strong>
            <span>Private workspace</span>
          </div>
          <span className="dots">•••</span>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Workspace</span>
            <b>/</b>
            <strong>Opportunity board</strong>
          </div>
          <div className="top-actions">
            <span className="sync">
              <i /> Research snapshot · Sep 24, 2026
            </span>
            <button className="icon-button">?</button>
            <button className="avatar small">A</button>
          </div>
        </header>

        <div className="page-head">
          <div>
            <div className="eyebrow">OPPIE.LAB / ROUND 01</div>
            <h1>Business opportunities</h1>
            <p>Six directions. Evidence first. No optimistic scores.</p>
          </div>
          <div className="head-actions">
            {savedFlash && <span className="saved-flag">Saved ✓</span>}
            <button className="primary" onClick={openAdd}>
              <span>＋</span> Add opportunity
            </button>
          </div>
        </div>

        <div className="signal-strip">
          <div className="signal-intro">
            <span className="signal-icon">◒</span>
            <div>
              <strong>Read the signal, not the story</strong>
              <span>We are still researching. Each card separates what we know from what could kill the idea.</span>
            </div>
          </div>
          <div className="signal-stats">
            <div>
              <b>{pad(opportunities.length)}</b>
              <span>candidates</span>
            </div>
            <div>
              <b>{pad(counts.sources)}</b>
              <span>sources linked</span>
            </div>
            <div>
              <b>{pad(counts.killReasons)}</b>
              <span>kill reasons</span>
            </div>
          </div>
        </div>

        <div className="toolbar">
          <div className="search">
            <span>⌕</span>
            <input aria-label="Search opportunities" placeholder="Search opportunities" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          <div className="filters">
            <button className={filter === "all" ? "filter active" : "filter"} onClick={() => setFilter("all")}>
              All <em>{pad(opportunities.length)}</em>
            </button>
            {evidenceStatuses.map((status) => (
              <button key={status} className={filter === status ? "filter active" : "filter"} onClick={() => setFilter(status)}>
                {evidenceStatusCopy[status].label} <em>{pad(counts.byStatus[status])}</em>
              </button>
            ))}
          </div>
          <div className="view-toggle">
            <button className={view === "cards" ? "selected" : ""} onClick={() => setView("cards")}>
              ▦
            </button>
            <button className={view === "table" ? "selected" : ""} onClick={() => setView("table")}>
              ☷
            </button>
          </div>
        </div>

        {view === "cards" ? (
          <div className="cards-grid">
            {visible.map((item, index) => (
              <OpportunityCard key={item.id} item={item} index={index} onOpen={() => setSelectedId(item.id)} />
            ))}
          </div>
        ) : (
          <OpportunityTable items={visible} onOpen={(item) => setSelectedId(item.id)} />
        )}
        {visible.length === 0 && <div className="empty">No opportunities match that filter.</div>}

        <footer className="footer">
          <span>oppie.lab is a research tool, not a prediction engine.</span>
          <span className="footer-right">
            {storageError ? (
              <b className="storage-warn">Local storage unavailable — edits will not persist</b>
            ) : (
              <>
                Stored in this browser
                {hydrated && lastSavedAt ? ` · saved ${formatTime(lastSavedAt)}` : ""}
                {hydrated && lastEdited ? ` · last edited ${formatTime(lastEdited)}` : ""}
              </>
            )}
            {hydrated && (
              <button className="link-button" onClick={confirmReset}>
                Reset to seed
              </button>
            )}
          </span>
        </footer>
      </section>

      {draft ? (
        // No backdrop-to-close while editing: a stray click must not discard a form.
        <Drawer wide closeOnBackdrop={false} onClose={() => setDraft(null)}>
          <EditForm item={draft.item} isNew={draft.isNew} onCancel={() => setDraft(null)} onSave={saveDraft} />
        </Drawer>
      ) : (
        selected && (
          <Drawer closeOnBackdrop onClose={() => setSelectedId(null)}>
            <DetailView item={selected} index={opportunities.findIndex((entry) => entry.id === selected.id)} savedFlash={savedFlash} onEdit={() => openEdit(selected)} onClose={() => setSelectedId(null)} />
          </Drawer>
        )
      )}
    </main>
  );
}

function formatTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function StatusPill({ item }: { item: Opportunity }) {
  return (
    <span className={`status ${item.evidenceStatus}`}>
      <i />
      {evidenceStatusCopy[item.evidenceStatus].label}
    </span>
  );
}

function StageChip({ stage }: { stage: Opportunity["stage"] }) {
  return <span className={`stage-chip ${stage}`}>{stage}</span>;
}

/** Empty values stay visible and legible. Never hidden, never faked. */
function Value({ text, className }: { text: string; className?: string }) {
  const trimmed = text.trim();
  if (!trimmed) return <p className={`not-added ${className ?? ""}`}>Not added yet</p>;
  return <p className={className}>{trimmed}</p>;
}

function SourceBadge({ type }: { type: Source["type"] }) {
  return <span className={`source ${type.toLowerCase()}`}>{sourceInitial(type)}</span>;
}

function OpportunityCard({ item, index, onOpen }: { item: Opportunity; index: number; onOpen: () => void }) {
  return (
    <article className={`op-card ${item.evidenceStatus}`} onClick={onOpen}>
      <div className="card-top">
        <span className="index">{pad(index + 1)}</span>
        <StatusPill item={item} />
        {item.stage !== "discovery" && <StageChip stage={item.stage} />}
        <span className="arrow">↗</span>
      </div>
      <h2>{item.title.trim() || "Untitled opportunity"}</h2>
      <span className="category">{item.category.trim() || "Not added yet"}</span>
      <p>{item.thesis.trim() || "No thesis yet."}</p>
      <div className="card-divider" />
      <div className="card-meta">
        <div>
          <span>Evidence</span>
          <strong>
            {evidenceStatusCopy[item.evidenceStatus].conclusion}
            {item.statusNote.trim() ? ` · ${item.statusNote.trim()}` : ""}
          </strong>
        </div>
        <div>
          <span>Build est.</span>
          <strong>{item.buildEstimate.trim() || "Not added yet"}</strong>
        </div>
      </div>
      <div className="card-bottom">
        {item.sources.length > 0 ? (
          <div className="source-stack">
            {item.sources.map((source) => (
              <SourceBadge key={source.id} type={source.type} />
            ))}
          </div>
        ) : (
          <span className="source-count">No sources yet</span>
        )}
        <span className="source-count">
          {item.sources.length} sources <b>→</b>
        </span>
      </div>
    </article>
  );
}

function OpportunityTable({ items, onOpen }: { items: Opportunity[]; onOpen: (item: Opportunity) => void }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Opportunity</th>
            <th>Evidence</th>
            <th>Build est.</th>
            <th>Price hypothesis</th>
            <th>Next test</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} onClick={() => onOpen(item)}>
              <td>
                <strong>{item.title.trim() || "Untitled opportunity"}</strong>
                <small>
                  {item.category.trim() || "Not added yet"} <StageChip stage={item.stage} />
                </small>
              </td>
              <td>
                <StatusPill item={item} />
              </td>
              <td>{item.buildEstimate.trim() || <span className="not-added inline">Not added yet</span>}</td>
              <td>{item.pricingHypothesis.trim() || <span className="not-added inline">Not added yet</span>}</td>
              <td>{item.nextTest.trim() || <span className="not-added inline">Not added yet</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Drawer({ children, wide = false, closeOnBackdrop = true, onClose }: { children: React.ReactNode; wide?: boolean; closeOnBackdrop?: boolean; onClose: () => void }) {
  return (
    <div className="drawer-backdrop" onClick={closeOnBackdrop ? onClose : undefined}>
      <aside className={wide ? "drawer wide" : "drawer"} onClick={(event) => event.stopPropagation()}>
        {children}
      </aside>
    </div>
  );
}

function DetailView({ item, index, savedFlash, onEdit, onClose }: { item: Opportunity; index: number; savedFlash: boolean; onEdit: () => void; onClose: () => void }) {
  return (
    <>
      <div className="drawer-head">
        <span className="eyebrow">OPPORTUNITY / {pad(index + 1)}</span>
        <div className="drawer-head-actions">
          {savedFlash && <span className="saved-flag">Saved ✓</span>}
          <button className="close" onClick={onClose}>
            ×
          </button>
        </div>
      </div>
      <div className="drawer-status-row">
        <StatusPill item={item} />
        <StageChip stage={item.stage} />
        {item.statusNote.trim() && <span className="status-note">{item.statusNote.trim()}</span>}
      </div>
      <h2>{item.title.trim() || "Untitled opportunity"}</h2>
      <Value className="drawer-thesis" text={item.thesis} />

      <div className="detail-block">
        <span className="detail-label">WHAT WE KNOW</span>
        <Value text={item.evidenceSummary} />
      </div>

      <div className="detail-block unknown-block">
        <span className="detail-label">WHAT WE DON&apos;T KNOW YET</span>
        <Value text={item.unknowns} />
      </div>

      <div className="economics">
        <div>
          <span>Build estimate</span>
          {item.buildEstimate.trim() ? <strong>{item.buildEstimate}</strong> : <strong className="not-added">Not added yet</strong>}
        </div>
        <div>
          <span>Pricing hypothesis</span>
          {item.pricingHypothesis.trim() ? <strong>{item.pricingHypothesis}</strong> : <strong className="not-added">Not added yet</strong>}
        </div>
      </div>

      <div className="detail-block kill">
        <span className="detail-label">KILL REASON</span>
        <Value text={item.killReason} />
      </div>

      <div className="next-test">
        <span className="detail-label">NEXT TEST</span>
        {item.nextTest.trim() ? <strong>{item.nextTest}</strong> : <strong className="not-added">Not added yet</strong>}
      </div>

      {item.tags.length > 0 && (
        <div className="tag-row">
          {item.tags.map((tag) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="drawer-sources">
        <span className="detail-label">SOURCES</span>
        {item.sources.length === 0 ? (
          <p className="not-added">Not added yet</p>
        ) : (
          item.sources.map((source) => (
            <div key={source.id} className="source-line">
              {source.url.trim() ? (
                <a href={source.url} target="_blank" rel="noreferrer">
                  <SourceBadge type={source.type} />
                  <span className="source-label">{source.label.trim() || source.url}</span>
                  <b>↗</b>
                </a>
              ) : (
                <span className="source-plain">
                  <SourceBadge type={source.type} />
                  <span className="source-label">{source.label.trim() || "Untitled source"}</span>
                </span>
              )}
              {(source.note.trim() || source.confidence) && (
                <span className="source-meta">
                  {source.confidence ? `${source.confidence} confidence` : "Not rated yet"}
                  {source.note.trim() ? ` · ${source.note.trim()}` : ""}
                </span>
              )}
            </div>
          ))
        )}
      </div>

      <div className="drawer-actions">
        <button className="primary" onClick={onEdit}>
          Edit opportunity
        </button>
        <button className="secondary" onClick={onClose}>
          Back to board
        </button>
      </div>
    </>
  );
}

function EditForm({ item, isNew, onCancel, onSave }: { item: Opportunity; isNew: boolean; onCancel: () => void; onSave: (next: Opportunity) => void }) {
  const [form, setForm] = useState<Opportunity>(item);
  const [tagsText, setTagsText] = useState(item.tags.join(", "));

  const set = <K extends keyof Opportunity,>(key: K, value: Opportunity[K]) => setForm((current) => ({ ...current, [key]: value }));

  const setSource = (id: string, patch: Partial<Source>) =>
    setForm((current) => ({ ...current, sources: current.sources.map((source) => (source.id === id ? { ...source, ...patch } : source)) }));

  const addSource = () =>
    setForm((current) => ({
      ...current,
      sources: [...current.sources, { id: `${current.id}-s${current.sources.length + 1}-${Math.random().toString(36).slice(2, 6)}`, type: "Other", label: "", url: "", note: "" }]
    }));

  const removeSource = (id: string) => setForm((current) => ({ ...current, sources: current.sources.filter((source) => source.id !== id) }));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    onSave({ ...form, tags: parseTags(tagsText), title: form.title.trim(), updatedAt: new Date().toISOString() });
  };

  return (
    <form className="edit-form" onSubmit={submit}>
      <div className="drawer-head">
        <span className="eyebrow">{isNew ? "NEW OPPORTUNITY" : `EDIT / ${item.id}`}</span>
        <button type="button" className="close" onClick={onCancel}>
          ×
        </button>
      </div>

      <h2>{isNew ? "Add opportunity" : "Edit opportunity"}</h2>
      <p className="form-hint">Empty fields are saved as empty and stay visible as “Not added yet”. Nothing is scored or generated.</p>

      <div className="form-grid">
        <label className="field span-2">
          <span>Title</span>
          <input value={form.title} onChange={(event) => set("title", event.target.value)} placeholder="Untitled opportunity" />
        </label>

        <label className="field">
          <span>Category</span>
          <input value={form.category} onChange={(event) => set("category", event.target.value)} placeholder="e.g. Vertical ops" />
        </label>

        <label className="field">
          <span>Status note</span>
          <input value={form.statusNote} onChange={(event) => set("statusNote", event.target.value)} placeholder="e.g. Needs a wedge" />
        </label>

        <label className="field">
          <span>Stage</span>
          <select value={form.stage} onChange={(event) => set("stage", event.target.value as Opportunity["stage"])}>
            {stages.map((stage) => (
              <option key={stage} value={stage}>
                {stage}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Evidence status</span>
          <select value={form.evidenceStatus} onChange={(event) => set("evidenceStatus", event.target.value as EvidenceStatus)}>
            {evidenceStatuses.map((status) => (
              <option key={status} value={status}>
                {status} — {evidenceStatusCopy[status].conclusion}
              </option>
            ))}
          </select>
        </label>

        <label className="field span-2">
          <span>Thesis</span>
          <textarea rows={3} value={form.thesis} onChange={(event) => set("thesis", event.target.value)} placeholder="One sentence: what is it and who pays?" />
        </label>

        <label className="field span-2">
          <span>What we know</span>
          <textarea rows={3} value={form.evidenceSummary} onChange={(event) => set("evidenceSummary", event.target.value)} placeholder="Observed evidence, not enthusiasm" />
        </label>

        <label className="field span-2">
          <span>What we don&apos;t know yet</span>
          <textarea rows={3} value={form.unknowns} onChange={(event) => set("unknowns", event.target.value)} placeholder="Unknown, not yet checked" />
        </label>

        <label className="field">
          <span>Build estimate</span>
          <input value={form.buildEstimate} onChange={(event) => set("buildEstimate", event.target.value)} placeholder="€10–20k" />
        </label>

        <label className="field">
          <span>Pricing hypothesis</span>
          <input value={form.pricingHypothesis} onChange={(event) => set("pricingHypothesis", event.target.value)} placeholder="€500–2k / mo" />
        </label>

        <label className="field span-2">
          <span>Kill reason</span>
          <textarea rows={3} value={form.killReason} onChange={(event) => set("killReason", event.target.value)} placeholder="Strongest reason not to build this today" />
        </label>

        <label className="field span-2">
          <span>Next test</span>
          <textarea rows={2} value={form.nextTest} onChange={(event) => set("nextTest", event.target.value)} placeholder="Cheapest test, and what result would change our mind" />
        </label>

        <label className="field span-2">
          <span>Tags</span>
          <input value={tagsText} onChange={(event) => setTagsText(event.target.value)} placeholder="comma, separated" />
        </label>
      </div>

      <div className="source-editor">
        <div className="source-editor-head">
          <span className="detail-label">SOURCES</span>
          <span className="source-count">{form.sources.length === 0 ? "Not added yet" : `${form.sources.length} linked`}</span>
        </div>
        {form.sources.map((source, index) => (
          <div key={source.id} className="source-row">
            <div className="source-row-top">
              <select aria-label={`Source ${index + 1} type`} value={source.type} onChange={(event) => setSource(source.id, { type: event.target.value as Source["type"] })}>
                {sourceTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <select
                aria-label={`Source ${index + 1} confidence`}
                value={source.confidence ?? ""}
                onChange={(event) => setSource(source.id, { confidence: (event.target.value || undefined) as Confidence | undefined })}
              >
                <option value="">Not rated yet</option>
                {confidences.map((confidence) => (
                  <option key={confidence} value={confidence}>
                    {confidence}
                  </option>
                ))}
              </select>
              <button type="button" className="icon-remove" aria-label={`Remove source ${index + 1}`} onClick={() => removeSource(source.id)}>
                ✕
              </button>
            </div>
            <input
              aria-label={`Source ${index + 1} label`}
              value={source.label}
              onChange={(event) => setSource(source.id, { label: event.target.value })}
              placeholder="Label"
            />
            <input
              aria-label={`Source ${index + 1} url`}
              value={source.url}
              onChange={(event) => setSource(source.id, { url: event.target.value })}
              placeholder="https://"
            />
            <input
              aria-label={`Source ${index + 1} note`}
              value={source.note}
              onChange={(event) => setSource(source.id, { note: event.target.value })}
              placeholder="Note (optional)"
            />
          </div>
        ))}
        <button type="button" className="add-source" onClick={addSource}>
          ＋ Add source
        </button>
      </div>

      <div className="drawer-actions sticky">
        <button type="submit" className="primary">
          {isNew ? "Create opportunity" : "Save changes"}
        </button>
        <button type="button" className="secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
