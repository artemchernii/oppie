"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { rateProblem } from "../lib/problemActions";
import { analyse, RATING_MAX, RATING_MIN, RUBRIC_VERSION, requiresReason, type Analysis, type Citation, type Dimension, type Part } from "../lib/analysis";
import {
  actions,
  confidences,
  evidenceTypes,
  seedCompanies,
  signalDefs,
  verdictCopy,
  verdicts,
  gates,
  gateCopy,
  type Action,
  type Company,
  type Confidence,
  type Evidence,
  type Gate,
  type Problem,
  type ProblemRating,
  type Score,
  type Verdict
} from "../lib/problems";
import { useProblems } from "../lib/problemStore";
import { pendingFor } from "../lib/research";
import { useResearch } from "../lib/researchStore";
import { evidenceOrigins, problemTrail, type AcceptedDecision } from "../lib/problemTrail";
import { ConfidenceChip, GateChip, LinkChip, ReadinessPanel, VerdictChip, isBacklog } from "./ui";

const companyById = (id: string) => seedCompanies.find((company) => company.id === id);

export default function ProblemDetail({ id, initial, readError, initialRatings, ratingsError, trail: decisions = [], trailError = null }: { id: string; initial: Problem[]; readError: string | null; initialRatings: ProblemRating[]; ratingsError: string | null; trail?: AcceptedDecision[]; trailError?: string | null }) {
  const { problems, saveError, updateProblem } = useProblems(initial);
  const { proposals, acceptProposal, decideProposal } = useResearch();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Problem | null>(null);
  const [rating, setRating] = useState("");
  const [reason, setReason] = useState("");
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [ratingSaved, setRatingSaved] = useState<ProblemRating | null>(null);

  const suggestions = useMemo(() => pendingFor(proposals, id), [proposals, id]);

  const problem = useMemo(() => problems.find((item) => item.id === id) ?? null, [problems, id]);
  const analysis = useMemo(() => (problem ? analyse(problem) : null), [problem]);
  const trail = useMemo(() => problemTrail(problem?.evidence ?? [], decisions), [problem, decisions]);
  const origins = useMemo(() => evidenceOrigins(trail), [trail]);
  const storedRating = useMemo(
    () => ratingSaved ?? initialRatings.filter((item) => item.problemId === id && item.rubricVersion === RUBRIC_VERSION).at(-1) ?? null,
    [id, initialRatings, ratingSaved]
  );

  const submitRating = async () => {
    if (!analysis || analysis.score === null) return;
    const numericRating = Number(rating);
    if (!Number.isInteger(numericRating) || numericRating < RATING_MIN || numericRating > RATING_MAX) {
      setRatingError(`Choose a whole number from ${RATING_MIN} to ${RATING_MAX}.`);
      return;
    }
    if (requiresReason(numericRating, analysis.score) && !reason.trim()) {
      setRatingError("This rating is more than 3 points from the system's judgement, so add the reason.");
      return;
    }
    setRatingError(null);
    const result = await rateProblem({ problemId: id, rating: numericRating, reason });
    if (!result.ok) {
      setRatingError(result.error);
      return;
    }
    setRatingSaved({
      id: `pending-${id}`,
      problemId: id,
      rubricVersion: analysis.rubricVersion,
      scoreAtRating: analysis.score,
      answeredAtRating: analysis.answered,
      rating: numericRating,
      reason: reason.trim(),
      createdAt: new Date().toISOString()
    });
  };

  useEffect(() => {
    if (editing) setForm(problem ? (JSON.parse(JSON.stringify(problem)) as Problem) : null);
  }, [editing, problem]);

  if (!problem) {
    return (
      <main className="wrap wrap-narrow">
        <div className="breadcrumb">
          <Link href="/">Problems</Link>
          <span className="crumb-sep">/</span>
          <span>{id}</span>
        </div>
        <h1 className="page-head-title" style={{ fontSize: 26, letterSpacing: "-.03em", margin: "0 0 10px" }}>
          No problem with that id
        </h1>
        <p className="muted">
          {readError ? `The records could not be read: ${readError}` : <>{id} is not in the records. <Link href="/">Back to the list</Link>.</>}
        </p>
      </main>
    );
  }

  if (editing && form) {
    return <ProblemEditor form={form} onChange={setForm} onCancel={() => setEditing(false)} onSave={() => { updateProblem(form.id, form); setEditing(false); }} />;
  }

  const companies = problem.companyIds.map(companyById).filter((company): company is Company => Boolean(company));
  const backlog = isBacklog(problem);

  return (
    <main className="wrap problem-detail-page">
      <div className="breadcrumb">
        <Link href="/">Problems</Link>
        <span className="crumb-sep">/</span>
        <span className="mono">{problem.id}</span>
      </div>

      {saveError && (
        <p className="storage-warn" role="alert" style={{ marginBottom: 12 }}>
          Not saved: {saveError}
        </p>
      )}

      <header className="page-head">
        <div className="page-head-row">
          <div>
            <h1>{problem.title || "Untitled problem"}</h1>
            <div className="chip-row" style={{ marginTop: 4 }}>
              <GateChip gate={problem.gate} />
              <VerdictChip verdict={problem.verdict} />
              <span className="chip chip-plain">{problem.action}</span>
              {problem.market.trim() && <span className="chip chip-plain">{problem.market}</span>}
              {backlog && <span className="chip chip-warn">NO EVIDENCE YET</span>}
            </div>
          </div>
          <button className="btn" onClick={() => setEditing(true)}>
            Edit
          </button>
        </div>
      </header>

      <div className="detail-grid">
        <div>
          <section className="section">
            <h2 className="section-label">What the work looks like</h2>
            <p style={{ fontSize: 15 }}>
              {problem.what.trim() ? problem.what : <span className="not-added">Not written yet.</span>}
            </p>
          </section>

          {analysis && <AnalysisPanel analysis={analysis} revealed={Boolean(storedRating)} />}

          <section className="section">
            <h2 className="section-label">Who pays today</h2>
            <p style={{ fontSize: 15 }}>
              {problem.paidToday.trim() ? problem.paidToday : <span className="not-added">Not checked. This is gate G2 — nothing below it matters until it is answered.</span>}
            </p>
            {problem.whyTheyPay.trim() && <p className="faint">{problem.whyTheyPay}</p>}
          </section>

          <section className="section">
            <h2 className="section-label">How people do it now</h2>
            <p>{problem.workaround.trim() ? problem.workaround : <span className="not-added">Not added yet.</span>}</p>
            {problem.frequency.trim() && <p className="faint">Runs {problem.frequency}.</p>}
            {problem.consequence.trim() && (
              <p>
                <strong style={{ fontWeight: 500 }}>What it costs them:</strong> {problem.consequence}
              </p>
            )}
          </section>

          <section className="section">
            <h2 className="section-label">Who already sells it</h2>
            <p>{problem.competition.trim() ? problem.competition : <span className="not-added">Not checked.</span>}</p>
          </section>

          <section className="section">
            <h2 className="section-label">Next question</h2>
            <div className="callout">
              <p>{problem.nextQuestion.trim() ? problem.nextQuestion : <span className="not-added">Not decided yet.</span>}</p>
            </div>
          </section>

          {problem.unknowns.trim() && (
            <section className="section">
              <h2 className="section-label">Still unknown</h2>
              <div className="callout warn">
                <p>{problem.unknowns}</p>
              </div>
            </section>
          )}

          {problem.killReason.trim() && (
            <section className="section">
              <h2 className="section-label">Why this may not work</h2>
              <div className="callout danger">
                <p>{problem.killReason}</p>
              </div>
            </section>
          )}

          {suggestions.length > 0 && (
            <section className="section">
              <h2 className="section-label">Suggested answers, waiting on you</h2>
              {suggestions.map((proposal) => (
                <div className="aside-card" key={proposal.id} style={{ marginBottom: 12 }}>
                  <div className="chip-row" style={{ marginBottom: 8 }}>
                    <span className="chip chip-warn">suggested</span>
                    <span className="chip chip-plain">{proposal.signalKey}</span>
                    <span className="chip">{proposal.value}/3</span>
                  </div>
                  <p style={{ margin: "0 0 10px", color: "var(--text-muted)" }}>{proposal.reason}</p>
                  <a href={proposal.sourceUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
                    {proposal.sourceUrl.replace(/^https?:\/\//, "").slice(0, 70)} ↗
                  </a>
                  <div className="chip-row" style={{ marginTop: 12 }}>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => acceptProposal(proposal.id, problem, (next) => updateProblem(next.id, next))}
                    >
                      Accept
                    </button>
                    <button className="btn btn-sm" onClick={() => decideProposal(proposal.id, "rejected")}>
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </section>
          )}

          {(trail.length > 0 || trailError) && (
            <section className="section discovery-trail" aria-labelledby="trail-title">
              <h2 className="section-label" id="trail-title">How this was accepted · {trail.length}</h2>
              {trailError && <p className="storage-warn" role="alert">The discovery trail could not be read: {trailError}</p>}
              {trail.map((entry) => (
                <div className="trail-entry" key={entry.proposalId}>
                  <div className="chip-row">
                    <span className="chip chip-ok">accepted by a person</span>
                    <span className="faint mono" style={{ fontSize: 11 }}>{entry.decidedOn ?? "date not stored"}</span>
                  </div>
                  <p className="trail-title">{entry.title}</p>
                  <p className="trail-meta">From the direction “{entry.direction ?? "Not added yet"}”</p>
                  <p className="trail-reason"><span>Your reason</span>{entry.reason ?? "Not added yet"}</p>
                  <ul className="trail-sources">
                    {entry.sources.map((item) => (
                      <li key={item.source.id}>
                        <a href={item.source.url} target="_blank" rel="noreferrer">{item.source.title || item.source.url}</a>
                        <span className="chip chip-plain">{item.source.signalType}</span>
                        <span className={`chip ${item.inRecord ? "chip-plain" : "chip-warn"}`}>{item.inRecord ? "in evidence below" : "removed from the record since"}</span>
                      </li>
                    ))}
                  </ul>
                  {entry.missingSourceIds.length > 0 && <p className="storage-warn">Selected but no longer readable: {entry.missingSourceIds.join(", ")}</p>}
                </div>
              ))}
            </section>
          )}

          <section className="section">
            <h2 className="section-label">Evidence gathered · {problem.evidence.length}</h2>
            {problem.evidence.length === 0 && (
              <div className="empty-evidence">
                <strong>No evidence gathered yet.</strong>
                <p>Open the inbox, choose a source, and attach it here before trusting this problem.</p>
                <Link href="/inbox">Go to inbox ↗</Link>
              </div>
            )}
            {problem.evidence.map((item) => (
              <div className="evidence" key={item.id}>
                <div className="chip-row">
                  <span className="chip chip-plain">{item.type}</span>
                  <ConfidenceChip value={item.confidence} />
                  {item.linkStatus && <LinkChip status={item.linkStatus} />}
                  {item.date && <span className="faint mono" style={{ fontSize: 11 }}>{item.date}</span>}
                  {origins.has(item.id) && <span className="chip chip-plain">from discovery · accepted {origins.get(item.id)?.decidedOn ?? ""}</span>}
                </div>
                <p className="quote">{item.observation}</p>
                {item.url && (
                  <a href={item.url} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
                    {item.url.replace(/^https?:\/\//, "").slice(0, 72)} ↗
                  </a>
                )}
              </div>
            ))}
          </section>
        </div>

        <aside>
          <div className="aside-card">
            <h3>Research progress</h3>
            {backlog ? (
              <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                No research yet. This is not a score.
              </p>
            ) : (
              <ReadinessPanel problem={problem} />
            )}
          </div>

          <div className="aside-card">
            <h3>Your rating</h3>
            {ratingsError && <p className="storage-warn" role="alert">Ratings could not be read: {ratingsError}</p>}
            {storedRating ? (
              <div>
                <p className="rating-result"><strong>{storedRating.rating}/10</strong> <span>your judgement</span></p>
                <p className="faint" style={{ margin: "8px 0 0", fontSize: 12 }}>Recorded against rubric v{storedRating.rubricVersion}, score {storedRating.scoreAtRating}/10 computed over {storedRating.answeredAtRating} of 7.</p>
                <p className="faint" style={{ margin: "8px 0 0", fontSize: 12 }}>{storedRating.reason ? storedRating.reason : "No reason needed — your rating agreed with the system's judgement."}</p>
              </div>
            ) : analysis?.score === null ? (
              <p className="muted" style={{ margin: 0, fontSize: 12 }}>Nothing has been answered yet, so there is no system judgement to rate.</p>
            ) : (
              <div>
                <p className="muted" style={{ margin: "0 0 12px", fontSize: 12 }}>Rate the problem before seeing the system's judgement. The scale is 0–10.</p>
                <div className="rating-entry">
                  <label className="field">
                    <span>Your rating</span>
                    <input className="input" type="number" min={RATING_MIN} max={RATING_MAX} step="1" value={rating} onChange={(event) => { setRating(event.target.value); setRatingError(null); }} placeholder="0–10" />
                  </label>
                  {analysis && rating !== "" && requiresReason(Number(rating), analysis.score) && (
                    <label className="field">
                      <span>Why do you disagree?</span>
                      <textarea className="input" rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Name the reason, not just that more research is needed." />
                    </label>
                  )}
                  <button className="btn btn-primary" onClick={submitRating}>Save rating</button>
                </div>
                {ratingError && <p className="storage-warn" role="alert">{ratingError}</p>}
              </div>
            )}
          </div>

          <div className="aside-card">
            <h3>Known details</h3>
            <dl style={{ margin: 0 }}>
              <div className="kv important-kv">
                <dt>Buyer</dt>
                <dd>{problem.buyer.trim() ? problem.buyer : <span className="not-added">none named</span>}</dd>
              </div>
              <div className="kv important-kv">
                <dt>Affected role</dt>
                <dd>{problem.affectedRole.trim() ? problem.affectedRole : <span className="not-added">—</span>}</dd>
              </div>
              <div className="kv important-kv">
                <dt>Domain</dt>
                <dd>{problem.domain.trim() ? problem.domain : <span className="not-added">—</span>}</dd>
              </div>
              <div className="kv important-kv">
                <dt>Market</dt>
                <dd>{problem.market.trim() ? problem.market : <span className="not-added">—</span>}</dd>
              </div>
              <div className="kv">
                <dt>If no moat</dt>
                <dd>{problem.path}</dd>
              </div>
              <div className="kv">
                <dt>Verdict</dt>
                <dd>{verdictCopy[problem.verdict]}</dd>
              </div>
            </dl>
          </div>

          {companies.length > 0 && (
            <div className="aside-card">
              <h3>Companies & numbers</h3>
              <div className="co-list">
                {companies.map((company) => (
                  <div className="co" key={company.id}>
                    <span>
                      <b>{company.name}</b>
                      <br />
                      <span className="faint" style={{ fontSize: 11.5 }}>{company.location}</span>
                    </span>
                    <span style={{ textAlign: "right" }}>
                      <span className="num" style={{ fontSize: 12.5 }}>{company.amount || "—"}</span>
                      <br />
                      <LinkChip status={company.linkStatus} />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}

function AnalysisPanel({ analysis, revealed }: { analysis: Analysis; revealed: boolean }) {
  return (
    <section className="section analysis-panel">
      <div className="analysis-heading">
        <div>
          <h2 className="section-label">Evidence check</h2>
          <p className="faint" style={{ fontSize: 12, margin: 0 }}>
            Seven checks. Unknown means we do not know yet.
          </p>
        </div>
        {revealed ? (
          <div className="analysis-score"><strong>{analysis.score}/10</strong><span>over {analysis.answered} of 7 answered</span></div>
        ) : (
          <div className="analysis-score"><strong>hidden</strong><span>rate first to reveal</span></div>
        )}
      </div>
      {!revealed && <p className="callout" style={{ margin: "16px 0 0" }}>Add your own 0–10 rating to reveal the system&apos;s judgement. The missing evidence is shown below.</p>}
      {revealed && (
        <p className="faint" style={{ margin: "14px 0 0", fontSize: 12 }}>
          Computed over {analysis.answered} of 7 dimensions; {analysis.unknown.length} unknown and not included. Blocking dimension: {analysis.blocking ? dimensionLabel(analysis.blocking) : "none"}.
        </p>
      )}
      <div className="analysis-list">
        {analysis.dimensions.map((dimension) => (
          <DimensionRow key={dimension.key} dimension={dimension} revealed={revealed} />
        ))}
      </div>
    </section>
  );
}

function DimensionRow({ dimension, revealed }: { dimension: Dimension; revealed: boolean }) {
  const contribution = dimension.verdict === "yes" ? "+1" : dimension.verdict === "no" ? "−1" : "not counted";
  return (
    <div className="analysis-row">
      <div className="analysis-row-head">
        <div>
          <strong>{dimension.label}</strong>
          <span className="faint">{dimension.rule}</span>
        </div>
        <div className="chip-row">
          <span className={`chip ${dimension.verdict === "yes" ? "chip-ok" : dimension.verdict === "no" ? "chip-danger" : "chip-plain"}`}>{dimension.verdict}</span>
          {revealed && <span className="chip chip-plain">{contribution}</span>}
        </div>
      </div>
      {dimension.parts ? dimension.parts.map((part) => <PartRow key={part.key} part={part} />) : <CitationLine citation={dimension.citation} />}
    </div>
  );
}

function PartRow({ part }: { part: Part }) {
  return (
    <div className="analysis-part">
      <span>{part.label}</span>
      <span className="chip-row"><span className="faint">{part.verdict}</span><CitationLine citation={part.citation} /></span>
    </div>
  );
}

function CitationLine({ citation }: { citation?: Citation }) {
  if (!citation) return <span className="not-added">No citation yet</span>;
  return (
    <span className="analysis-citation">
      {citation.field && <span className="faint">{citation.field}</span>}
      {citation.url && <a href={citation.url} target="_blank" rel="noreferrer">source ↗</a>}
      {citation.passage && <span className="faint">{citation.passage}</span>}
      {citation.url && citation.opened === false && <span className="chip chip-warn">page not opened</span>}
    </span>
  );
}

function dimensionLabel(key: Analysis["blocking"]): string {
  const labels: Record<string, string> = { wedge: "Wedge", paid: "Paid today", repeats: "Repeats", buyer: "Buyer owns it", competition: "Competition", kill: "Kill reason", citations: "Citation integrity" };
  return key ? labels[key] : "none";
}

function ProblemEditor({ form, onChange, onCancel, onSave }: { form: Problem; onChange: (next: Problem) => void; onCancel: () => void; onSave: () => void }) {
  const set = <K extends keyof Problem>(key: K, value: Problem[K]) => onChange({ ...form, [key]: value });
  const setSignal = (key: string, patch: Partial<{ value: Score; note: string }>) =>
    onChange({ ...form, signals: form.signals.map((signal) => (signal.key === key ? { ...signal, ...patch } : signal)) });
  const setEvidence = (id: string, patch: Partial<Evidence>) =>
    onChange({ ...form, evidence: form.evidence.map((item) => (item.id === id ? { ...item, ...patch } : item)) });

  return (
    <main className="wrap">
      <div className="breadcrumb">
        <Link href="/">Problems</Link>
        <span className="crumb-sep">/</span>
        <Link href={`/problems/${form.id}`}>{form.id}</Link>
        <span className="crumb-sep">/</span>
        <span>edit</span>
      </div>

      <h1 style={{ fontSize: 26, letterSpacing: "-.03em", margin: "0 0 6px" }}>Edit problem</h1>
      <p className="faint" style={{ marginTop: 0, marginBottom: 26 }}>
        Write it as work somebody does. “An advisor rebuilds holdings from three broker exports”
        beats “finance is inefficient”.
      </p>

      <div className="form-grid">
        <label className="field span-2">
          <span>Title</span>
          <input className="input" value={form.title} onChange={(event) => set("title", event.target.value)} placeholder="What breaks, in one line" />
        </label>

        <label className="field">
          <span>Stage</span>
          <select className="input" value={form.gate} onChange={(event) => set("gate", event.target.value as Gate)}>
            {gates.map((gate) => (
              <option key={gate} value={gate}>
                {gateCopy[gate].short} — {gateCopy[gate].label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>What we are doing</span>
          <select className="input" value={form.action} onChange={(event) => set("action", event.target.value as Action)}>
            {actions.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Verdict</span>
          <select className="input" value={form.verdict} onChange={(event) => set("verdict", event.target.value as Verdict)}>
            {verdicts.map((verdict) => (
              <option key={verdict} value={verdict}>
                {verdictCopy[verdict]}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>If there is no moat</span>
          <select className="input" value={form.path} onChange={(event) => set("path", event.target.value as Problem["path"])}>
            <option value="undecided">undecided</option>
            <option value="service">service — do the work, automate later</option>
            <option value="product">product — build software</option>
          </select>
        </label>

        <label className="field span-2">
          <span>The problem, as work</span>
          <textarea className="input" rows={3} value={form.what} onChange={(event) => set("what", event.target.value)} />
        </label>

        <label className="field span-2">
          <span>
            Who pays for this today <span className="hint">— gate G2. Salary? Licence? Contractor? Name the number.</span>
          </span>
          <textarea className="input" rows={2} value={form.paidToday} onChange={(event) => set("paidToday", event.target.value)} />
        </label>

        <label className="field">
          <span>Domain</span>
          <input className="input" value={form.domain} onChange={(event) => set("domain", event.target.value)} />
        </label>

        <label className="field">
          <span>Market</span>
          <input className="input" value={form.market} onChange={(event) => set("market", event.target.value)} placeholder="London · Dublin" />
        </label>

        <label className="field">
          <span>Affected role</span>
          <input className="input" value={form.affectedRole} onChange={(event) => set("affectedRole", event.target.value)} />
        </label>

        <label className="field">
          <span>
            Buyer <span className="hint">— exactly one</span>
          </span>
          <input className="input" value={form.buyer} onChange={(event) => set("buyer", event.target.value)} />
        </label>

        <label className="field">
          <span>How it is done now</span>
          <input className="input" value={form.workaround} onChange={(event) => set("workaround", event.target.value)} />
        </label>

        <label className="field">
          <span>How often</span>
          <input className="input" value={form.frequency} onChange={(event) => set("frequency", event.target.value)} placeholder="daily · monthly · quarterly" />
        </label>

        <label className="field span-2">
          <span>What it costs them</span>
          <textarea className="input" rows={2} value={form.consequence} onChange={(event) => set("consequence", event.target.value)} />
        </label>

        <label className="field span-2">
          <span>Why they would pay</span>
          <textarea className="input" rows={2} value={form.whyTheyPay} onChange={(event) => set("whyTheyPay", event.target.value)} />
        </label>

        <label className="field span-2">
          <span>Who else sells this</span>
          <textarea className="input" rows={2} value={form.competition} onChange={(event) => set("competition", event.target.value)} />
        </label>

        <label className="field span-2">
          <span>The next question</span>
          <textarea className="input" rows={2} value={form.nextQuestion} onChange={(event) => set("nextQuestion", event.target.value)} />
        </label>

        <label className="field span-2">
          <span>What we have not checked</span>
          <textarea className="input" rows={2} value={form.unknowns} onChange={(event) => set("unknowns", event.target.value)} />
        </label>

        <label className="field span-2">
          <span>Why this might be a waste of time</span>
          <textarea className="input" rows={2} value={form.killReason} onChange={(event) => set("killReason", event.target.value)} />
        </label>
      </div>

      <section className="section" style={{ marginTop: 26 }}>
        <h2 className="section-label">The five questions — 0 to 3, equal weight</h2>
        <p className="faint" style={{ fontSize: 12.5, marginTop: 0 }}>
          Leave one blank if you have not checked. Blank is not zero. Every answered question needs a
          reason, or the tally is a guess.
        </p>
        {form.signals.map((signal) => {
          const def = signalDefs.find((item) => item.key === signal.key);
          return (
            <div className="editor-block" key={signal.key}>
              <div className="editor-block-head">
                <b>{def?.label}</b>
                <select
                  className="input"
                  value={signal.value === null ? "" : String(signal.value)}
                  onChange={(event) => setSignal(signal.key, { value: event.target.value === "" ? null : (Number(event.target.value) as Score) })}
                >
                  <option value="">not checked</option>
                  {def?.scale.map((label, index) => (
                    <option key={label} value={String(index)}>
                      {index} — {label}
                    </option>
                  ))}
                </select>
              </div>
              <input className="input" value={signal.note} onChange={(event) => setSignal(signal.key, { note: event.target.value })} placeholder="Why. The evidence, or it is a guess." />
            </div>
          );
        })}
      </section>

      <section className="section">
        <h2 className="section-label">Evidence</h2>
        {form.evidence.map((item, index) => (
          <div className="editor-block" key={item.id}>
            <div className="editor-block-head">
              <select className="input" value={item.type} onChange={(event) => setEvidence(item.id, { type: event.target.value as Evidence["type"] })}>
                {evidenceTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <select className="input" value={item.confidence} onChange={(event) => setEvidence(item.id, { confidence: event.target.value as Confidence })}>
                {confidences.map((confidence) => (
                  <option key={confidence} value={confidence}>
                    {confidence}
                  </option>
                ))}
              </select>
              <button type="button" className="btn btn-sm" onClick={() => onChange({ ...form, evidence: form.evidence.filter((entry) => entry.id !== item.id) })}>
                Remove
              </button>
            </div>
            <textarea
              className="input"
              rows={2}
              value={item.observation}
              onChange={(event) => setEvidence(item.id, { observation: event.target.value })}
              placeholder={`What was observed, in their words (evidence ${index + 1})`}
            />
            <input className="input" style={{ marginTop: 8 }} value={item.url} onChange={(event) => setEvidence(item.id, { url: event.target.value })} placeholder="https://" />
            <input className="input" style={{ marginTop: 8 }} value={item.date} onChange={(event) => setEvidence(item.id, { date: event.target.value })} placeholder="YYYY-MM-DD" />
          </div>
        ))}
        <button
          type="button"
          className="btn btn-sm"
          onClick={() =>
            onChange({
              ...form,
              evidence: [
                ...form.evidence,
                {
                  id: `${form.id}-e${form.evidence.length + 1}-${Date.now()}`,
                  type: "community",
                  observation: "",
                  url: "",
                  date: new Date().toISOString().slice(0, 10),
                  confidence: "inferred",
                  linkStatus: "unverified"
                }
              ]
            })
          }
        >
          Add evidence
        </button>
      </section>

      <div className="form-actions">
        <button className="btn btn-primary" onClick={onSave}>
          Save changes
        </button>
        <button className="btn" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </main>
  );
}
