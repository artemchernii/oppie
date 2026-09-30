"use client";

// oppie.lab — the Problems screen.
//
// Plain-language by design. Every number on screen is either a count of records, a
// figure copied from a cited source, or a judgement whose reason is visible next to it.
// Nothing is generated.

import { useEffect, useMemo, useState } from "react";
import {
  actions,
  blankSignals,
  confidences,
  emptyProblem,
  gates,
  gateCopy,
  evidenceTypes,
  rankProblems,
  readiness,
  seedCompanies,
  signalDefs,
  verdictCopy,
  verdicts,
  type Action,
  type Company,
  type Confidence,
  type Evidence,
  type Gate,
  type Problem,
  type Score,
  type Verdict
} from "../lib/problems";
import { nextProblemId } from "../lib/problemPersistence";
import { useProblems } from "../lib/problemStore";

const money = (value: string) => value.trim();

const companyById = (id: string): Company | undefined => seedCompanies.find((company) => company.id === id);

const CONFIDENCE_NOTE: Record<Confidence, string> = {
  direct: "Seen in the source",
  reported: "Said by someone else, not verified here",
  inferred: "Our reading, not stated"
};

function Value({ text }: { text: string }) {
  const trimmed = text.trim();
  if (!trimmed) return <span className="not-added">Not added yet</span>;
  return <>{trimmed}</>;
}

function GateChip({ gate }: { gate: Gate }) {
  return (
    <span className={`gate-chip ${gate.slice(0, 2).toLowerCase()}`}>
      <b>{gateCopy[gate].short}</b> {gateCopy[gate].label}
    </span>
  );
}

/**
 * The "can I build this" tally. Shown with its own gaps, because a total with
 * unchecked rows is a guess, and the screen has to say so out loud.
 */
function Readiness({ problem, compact = false }: { problem: Problem; compact?: boolean }) {
  const r = readiness(problem);
  const complete = r.unchecked === 0;
  const width = Math.round((r.total / r.max) * 100);
  return (
    <div className={`ready ${complete ? "complete" : "gappy"}`}>
      <div className="ready-top">
        <strong>{r.total}</strong>
        <span>/ {r.max}</span>
        {!compact && <em>{complete ? "all questions answered" : `${r.unchecked} not checked`}</em>}
      </div>
      <div className="ready-bar" aria-hidden="true">
        <i style={{ width: `${width}%` }} />
      </div>
      {!complete && !compact && <p className="ready-warn">A tally with blanks is a guess. Fill the blanks before trusting the number.</p>}
    </div>
  );
}

