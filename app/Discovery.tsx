"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { DiscoveryRun, DiscoverySource } from "../lib/discovery";
import { plural, proposalStatusLabel, runView, type DiscoveryRunData } from "../lib/discoveryView";

type CollectSummary = { lane: "pain" | "business" | "money"; provider: string; query: string; found: number; saved: number; error?: string };
const LANE_LABEL: Record<CollectSummary["lane"], string> = { pain: "Pain", business: "Businesses", money: "Money" };
const PROVIDER_LABEL: Record<string, string> = { brave: "web search", hn: "Hacker News", remotive: "Remotive jobs" };

const NOT_ADDED = "Not added yet";

type Props = {
  initial: DiscoveryRunData | null;
  initialError: string | null;
  recentRuns: DiscoveryRun[];
  recentRunsError: string | null;
};

const shortId = (id: string) => id.replace(/^run-/, "").slice(0, 8);

function SourceLine({ source }: { source: DiscoverySource }) {
  return (
    <div className="company-row discovery-source-row">
      <div>
        <strong><a href={source.url} target="_blank" rel="noreferrer">{source.title || source.url}</a></strong>
        <span>“{source.excerpt}”</span>
      </div>
      <div className="company-price">
        <strong>{source.signalType}</strong>
        <span>{source.sourceType} · {source.linkStatus} · {source.triage}</span>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div className="company-row">
      <div><strong>{label}</strong></div>
      <div className="company-price"><span className={value ? "" : "not-added"}>{value || NOT_ADDED}</span></div>
    </div>
  );
}

