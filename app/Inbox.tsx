"use client";

// oppie.lab — the triage inbox.
//
// The engine collects. It does not conclude. Everything on this screen is read from the database
// and stays raw until a person does something with it: keep a source or throw it away, accept a
// proposal with a reason and the sources that support it, or reject it with a reason.

import Link from "next/link";
import { useMemo, useState } from "react";
import type { DiscoverySource } from "../lib/discovery";
import { acceptanceBody, answersPaidToday, acceptanceDraftError, inboxCounts, proposalCardView, rejectionDraftError, type DiscoveryInboxData, type ProposalCardView } from "../lib/discoveryInbox";

type ProblemOption = { id: string; title: string };

const NOT_ADDED = "Not added yet";

async function postJson(url: string, body: unknown): Promise<{ ok: boolean; payload: Record<string, unknown> }> {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  return { ok: response.ok, payload };
}

export default function Inbox({ initial, initialError, problems }: { initial: DiscoveryInboxData | null; initialError: string | null; problems: ProblemOption[] }) {
  const [data, setData] = useState<DiscoveryInboxData | null>(initial);
  const [loadError, setLoadError] = useState(initialError ?? "");
  const [notice, setNotice] = useState("");

  /** Re-read after every decision, so the screen shows what the database holds. */
  const reload = async () => {
    const response = await fetch("/api/inbox", { cache: "no-store" });
    const payload = await response.json().catch(() => ({})) as Partial<DiscoveryInboxData> & { error?: string };
    if (!response.ok) { setLoadError(payload.error || "Could not read the inbox"); return; }
    setLoadError("");
    setData({ sources: payload.sources ?? [], proposals: payload.proposals ?? [], citedSources: payload.citedSources ?? [], decided: payload.decided ?? [] });
  };

  const triage = async (source: DiscoverySource, next: "attached" | "discarded") => {
    const { ok, payload } = await postJson(`/api/discovery-sources/${encodeURIComponent(source.id)}/triage`, { triage: next });
    setNotice(ok ? `${next === "attached" ? "Kept" : "Discarded"}: ${source.title || source.url}` : String(payload.error ?? "Could not triage the source"));
    await reload();
  };

  const counts = useMemo(() => data ? inboxCounts(data) : null, [data]);
  const cards = useMemo(() => data ? data.proposals.map((proposal) => proposalCardView(proposal, data.citedSources)) : [], [data]);

  return (
    <main className="wrap inbox-page">
      <header className="page-head inbox-head">
        <div className="eyebrow">Research queue · human review</div>
        <h1>What did the engine find?</h1>
        <p>
          Raw sources wait here until you decide what they mean. Keep useful ones, discard what does
          not help, and accept a proposal only when its reason and sources are clear.
        </p>
      </header>

      {loadError && <div className="empty inbox-error" role="alert">The inbox could not be read: {loadError}. Nothing is shown in its place.</div>}

      {counts && (
        <div className="summary inbox-summary">
          <div className="summary-item"><b>{counts.untriaged}</b><span>sources to judge</span></div>
          <div className="summary-item"><b>{counts.waiting}</b><span>proposals waiting</span></div>
          <div className="summary-item"><b>{counts.accepted}</b><span>recently accepted</span></div>
          <div className="summary-item"><b>{counts.rejected}</b><span>recently rejected</span></div>
        </div>
      )}

      <div className="toolbar inbox-toolbar">
        <button className="btn btn-sm" onClick={reload}>Reload from database</button>
        <span className="toolbar-note inbox-toolbar-note" role="status">{notice}</span>
      </div>

      {data && (
        <section className="inbox-queue" aria-labelledby="source-queue-title">
          <div className="inbox-section-head">
            <div>
              <span className="inbox-section-label">01 · raw material</span>
              <h2 id="source-queue-title">Sources waiting for a decision</h2>
              <p>Read the passage first. Kept sources can be cited when you accept a proposal; they count toward nothing until then.</p>
            </div>
            <span className="inbox-section-count">{data.sources.length} to review</span>
          </div>
          <div className="stack inbox-source-stack">
            {data.sources.map((source) => <SourceCard key={source.id} source={source} onKeep={() => triage(source, "attached")} onDiscard={() => triage(source, "discarded")} />)}
            {data.sources.length === 0 && <div className="empty">Nothing left to judge. Capture sources from a run on <Link href="/discover">Discover</Link>.</div>}
          </div>
        </section>
      )}

      {data && (
        <section className="inbox-proposals" aria-labelledby="proposal-queue-title">
          <div className="inbox-section-head">
            <div>
              <span className="inbox-section-label">02 · suggestions</span>
              <h2 id="proposal-queue-title">Proposals waiting for a decision</h2>
              <p>These are proposals, not facts. Accepting one writes your reason and the sources you chose into a Problem. Readiness answers stay blank.</p>
            </div>
            <span className="inbox-section-count">{cards.length} waiting</span>
          </div>
          <div className="stack inbox-proposal-stack">
            {cards.map((card) => <ProposalCard key={card.proposal.id} card={card} problems={problems} onDecided={async (message) => { setNotice(message); await reload(); }} />)}
            {cards.length === 0 && <div className="empty">No proposal is waiting. Build one from a run on <Link href="/discover">Discover</Link>.</div>}
          </div>
        </section>
      )}

      {data && data.decided.length > 0 && (
        <section className="inbox-decided" aria-labelledby="decided-title">
          <div className="inbox-section-head compact">
            <div>
              <span className="inbox-section-label">03 · history</span>
              <h2 id="decided-title">Recently decided</h2>
            </div>
            <span className="inbox-section-count">{data.decided.length} decisions</span>
          </div>
          <div className="list">
            {data.decided.map((proposal) => (
              <div className="row" key={proposal.id} style={{ gridTemplateColumns: "1fr 120px 130px" }}>
                <div>
                  <p className="row-title">{proposal.title}</p>
                  <div className="row-meta">{proposal.decisionReason || NOT_ADDED}</div>
                </div>
                <div><span className={`chip ${proposal.status === "accepted" ? "chip-ok" : "chip-plain"}`}>{proposal.status}</span></div>
                <div>{proposal.problemId ? <Link className="link-button" href={`/problems/${proposal.problemId}`}>open {proposal.problemId.slice(0, 12)}</Link> : <span className="row-meta">no Problem</span>}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="footer">
        <span>
          The engine may collect and may suggest. It may not conclude. Drawing a conclusion
          automatically is forbidden by <span className="mono">AGENTS.md</span> §6.
        </span>
      </div>
    </main>
  );
}

function SourceCard({ source, onKeep, onDiscard }: { source: DiscoverySource; onKeep: () => void; onDiscard: () => void }) {
  const [busy, setBusy] = useState(false);
  const act = async (fn: () => void | Promise<void>) => { setBusy(true); try { await fn(); } finally { setBusy(false); } };
  return (
    <article className="inbox-source-card">
      <div className="inbox-source-topline">
        <div className="chip-row">
          <span className="chip chip-plain">{source.signalType}</span>
          <span className="chip chip-plain">{source.sourceType}</span>
          <span className="chip chip-plain">link {source.linkStatus}</span>
        </div>
        <span className="inbox-source-origin">found by · {source.foundFor || NOT_ADDED}</span>
      </div>
      <div className="inbox-source-body">
        <div>
          <h3>{source.title || NOT_ADDED}</h3>
          <p className="quote">{source.excerpt}</p>
          <a href={source.url} target="_blank" rel="noreferrer" className="inbox-source-url">{source.url.replace(/^https?:\/\//, "").slice(0, 88)} ↗</a>
        </div>
        <div className="inbox-source-intent">
          <span>Publisher</span>
          <strong>{source.publisher || NOT_ADDED}</strong>
          <small>{source.citation || "No citation stored."}</small>
        </div>
      </div>
      <div className="inbox-source-actions">
        <div className="inbox-action-buttons">
          <button className="btn btn-primary btn-sm inbox-attach-button" disabled={busy} onClick={() => act(onKeep)}>Keep source</button>
          <button className="btn btn-sm" disabled={busy} onClick={() => act(onDiscard)}>Discard</button>
        </div>
      </div>
    </article>
  );
}

function ProposalCard({ card, problems, onDecided }: { card: ProposalCardView; problems: ProblemOption[]; onDecided: (message: string) => Promise<void> }) {
  const { proposal } = card;
  // Nothing is pre-selected: choosing the supporting sources is part of the decision.
  const [selected, setSelected] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [target, setTarget] = useState("new");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const toggle = (id: string) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  const accept = async () => {
    const draft = { reason, sourceIds: selected, target };
    const invalid = acceptanceDraftError(draft, card);
    if (invalid) return setError(invalid);
    setBusy(true);
    const { ok, payload } = await postJson(`/api/discovery-proposals/${encodeURIComponent(proposal.id)}/accept`, acceptanceBody(draft));
    setBusy(false);
    if (!ok) return setError(String(payload.error ?? "Could not accept the proposal"));
    await onDecided(payload.warning ? String(payload.warning) : `Accepted into Problem ${String(payload.problemId)}.`);
  };
  const reject = async () => {
    const invalid = rejectionDraftError(reason);
    if (invalid) return setError(invalid);
    setBusy(true);
    const { ok, payload } = await postJson(`/api/discovery-proposals/${encodeURIComponent(proposal.id)}/reject`, { reason });
    setBusy(false);
    if (!ok) return setError(String(payload.error ?? "Could not reject the proposal"));
    await onDecided(`Rejected: ${proposal.title}`);
  };

  return (
    <article className="inbox-proposal-card" aria-label={proposal.title}>
      <div className="inbox-proposal-topline">
        <div className="chip-row">
          <span className="chip chip-warn">waiting</span>
          <span className="chip chip-plain">{card.selectable.length} citable source{card.selectable.length === 1 ? "" : "s"}</span>
        </div>
        <span className="inbox-proposal-label">needs your reasoning</span>
      </div>
      <p className="inbox-proposal-problem">{proposal.title}</p>
      <p className="inbox-proposal-reason">{proposal.workflow || NOT_ADDED}</p>
      <dl className="inbox-proposal-fields">
        <dt>Does the work</dt><dd>{proposal.actor || NOT_ADDED}</dd>
        <dt>Pays</dt><dd>{proposal.payer || NOT_ADDED}</dd>
        <dt>Workaround today</dt><dd>{proposal.workaround || NOT_ADDED}</dd>
        <dt>Already sold by</dt><dd>{proposal.businessPattern?.replace(/^Already sold by: /, "") || NOT_ADDED}</dd>
      </dl>
      <div className="inbox-proposal-unknowns">
        <span className="inbox-section-label">Still unknown</span>
        {proposal.unknowns.length ? <ul>{proposal.unknowns.map((item) => <li key={item}>{item}</li>)}</ul> : <p>{NOT_ADDED}</p>}
      </div>

      <fieldset className="inbox-proposal-sources">
        <legend>Sources that support accepting it</legend>
        {card.selectable.map((source) => (
          <label key={source.id}>
            <input type="checkbox" checked={selected.includes(source.id)} onChange={() => toggle(source.id)} />
            <span><strong>{source.title || source.url}</strong> · {source.signalType} · <em>“{source.excerpt}”</em>{answersPaidToday(source) && <span className="paid-warning"> · Accepting this can answer “Paid today” with yes, citing this {source.sourceType === "job" ? "job post" : "price"}.</span>}</span>
          </label>
        ))}
        {card.selectable.length === 0 && <p>No citable source. This proposal cannot be accepted.</p>}
        {card.discarded.length > 0 && <p>{card.discarded.length} cited source{card.discarded.length === 1 ? " was" : "s were"} discarded and cannot be cited.</p>}
        {card.missingIds.length > 0 && <p className="inbox-error-text">Cited but missing: {card.missingIds.join(", ")}</p>}
      </fieldset>

      <label className="inbox-proposal-reason-field">Your reason (required to accept or reject)
        <textarea className="input" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="What in the selected sources justifies this decision, and what is still unknown?" />
      </label>
      <label className="inbox-proposal-target">Accept into
        <select className="input" value={target} onChange={(event) => setTarget(event.target.value)} aria-label="Accept into">
          <option value="new">A new Problem</option>
          {problems.map((problem) => <option key={problem.id} value={problem.id}>{problem.id} — {(problem.title || "untitled").slice(0, 48)}</option>)}
        </select>
      </label>

      {error && <p className="inbox-error-text" role="alert">{error}</p>}
      <div className="inbox-proposal-actions">
        <button className="btn btn-primary btn-sm" disabled={busy || card.selectable.length === 0} onClick={accept}>Accept proposal <span>↗</span></button>
        <button className="btn btn-sm" disabled={busy} onClick={reject}>Reject</button>
        <span className="inbox-proposal-warning">Accepting writes the selected sources as evidence. It never fills a readiness answer.</span>
      </div>
    </article>
  );
}