export default function Problems() {
  const { problems, hydrated, storageError, lastSavedAt, updateProblem, insertProblem, resetToSeed } = useProblems();

  const [tab, setTab] = useState<"problems" | "companies">("problems");
  const [query, setQuery] = useState("");
  const [gateFilter, setGateFilter] = useState<Gate | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ item: Problem; isNew: boolean } | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (!savedFlash) return;
    const timer = window.setTimeout(() => setSavedFlash(false), 2200);
    return () => window.clearTimeout(timer);
  }, [savedFlash]);

  const ranked = useMemo(() => rankProblems(problems), [problems]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return ranked.filter((problem) => {
      if (gateFilter !== "all" && problem.gate !== gateFilter) return false;
      if (!needle) return true;
      return [problem.title, problem.buyer, problem.affectedRole, problem.domain, problem.what, problem.market]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [ranked, query, gateFilter]);

  const selected = selectedId ? problems.find((problem) => problem.id === selectedId) ?? null : null;

  const gateCounts = useMemo(
    () => gates.map((gate) => ({ gate, count: problems.filter((problem) => problem.gate === gate).length })),
    [problems]
  );

  const paidFor = useMemo(() => problems.filter((problem) => problem.gate !== "G1-signal").length, [problems]);
  const openCount = useMemo(() => problems.filter((problem) => problem.verdict === "open").length, [problems]);

  const startNew = () => {
    const item = emptyProblem(nextProblemId(problems));
    item.title = "";
    item.signals = blankSignals();
    setDraft({ item, isNew: true });
  };

  const saveDraft = (next: Problem) => {
    if (draft?.isNew) insertProblem(next);
    else updateProblem(next.id, next);
    setDraft(null);
    setSelectedId(next.id);
    setSavedFlash(true);
  };

  return (
    <div className="content">
      <div className="topbar">
        <div className="breadcrumb">
          <strong>oppie.lab</strong>
          <b>/</b>
          <span>{tab === "problems" ? "Problems" : "Companies & numbers"}</span>
        </div>
        <div className="top-actions">
          <span className="sync">
            <i />
            {storageError ? "Local save failed" : lastSavedAt ? `Saved ${lastSavedAt.slice(11, 16)}` : hydrated ? "Loaded" : "Loading"}
          </span>
        </div>
      </div>

      <div className="page-head">
        <div>
          <div className="eyebrow">Find a problem worth building</div>
          <h1>{tab === "problems" ? "Problems" : "Who pays, and how much"}</h1>
          <p>
            {tab === "problems"
              ? "Every problem, how far the evidence goes, and how ready it is. Blanks are shown as blanks."
              : "Real companies and the real numbers attached to this work."}
          </p>
        </div>
        <div className="head-actions">
          <div className="view-toggle">
            <button className={tab === "problems" ? "selected" : ""} onClick={() => setTab("problems")} title="Problems">
              ▤
            </button>
            <button className={tab === "companies" ? "selected" : ""} onClick={() => setTab("companies")} title="Companies">
              ⌂
            </button>
          </div>
          <button className="primary" onClick={startNew}>
            <span>＋</span>New problem
          </button>
        </div>
      </div>

      {tab === "companies" ? (
        <CompaniesView />
      ) : (
        <>
          <div className="signal-strip">
            <div className="signal-intro">
              <span className="signal-icon">◇</span>
              <div>
                <strong>{problems.length} problems in the queue</strong>
                <span>
                  {paidFor} of them have proof that money is already being spent on the work · {openCount} still open
                </span>
              </div>
            </div>
            <div className="signal-stats">
              <div>
                <b>{paidFor}</b>
                <span>PAID TONIGHT</span>
              </div>
              <div>
                <b>{problems.length - paidFor}</b>
                <span>UNPROVEN</span>
              </div>
            </div>
          </div>

          <div className="funnel" role="list">
            {gateCounts.map(({ gate, count }) => (
              <button
                key={gate}
                role="listitem"
                className={`funnel-stage ${gateFilter === gate ? "active" : ""}`}
                onClick={() => setGateFilter((current) => (current === gate ? "all" : gate))}
                title={gateCopy[gate].ask}
              >
                <span className="funnel-count">{count}</span>
                <span className="funnel-label">
                  <b>{gateCopy[gate].short}</b> {gateCopy[gate].label}
                </span>
                <span className="funnel-ask">{gateCopy[gate].ask}</span>
              </button>
            ))}
          </div>

          <div className="toolbar">
            <label className="search">
              ⌕
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search problems, buyers, markets" />
            </label>
            <div className="filters">
              <button className={`filter ${gateFilter === "all" ? "active" : ""}`} onClick={() => setGateFilter("all")}>
                All stages
              </button>
              <button className={`filter ${gateFilter === "G2-paid" ? "active" : ""}`} onClick={() => setGateFilter("G2-paid")}>
                Someone pays
              </button>
            </div>
            <span className="sorted-note">Sorted by: furthest evidence, then readiness</span>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Problem</th>
                  <th>Buyer</th>
                  <th>Stage</th>
                  <th>Readiness</th>
                  <th>Verdict</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((problem) => {
                  const r = readiness(problem);
                  return (
                    <tr key={problem.id} onClick={() => setSelectedId(problem.id)}>
                      <td>
                        <strong>
                          <span className="table-number">{problem.id}</span>
                          {problem.title || "Untitled"}
                        </strong>
                        <small>
                          <Value text={problem.market} />
                        </small>
                      </td>
                      <td>
                        <Value text={problem.buyer} />
                      </td>
                      <td>
                        <GateChip gate={problem.gate} />
                      </td>
                      <td>
                        <span className={`tally ${r.unchecked === 0 ? "complete" : "gappy"}`}>
                          {r.total}/{r.max}
                          {r.unchecked > 0 && <em>{r.unchecked} blank</em>}
                        </span>
                      </td>
                      <td>
                        <span className={`verdict-chip ${problem.verdict}`}>{verdictCopy[problem.verdict]}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {visible.length === 0 && <div className="empty">Nothing matches that. Clear the search or the stage filter.</div>}
          </div>

          <div className="footer">
            <span>
              Counts are counts of records. A number with blanks beside it is a guess, and is labelled as one.
            </span>
            <div className="footer-right">
              {savedFlash && <span className="saved-flag">SAVED</span>}
              <button className="link-button" onClick={resetToSeed}>
                Reset to seed data
              </button>
            </div>
          </div>
        </>
      )}

      {selected && !draft && (
        <ProblemDrawer
          problem={selected}
          onClose={() => setSelectedId(null)}
          onEdit={() => setDraft({ item: JSON.parse(JSON.stringify(selected)) as Problem, isNew: false })}
        />
      )}

      {draft && (
        <ProblemEditor
          problem={draft.item}
          isNew={draft.isNew}
          onCancel={() => setDraft(null)}
          onSave={saveDraft}
        />
      )}
    </div>
  );
}

function CompaniesView() {
  const groups: { kind: Company["kind"]; title: string; blurb: string }[] = [
    { kind: "employer", title: "Companies paying a salary for this work", blurb: "A job posting is a budget line stated in public. The salary is the price already being paid." },
    { kind: "vendor", title: "Companies already selling software for it", blurb: "Someone charging money proves a price is accepted in this market." },
    { kind: "bespoke", title: "Someone paid to do it by hand", blurb: "Custom work means demand exists and nobody has productised the step." }
  ];

  return (
    <>
      {groups.map((group) => {
        const rows = seedCompanies.filter((company) => company.kind === group.kind);
        if (rows.length === 0) return null;
        return (
          <div className="company-group" key={group.kind}>
            <h2>{group.title}</h2>
            <p className="company-blurb">{group.blurb}</p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Where</th>
                    <th>The work</th>
                    <th>Number</th>
                    <th>How sure</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((company) => (
                    <tr key={company.id}>
                      <td>
                        <strong>{company.name}</strong>
                      </td>
                      <td>{company.where}</td>
                      <td>
                        {company.role}
                        {company.url ? (
                          <>
                            {" "}
                            <a className="inline-link" href={company.url} target="_blank" rel="noreferrer">
                              source ↗
                            </a>
                          </>
                        ) : null}
                      </td>
                      <td>
                        <strong className="number-cell">{money(company.number) || "—"}</strong>
                        <small>{company.numberLabel}</small>
                      </td>
                      <td>
                        <span className={`confidence-chip ${company.confidence}`}>{company.confidence}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
      <div className="footer">
        <span>
          Confidence: direct = seen in the source · reported = stated by someone else · inferred = our reading. Nothing here is averaged into a score.
        </span>
      </div>
    </>
  );
}

function ProblemDrawer({ problem, onClose, onEdit }: { problem: Problem; onClose: () => void; onEdit: () => void }) {
  const r = readiness(problem);
  const companies = problem.companyIds.map(companyById).filter((company): company is Company => Boolean(company));

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer wide" onClick={(event) => event.stopPropagation()}>
        <div className="drawer-head">
          <div className="drawer-status-row">
            <GateChip gate={problem.gate} />
            <span className="status-note">{problem.action}</span>
          </div>
          <div className="drawer-head-actions">
            <button className="primary" onClick={onEdit}>
              Edit
            </button>
            <button className="close" onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>
        </div>

        <h2>{problem.title || "Untitled problem"}</h2>
        <p className="drawer-thesis">
          <Value text={problem.what} />
        </p>

        <div className="detail-block">
          <span className="detail-label">READINESS — A JUDGEMENT TALLY, NOT A PROBABILITY</span>
          <Readiness problem={problem} />
        </div>

        <div className="detail-block">
          <span className="detail-label">WHY THAT NUMBER</span>
          <div className="signal-list">
            {problem.signals.map((signal) => (
              <div className="signal-row" key={signal.key}>
                <div className="signal-row-top">
                  <b>{signalDefs.find((def) => def.key === signal.key)?.label ?? signal.key}</b>
                  <span className={signal.value === null ? "score blank" : "score"}>
                    {signal.value === null ? "not checked" : `${signal.value}/3`}
                  </span>
                </div>
                <p className={signal.note.trim() ? "" : "not-added"}>
                  <Value text={signal.note} />
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="detail-block">
          <span className="detail-label">WHO PAYS TODAY</span>
          <p>
            <Value text={problem.paidToday} />
          </p>
        </div>

        <div className="economics">
          <div>
            <span>Buyer</span>
            <strong>
              <Value text={problem.buyer} />
            </strong>
          </div>
          <div>
            <span>Market</span>
            <strong>
              <Value text={problem.market} />
            </strong>
          </div>
          <div>
            <span>Affected role</span>
            <strong>
              <Value text={problem.affectedRole} />
            </strong>
          </div>
          <div>
            <span>Path if no moat</span>
            <strong>{problem.path}</strong>
          </div>
        </div>

        <div className="detail-block">
          <span className="detail-label">CURRENT WORKAROUND</span>
          <p>
            <Value text={problem.workaround} />
          </p>
        </div>

        <div className="detail-block">
          <span className="detail-label">WHAT IT COSTS THEM</span>
          <p>
            <Value text={problem.consequence} />
          </p>
        </div>

        <div className="detail-block">
          <span className="detail-label">WHO ELSE SELLS THIS</span>
          <p>
            <Value text={problem.competition} />
          </p>
        </div>

        {companies.length > 0 && (
          <div className="detail-block">
            <span className="detail-label">COMPANIES & NUMBERS</span>
            {companies.map((company) => (
              <div className="company-line" key={company.id}>
                <div>
                  <b>{company.name}</b>
                  <span>{company.where}</span>
                </div>
                <strong className="number-cell">{money(company.number) || "—"}</strong>
              </div>
            ))}
          </div>
        )}

        <div className="next-test">
          <span className="detail-label">NEXT QUESTION</span>
          <strong>
            <Value text={problem.nextQuestion} />
          </strong>
        </div>

        <div className="unknown-block">
          <span className="detail-label">WHAT WE HAVE NOT CHECKED</span>
          <p>
            <Value text={problem.unknowns} />
          </p>
        </div>

        {problem.killReason.trim() && (
          <div className="detail-block kill">
            <span className="detail-label">WHY THIS MIGHT BE A WASTE OF TIME</span>
            <p>
              <Value text={problem.killReason} />
            </p>
          </div>
        )}

        <div className="drawer-sources">
          <span className="detail-label">EVIDENCE ({problem.evidence.length})</span>
          {problem.evidence.length === 0 && <p className="not-added" style={{ fontSize: 11 }}>Nothing gathered yet.</p>}
          {problem.evidence.map((item) => (
            <div className="evidence-line" key={item.id}>
              <div className="evidence-top">
                <span className={`evidence-type ${item.type}`}>{item.type}</span>
                <span className={`confidence-chip ${item.confidence}`}>{item.confidence}</span>
                {item.url ? (
                  <a className="inline-link" href={item.url} target="_blank" rel="noreferrer">
                    open ↗
                  </a>
                ) : null}
              </div>
              <p>{item.observation}</p>
              <span className="evidence-note">{CONFIDENCE_NOTE[item.confidence]}</span>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

function ProblemEditor({
  problem,
  isNew,
  onCancel,
  onSave
}: {
  problem: Problem;
  isNew: boolean;
  onCancel: () => void;
  onSave: (next: Problem) => void;
}) {
  const [form, setForm] = useState<Problem>(problem);

  const set = <K extends keyof Problem>(key: K, value: Problem[K]) => setForm((current) => ({ ...current, [key]: value }));

  const setSignal = (key: string, patch: Partial<{ value: Score; note: string }>) =>
    setForm((current) => ({
      ...current,
      signals: current.signals.map((signal) => (signal.key === key ? { ...signal, ...patch } : signal))
    }));

  const setEvidence = (id: string, patch: Partial<Evidence>) =>
    setForm((current) => ({ ...current, evidence: current.evidence.map((item) => (item.id === id ? { ...item, ...patch } : item)) }));

  const addEvidence = () =>
    setForm((current) => ({
      ...current,
      evidence: [
        ...current.evidence,
        { id: `${current.id}-e${current.evidence.length + 1}-${Date.now()}`, type: "community", observation: "", url: "", date: new Date().toISOString().slice(0, 10), confidence: "inferred" }
      ]
    }));

  const removeEvidence = (id: string) => setForm((current) => ({ ...current, evidence: current.evidence.filter((item) => item.id !== id) }));

  return (
    <div className="drawer-backdrop" onClick={onCancel}>
      <aside className="drawer wide" onClick={(event) => event.stopPropagation()}>
        <form
          className="edit-form"
          onSubmit={(event) => {
            event.preventDefault();
            onSave(form);
          }}
        >
          <div className="drawer-head">
            <span className="detail-label">{isNew ? "NEW PROBLEM" : form.id}</span>
            <button type="button" className="close" onClick={onCancel} aria-label="Close">
              ×
            </button>
          </div>

          <h2>{isNew ? "Add a problem" : "Edit problem"}</h2>
          <p className="form-hint">
            Write it as work somebody does, not as a category. “An advisor rebuilds client holdings from three broker exports” beats “finance is inefficient”.
          </p>

          <div className="form-grid">
            <label className="field span-2">
              <span>Title</span>
              <input value={form.title} onChange={(event) => set("title", event.target.value)} placeholder="What breaks, in one line" />
            </label>

            <label className="field">
              <span>Stage</span>
              <select value={form.gate} onChange={(event) => set("gate", event.target.value as Gate)}>
                {gates.map((gate) => (
                  <option key={gate} value={gate}>
                    {gateCopy[gate].short} — {gateCopy[gate].label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>What we are doing</span>
              <select value={form.action} onChange={(event) => set("action", event.target.value as Action)}>
                {actions.map((action) => (
                  <option key={action} value={action}>
                    {action}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Verdict</span>
              <select value={form.verdict} onChange={(event) => set("verdict", event.target.value as Verdict)}>
                {verdicts.map((verdict) => (
                  <option key={verdict} value={verdict}>
                    {verdictCopy[verdict]}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Path if no moat</span>
              <select value={form.path} onChange={(event) => set("path", event.target.value as Problem["path"])}>
                <option value="undecided">undecided</option>
                <option value="service">service</option>
                <option value="product">product</option>
              </select>
            </label>

            <label className="field span-2">
              <span>The problem as work</span>
              <textarea rows={3} value={form.what} onChange={(event) => set("what", event.target.value)} />
            </label>

            <label className="field">
              <span>Domain</span>
              <input value={form.domain} onChange={(event) => set("domain", event.target.value)} />
            </label>

            <label className="field">
              <span>Market</span>
              <input value={form.market} onChange={(event) => set("market", event.target.value)} placeholder="London · Dublin · not Portugal alone" />
            </label>

            <label className="field">
              <span>Affected role</span>
              <input value={form.affectedRole} onChange={(event) => set("affectedRole", event.target.value)} />
            </label>

            <label className="field">
              <span>Buyer — exactly one</span>
              <input value={form.buyer} onChange={(event) => set("buyer", event.target.value)} />
            </label>

            <label className="field span-2">
              <span>Who pays today</span>
              <textarea rows={2} value={form.paidToday} onChange={(event) => set("paidToday", event.target.value)} placeholder="Salary? Licence? Contractor? Name the number." />
            </label>

            <label className="field span-2">
              <span>Current workaround</span>
              <textarea rows={2} value={form.workaround} onChange={(event) => set("workaround", event.target.value)} />
            </label>

            <label className="field span-2">
              <span>What it costs them</span>
              <textarea rows={2} value={form.consequence} onChange={(event) => set("consequence", event.target.value)} />
            </label>

            <label className="field span-2">
              <span>Who else sells this</span>
              <textarea rows={2} value={form.competition} onChange={(event) => set("competition", event.target.value)} />
            </label>

            <label className="field span-2">
              <span>Next question</span>
              <textarea rows={2} value={form.nextQuestion} onChange={(event) => set("nextQuestion", event.target.value)} />
            </label>

            <label className="field span-2">
              <span>What we have not checked</span>
              <textarea rows={2} value={form.unknowns} onChange={(event) => set("unknowns", event.target.value)} />
            </label>

            <label className="field span-2">
              <span>Why this might be a waste of time</span>
              <textarea rows={2} value={form.killReason} onChange={(event) => set("killReason", event.target.value)} />
            </label>
          </div>

          <div className="source-editor">
            <div className="source-editor-head">
              <span className="detail-label">THE FIVE QUESTIONS — 0 TO 3</span>
              <span className="source-count">Leave blank if you have not checked</span>
            </div>
            {form.signals.map((signal) => {
              const def = signalDefs.find((item) => item.key === signal.key);
              return (
                <div className="signal-edit" key={signal.key}>
                  <div className="signal-edit-head">
                    <b>{def?.label}</b>
                    <select
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
                  <input value={signal.note} onChange={(event) => setSignal(signal.key, { note: event.target.value })} placeholder="Why. The evidence, or it is a guess." />
                </div>
              );
            })}
          </div>

          <div className="source-editor">
            <div className="source-editor-head">
              <span className="detail-label">EVIDENCE</span>
              <span className="source-count">{form.evidence.length === 0 ? "Not added yet" : `${form.evidence.length} linked`}</span>
            </div>
            {form.evidence.map((item, index) => (
              <div className="source-row" key={item.id}>
                <div className="source-row-top">
                  <select aria-label={`Evidence ${index + 1} type`} value={item.type} onChange={(event) => setEvidence(item.id, { type: event.target.value as Evidence["type"] })}>
                    {evidenceTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label={`Evidence ${index + 1} confidence`}
                    value={item.confidence}
                    onChange={(event) => setEvidence(item.id, { confidence: event.target.value as Confidence })}
                  >
                    {confidences.map((confidence) => (
                      <option key={confidence} value={confidence}>
                        {confidence}
                      </option>
                    ))}
                  </select>
                  <button type="button" className="icon-remove" aria-label={`Remove evidence ${index + 1}`} onClick={() => removeEvidence(item.id)}>
                    ✕
                  </button>
                </div>
                <input aria-label={`Evidence ${index + 1} observation`} value={item.observation} onChange={(event) => setEvidence(item.id, { observation: event.target.value })} placeholder="What was observed, in their words" />
                <input aria-label={`Evidence ${index + 1} url`} value={item.url} onChange={(event) => setEvidence(item.id, { url: event.target.value })} placeholder="https://" />
                <input aria-label={`Evidence ${index + 1} date`} value={item.date} onChange={(event) => setEvidence(item.id, { date: event.target.value })} placeholder="YYYY-MM-DD" />
              </div>
            ))}
            <button type="button" className="add-source" onClick={addEvidence}>
              ＋ Add evidence
            </button>
          </div>

          <div className="drawer-actions sticky">
            <button type="submit" className="primary">
              {isNew ? "Create problem" : "Save changes"}
            </button>
            <button type="button" className="secondary" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