export default function Discovery({ initial, initialError, recentRuns, recentRunsError }: Props) {
  const [prompt, setPrompt] = useState(initial?.run.direction ?? "Financial operations in European RIAs");
  const [data, setData] = useState<DiscoveryRunData | null>(initial);
  const [loadError, setLoadError] = useState(initialError ?? "");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [runState, setRunState] = useState<"idle" | "creating" | "collecting" | "splitting" | "proposing" | "error">("idle");
  const [collectSummary, setCollectSummary] = useState<CollectSummary[] | null>(null);
  const [runOutcome, setRunOutcome] = useState("");
  const [runError, setRunError] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceTitle, setSourceTitle] = useState("");
  const [sourceExcerpt, setSourceExcerpt] = useState("");
  const [sourceState, setSourceState] = useState("");
  const [redditQuery, setRedditQuery] = useState("reconciliation spreadsheets");
  const [proposalState, setProposalState] = useState("");

  const view = useMemo(() => data ? runView(data) : null, [data]);
  const runId = view?.run.id ?? null;
  const selected = view?.candidates.find((candidate) => candidate.proposal.id === selectedId) ?? view?.candidates[0] ?? null;

  /** Re-read the run from the database, so what is shown is what is stored. */
  const loadRun = async (id: string) => {
    const response = await fetch(`/api/discovery-runs/${encodeURIComponent(id)}`, { cache: "no-store" });
    const payload = await response.json() as DiscoveryRunData & { error?: string };
    if (!response.ok || !payload.run) {
      setLoadError(payload.error || "Could not read the discovery run");
      return;
    }
    setLoadError("");
    setData({ run: payload.run, sources: payload.sources ?? [], proposals: payload.proposals ?? [], companies: payload.companies ?? [] });
    window.history.replaceState(null, "", `/discover?run=${encodeURIComponent(id)}`);
  };

  const runDiscovery = async () => {
    setRunState("creating");
    setRunError("");
    try {
      const response = await fetch("/api/discovery-runs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ direction: prompt }) });
      const payload = await response.json() as { run?: { id: string }; error?: string };
      if (!response.ok || !payload.run) throw new Error(payload.error || "Could not create discovery run");
      setSelectedId(null);
      setSourceState("");
      setProposalState("");
      setCollectSummary(null);
      setRunOutcome("");
      const id = payload.run.id;
      await loadRun(id);
      // Collect real sources for the direction, then group them into a proposal for review.
      setRunState("collecting");
      const collected = await fetch(`/api/discovery-runs/${encodeURIComponent(id)}/collect`, { method: "POST" });
      const collectedPayload = await collected.json().catch(() => ({})) as { summary?: CollectSummary[]; error?: string };
      if (!collected.ok) {
        await loadRun(id);
        throw new Error(collectedPayload.error || "Could not collect sources");
      }
      setCollectSummary(collectedPayload.summary ?? []);
      if ((collectedPayload.summary ?? []).some((lane) => lane.saved > 0)) {
        // First choice: split into distinct pains, each with the businesses selling a fix.
        setRunState("splitting");
        const split = await fetch(`/api/discovery-runs/${encodeURIComponent(id)}/split`, { method: "POST" });
        const splitPayload = await split.json().catch(() => ({})) as { split?: { proposals: number; suggested: number; dropped: Record<string, number> }; error?: string };
        if (split.ok && splitPayload.split && splitPayload.split.proposals > 0) {
          const dropped = Object.values(splitPayload.split.dropped).reduce((a, b) => a + b, 0);
          setRunOutcome(`${plural(splitPayload.split.proposals, "distinct pain")} found${dropped ? ` · ${plural(dropped, "unsupported claim")} from the model dropped` : ""}. Waiting in Inbox.`);
        } else {
          // Fallback: one plain proposal over all sources, and say why the split did not happen.
          setRunState("proposing");
          const built = await fetch(`/api/discovery-runs/${encodeURIComponent(id)}/proposals`, { method: "POST" });
          const builtPayload = await built.json().catch(() => ({})) as { error?: string };
          const why = splitPayload.error || "the model found no pain it could support with quotes";
          setRunOutcome(built.ok ? `Pains could not be split (${why}). One combined proposal is waiting in Inbox instead.` : builtPayload.error || "Could not build proposal");
        }
      }
      await loadRun(id);
      setRunState("idle");
    } catch (error) {
      setRunState("error");
      setRunError(error instanceof Error ? error.message : "Could not create discovery run");
    }
  };
  const ingest = async (body: Record<string, string>) => {
    if (!runId) {
      setSourceState("Run discovery first so the source has a run to belong to.");
      return;
    }
    setSourceState("Saving source…");
    const response = await fetch(`/api/discovery-runs/${runId}/ingest`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const payload = await response.json() as { source?: { id: string }; sources?: { length: number }; error?: string };
    if (!response.ok) throw new Error(payload.error || "Could not save source");
    setSourceState(payload.source ? "Source saved to Inbox." : `${payload.sources?.length ?? 0} Reddit sources saved to Inbox.`);
    await loadRun(runId);
  };
  const captureManualSource = async () => {
    try {
      await ingest({ kind: "manual", url: sourceUrl, title: sourceTitle, excerpt: sourceExcerpt, foundFor: view?.run.direction ?? prompt });
      setSourceUrl(""); setSourceTitle(""); setSourceExcerpt("");
    } catch (error) { setSourceState(error instanceof Error ? error.message : "Could not save source"); if (runId) await loadRun(runId); }
  };
  const searchReddit = async () => {
    try { await ingest({ kind: "reddit", query: redditQuery }); }
    catch (error) { setSourceState(error instanceof Error ? error.message : "Could not search Reddit"); if (runId) await loadRun(runId); }
  };
  const generateProposal = async () => {
    if (!runId) return setProposalState("Run discovery first.");
    setProposalState("Building a review proposal…");
    try {
      const response = await fetch(`/api/discovery-runs/${runId}/proposals`, { method: "POST" });
      const payload = await response.json() as { proposals?: unknown[]; error?: string };
      if (!response.ok) throw new Error(payload.error || "Could not build proposal");
      setProposalState(`${payload.proposals?.length ?? 0} proposal${payload.proposals?.length === 1 ? "" : "s"} waiting in Inbox.`);
      await loadRun(runId);
    } catch (error) { setProposalState(error instanceof Error ? error.message : "Could not build proposal"); if (runId) await loadRun(runId); }
  };

  const accepted = view?.candidates.filter((candidate) => candidate.proposal.status === "accepted").length ?? 0;

  return (
    <main className="discover-page"><div className="discover-shell">
      <header className="discover-head"><div className="hero-copy"><div className="eyebrow hero-eyebrow"><span className="pulse-dot" /> oppie.lab / discovery</div><h1>Start with a direction.<br /><em>Find the work.</em></h1><p>Give us a market, a role, or a loose constraint. We look for painful workflows, existing spend, and businesses worth studying.</p></div><div className="research-note"><span className="note-mark">✦</span><div><strong>Research mode</strong><span>{view ? (accepted ? `${plural(accepted, "proposal")} accepted by a person` : "Nothing accepted yet") : "No run open"}</span></div></div></header>
      <section className="direction-card"><div className="direction-top"><span>What are you curious about?</span><span className="direction-hint">No problem statement needed</span></div><div className="prompt-field"><input className="direction-input" aria-label="Discovery direction" value={prompt} onChange={(event) => setPrompt(event.target.value)} /></div><div className="prompt-chips"><button className="suggestion" onClick={() => setPrompt("Boring B2B services in Portugal for solo founders")}>Boring B2B in Portugal</button><button className="suggestion" onClick={() => setPrompt("Compliance work that European SMEs still do in spreadsheets")}>Compliance + spreadsheets</button><button className="suggestion" onClick={() => setPrompt("Businesses to adapt for small financial firms")}>Small financial firms</button></div><div className="direction-bottom"><span>Market · geography · role · workflow · constraint</span><button className="run-button" onClick={runDiscovery} disabled={runState !== "idle" && runState !== "error"}>{runState === "creating" ? "Starting…" : runState === "collecting" ? "Collecting real sources…" : runState === "splitting" ? "Splitting into pains…" : runState === "proposing" ? "Building proposal…" : "Run discovery"} <span>↗</span></button></div>{view && <div className="run-feedback">Run {view.run.status} · {view.run.id}</div>}{runState === "error" && <div className="run-feedback run-feedback-error">{runError}</div>}{runOutcome && <p className="run-feedback" role="status">{runOutcome}</p>}{collectSummary && <ul className="collect-summary" aria-label="What was collected">{collectSummary.map((lane) => <li key={`${lane.lane}-${lane.provider}-${lane.query}`}><b>{LANE_LABEL[lane.lane]}</b><span>{PROVIDER_LABEL[lane.provider] ?? lane.provider}</span><span className="collect-query">{lane.query}</span>{lane.error ? <em className="run-feedback-error">failed: {lane.error}</em> : <em>{lane.saved} saved{lane.found > lane.saved ? ` · ${lane.found - lane.saved} already stored` : ""}</em>}</li>)}</ul>}</section>
      {runId && <section className="source-capture"><div><span className="section-overline">Add evidence to this run</span><h2>Capture a source</h2><p>Paste a public page when the engine cannot collect it directly. The excerpt is required so the link never becomes an unsupported claim.</p></div><div className="source-capture-grid"><label>URL<input value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://…" /></label><label>Title<input value={sourceTitle} onChange={(event) => setSourceTitle(event.target.value)} placeholder="What this page is" /></label><label className="source-capture-wide">Quoted excerpt<textarea value={sourceExcerpt} onChange={(event) => setSourceExcerpt(event.target.value)} placeholder="Paste the relevant passage or figure" /></label><button className="action-primary" onClick={captureManualSource}>Save source <span>↗</span></button></div><div className="source-capture-reddit"><label>Reddit search<input value={redditQuery} onChange={(event) => setRedditQuery(event.target.value)} /></label><button className="action-secondary" onClick={searchReddit}>Search Reddit</button></div>{sourceState && <p className="run-feedback">{sourceState}</p>}<button className="action-secondary proposal-build-button" onClick={generateProposal}>Build review proposal <span>↗</span></button>{proposalState && <p className="run-feedback">{proposalState}</p>}</section>}

      {loadError && <p className="run-feedback run-feedback-error" role="alert">Could not read the run: {loadError}</p>}

      {!view && <section className="results-intro discovery-empty"><div><span className="section-overline">Discovery runs</span><h2>No run open.</h2><p>Start one above, or reopen a recent run. Results appear here only after sources are stored and a proposal is built from them.</p>
        {recentRunsError ? <p className="run-feedback run-feedback-error">Recent runs could not be read: {recentRunsError}</p>
          : recentRuns.length === 0 ? <p className="not-added">No runs stored yet.</p>
          : <ul className="discovery-run-list">{recentRuns.map((run) => <li key={run.id}><a href={`/discover?run=${encodeURIComponent(run.id)}`}>{run.direction}</a><span>{run.status} · {run.createdAt.slice(0, 10)}</span></li>)}</ul>}
      </div></section>}

      {view && <>
        <div className="results-intro"><div><span className="section-overline">Discovery run / {shortId(view.run.id)}</span><h2>{view.candidates.length ? "Here’s what this run collected." : "No proposals yet."}</h2><p>From “{view.run.direction}”. {plural(view.counts.sources, "source")} stored ({view.counts.untriaged} untriaged, {view.counts.attached} attached, {view.counts.discarded} discarded). Geography: {view.run.geography || NOT_ADDED}.</p></div><div className="result-count"><b>{view.counts.proposals}</b><span>{view.counts.proposals === 1 ? "proposal" : "proposals"} · {view.counts.waiting} waiting</span></div></div>

        {view.run.status === "failed" && <p className="run-feedback run-feedback-error run-failed" role="alert">This run failed{view.run.error ? `: ${view.run.error}` : "."} Its proposals cannot be accepted until a retried step succeeds. What was stored before the failure is shown below.</p>}

        {view.candidates.length === 0 && <p className="rail-note-text">{view.counts.sources === 0 ? "Capture a source above, then build a review proposal. Nothing is proposed from an empty run." : "Sources are stored. Build a review proposal to group them for review."}</p>}

        {selected && <div className="discover-layout"><section className="candidate-rail" aria-label="Candidate problems">{view.candidates.map((candidate, index) => <button key={candidate.proposal.id} className={`candidate-card ${selected.proposal.id === candidate.proposal.id ? "selected" : ""}`} onClick={() => setSelectedId(candidate.proposal.id)}><div className="candidate-top"><span className="candidate-number">{String(index + 1).padStart(2, "0")}</span><span className="candidate-kind">{candidate.proposal.status}</span><span className="source-pill">{plural(candidate.sources.length, "source")}</span></div><h3>{candidate.proposal.title}</h3><p>{candidate.proposal.workflow || NOT_ADDED}</p><div className="candidate-footer"><span>For {candidate.proposal.payer || "payer not added yet"}</span><span>{plural(candidate.companies.length, "linked company", "linked companies")}</span><span className="open-arrow">↗</span></div></button>)}<div className="rail-note"><span className="rail-note-mark">i</span><p>These are proposals, not conclusions. Accept one in Inbox, with a reason, only when you are ready to carry its sources into validation.</p></div></section>
          <article className="candidate-detail"><div className="detail-kicker"><span className="proposal-label">PROPOSED PROBLEM</span><span className="detail-status">{plural(selected.sources.length, "linked source")} · {proposalStatusLabel(selected.proposal)}</span></div><h2>{selected.proposal.title}</h2><p className={`detail-lede ${selected.proposal.workflow ? "" : "not-added"}`}>{selected.proposal.workflow || NOT_ADDED}</p>
            <div className="proof-grid signal-grid"><div className="proof-heading"><span>What the sources show</span><small>Counted by signal type, never summed into a score</small></div>{selected.signalGroups.map((group) => <div className="proof-card" key={group.label}><span className="proof-label">{group.label}</span><h3>{group.sources.length ? plural(group.sources.length, "source") : NOT_ADDED}</h3><p>{group.sources[0] ? `“${group.sources[0].excerpt}”` : `No ${group.signals.join(" or ")} source is linked.`}</p><small>{group.sources[0] ? <a href={group.sources[0].url} target="_blank" rel="noreferrer">{group.sources[0].publisher || group.sources[0].sourceType} ↗</a> : group.signals.join(" · ")}</small></div>)}</div>
            <section className="detail-section"><div className="section-heading"><div><span className="section-label">Who</span><h3>The people around the work</h3></div><span className="section-aside">As stored on the proposal</span></div><Field label="Does the work" value={selected.proposal.actor} /><Field label="Pays" value={selected.proposal.payer} /><Field label="Workaround today" value={selected.proposal.workaround} /></section>
            <section className="detail-section business-path"><div><span className="section-label">Possible path</span><h3 className={selected.proposal.businessPattern ? "" : "not-added"}>{selected.proposal.businessPattern || NOT_ADDED}</h3><p>A hypothesis to investigate, not a forecast.</p></div><span className="path-arrow">→</span></section>
            <section className="detail-section"><div className="section-heading"><div><span className="section-label">Market comparison</span><h3>Who is already here?</h3></div><span className="section-aside">Prices kept verbatim, never totalled</span></div>{selected.companies.length === 0 && selected.missingCompanyIds.length === 0 && <p className="not-added">No existing company record is linked.</p>}{selected.companies.map((company) => <div className="company-row" key={company.id}><div><strong><Link href={`/companies/${company.id}`}>{company.name}</Link></strong><span>{company.role || NOT_ADDED}</span></div><div className="company-price"><strong className={company.amount ? "" : "not-added"}>{company.amount || NOT_ADDED}</strong><span>{company.location || NOT_ADDED}</span></div></div>)}{selected.missingCompanyIds.length > 0 && <p className="run-feedback run-feedback-error">Linked but unreadable: {selected.missingCompanyIds.join(", ")}</p>}</section>
            <section className="detail-section"><div className="section-heading"><div><span className="section-label">Evidence</span><h3>Linked sources</h3></div><span className="section-aside">Quoted as captured</span></div>{selected.sources.length === 0 && <p className="not-added">No readable source is linked.</p>}{selected.sources.map((source) => <SourceLine key={source.id} source={source} />)}{selected.discardedSourceIds.length > 0 && <p className="run-feedback">{plural(selected.discardedSourceIds.length, "cited source")} discarded since this proposal was built, and not shown.</p>}{selected.missingSourceIds.length > 0 && <p className="run-feedback run-feedback-error">Cited but missing: {selected.missingSourceIds.join(", ")}</p>}</section>
            <section className="detail-section unknown-section"><span className="section-label">Open questions</span><h3>Still unknown</h3>{selected.proposal.unknowns.length ? <ul>{selected.proposal.unknowns.map((unknown) => <li key={unknown}>{unknown}</li>)}</ul> : <p className="not-added">{NOT_ADDED}</p>}</section>
            <section className="detail-section unknown-section"><span className="section-label">Kill reasons</span><h3>Why this could die</h3>{selected.proposal.killReasons.length ? <ul>{selected.proposal.killReasons.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="not-added">{NOT_ADDED}</p>}</section>
            {selected.proposal.decisionReason && <section className="detail-section"><span className="section-label">Decision</span><h3>{proposalStatusLabel(selected.proposal)}</h3><p>{selected.proposal.decisionReason}</p></section>}
            <div className="mock-actions"><Link className="action-primary" href="/inbox">Review in Inbox <span>↗</span></Link><button className="action-secondary" onClick={() => runId && loadRun(runId)}>Reload from database</button></div>
          </article></div>}
      </>}
    </div></main>
  );
}
