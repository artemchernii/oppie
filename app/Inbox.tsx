"use client";

// oppie.lab — the triage inbox.
//
// The engine collects. It does not conclude. Everything on this screen is raw until a
// person does something with it: attach a source to a problem, or throw it away. The
// proposals at the bottom are suggestions, and they stay suggestions until accepted.

import Link from "next/link";
import { useMemo, useState } from "react";
import { confidences, evidenceTypes, type Confidence, type EvidenceType, type LinkStatus } from "../lib/problems";
import { sourceToEvidence, type CollectedSource, type Proposal } from "../lib/research";
import { useProblems } from "../lib/problemStore";
import { useResearch } from "../lib/researchStore";
import { LinkChip } from "./ui";

const LINK_OPTIONS: LinkStatus[] = ["unverified", "checked", "dead"];

export default function Inbox() {
  const { sources, proposals, hydrated, mark, discard, decideProposal, acceptProposal, resetResearch } = useResearch();
  const { problems, updateProblem } = useProblems();

  const [showSpent, setShowSpent] = useState(false);

  const counts = useMemo(
    () => ({
      fresh: sources.filter((source) => source.status === "new").length,
      kept: sources.filter((source) => source.status === "kept").length,
      spent: sources.filter((source) => source.status === "spent").length,
      proposals: proposals.filter((proposal) => proposal.status === "proposed").length
    }),
    [sources, proposals]
  );

  const visible = sources.filter((source) => source.status !== "spent" || showSpent);
  const pending = proposals.filter((proposal) => proposal.status === "proposed");
  const decided = proposals.filter((proposal) => proposal.status !== "proposed");

  const attach = (source: CollectedSource, problemId: string, type: EvidenceType, confidence: Confidence, linkStatus: LinkStatus) => {
    const problem = problems.find((item) => item.id === problemId);
    if (!problem) return;
    const evidence = { ...sourceToEvidence({ ...source, evidenceType: type, confidence, linkStatus }) };
    updateProblem(problemId, { evidence: [...problem.evidence, evidence] });
    mark(source.id, { status: "kept", attachTo: problemId, evidenceType: type, confidence, linkStatus });
  };

  return (
    <main className="wrap">
      <header className="page-head">
        <div className="eyebrow">The engine collects · you decide</div>
        <h1>Inbox</h1>
        <p>
          Sources the research engine found and nobody has judged yet. Nothing here is attached to a
          record or counted anywhere until you attach it. Proposals at the bottom are suggestions —
          they are not in any tally, and they are never applied on their own.
        </p>
      </header>

      <div className="summary">
        <div className="summary-item">
          <b>{counts.fresh}</b>
          <span>unjudged</span>
        </div>
        <div className="summary-item">
          <b>{counts.kept}</b>
          <span>attached to a problem</span>
        </div>
        <div className="summary-item">
          <b>{counts.spent}</b>
          <span>thrown away</span>
        </div>
        <div className="summary-item">
          <b>{counts.proposals}</b>
          <span>suggested answers</span>
        </div>
      </div>

      <div className="toolbar">
        <button className="btn btn-sm" onClick={() => setShowSpent((current) => !current)}>
          {showSpent ? "Hide discarded" : "Show discarded"}
        </button>
        <span className="toolbar-note">
          {hydrated ? "Local to this browser" : "Loading…"}
        </span>
      </div>

      <div className="stack">
        {visible.map((source) => (
          <SourceCard
            key={source.id}
            source={source}
            problems={problems.map((problem) => ({ id: problem.id, title: problem.title }))}
            onAttach={attach}
            onDiscard={() => discard(source.id)}
          />
        ))}
        {visible.length === 0 && <div className="empty">Nothing left to judge. Run another pass and ingest it.</div>}
      </div>

      {pending.length > 0 && (
        <section style={{ marginTop: 44 }}>
          <h2 className="block-title">Suggested answers</h2>
          <p className="block-sub">
            One per question, each with the reason and the source it came from. Accepting writes the
            score <em>and</em> the reason into the record, so the number never loses its trail.
          </p>
          <div className="stack">
            {pending.map((proposal) => {
              const problem = problems.find((item) => item.id === proposal.problemId);
              return (
                <ProposalCard
                  key={proposal.id}
                  proposal={proposal}
                  problemTitle={problem?.title ?? proposal.problemId}
                  canAccept={Boolean(problem)}
                  onAccept={() => problem && acceptProposal(proposal.id, problem, (next) => updateProblem(next.id, next))}
                  onReject={() => decideProposal(proposal.id, "rejected")}
                />
              );
            })}
          </div>
        </section>
      )}

      {decided.length > 0 && (
        <section style={{ marginTop: 36 }}>
          <h2 className="block-title">Already decided</h2>
          <div className="list">
            {decided.map((proposal) => (
              <div className="row" key={proposal.id} style={{ gridTemplateColumns: "1fr 120px 110px" }}>
                <div>
                  <p className="row-title">
                    <span className="row-id">{proposal.problemId}</span>
                    {proposal.signalKey} · suggested {proposal.value}/3
                  </p>
                  <div className="row-meta">{proposal.reason.slice(0, 130)}…</div>
                </div>
                <div>
                  <span className={`chip ${proposal.status === "accepted" ? "chip-ok" : "chip-plain"}`}>{proposal.status}</span>
                </div>
                <div>
                  <button className="link-button" onClick={() => decideProposal(proposal.id, "proposed")}>
                    Undo
                  </button>
                </div>
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
        <div className="footer-right">
          <button className="link-button" onClick={resetResearch}>
            Reset inbox
          </button>
        </div>
      </div>
    </main>
  );
}

function SourceCard({
  source,
  problems,
  onAttach,
  onDiscard
}: {
  source: CollectedSource;
  problems: { id: string; title: string }[];
  onAttach: (source: CollectedSource, problemId: string, type: EvidenceType, confidence: Confidence, linkStatus: LinkStatus) => void;
  onDiscard: () => void;
}) {
  const [problemId, setProblemId] = useState(source.attachTo ?? source.suggests ?? problems[0]?.id ?? "");
  const [type, setType] = useState<EvidenceType>((source.evidenceType as EvidenceType) ?? "report");
  const [confidence, setConfidence] = useState<Confidence>((source.confidence as Confidence) ?? "reported");
  const [linkStatus, setLinkStatus] = useState<LinkStatus>(source.linkStatus ?? "unverified");

  const spent = source.status === "spent";

  return (
    <article className="aside-card" style={spent ? { opacity: 0.6 } : undefined}>
      <div className="chip-row" style={{ marginBottom: 10 }}>
        <span className={`chip ${source.status === "kept" ? "chip-ok" : "chip-plain"}`}>{source.status === "kept" ? "attached" : source.status}</span>
        {source.suggests && <span className="chip chip-plain">looks like {source.suggests}</span>}
        <span className="faint mono" style={{ fontSize: 11 }}>
          found by: {source.foundFor}
        </span>
      </div>

      <h3 style={{ fontFamily: "var(--sans)", fontSize: 15, textTransform: "none", letterSpacing: 0, color: "var(--text)", margin: "0 0 8px" }}>{source.title}</h3>

      <p className="quote" style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 10px", lineHeight: 1.6 }}>
        {source.finding}
      </p>

      <a href={source.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, wordBreak: "break-all" }}>
        {source.url.replace(/^https?:\/\//, "").slice(0, 88)} ↗
      </a>

      <div className="chip-row" style={{ marginTop: 14, gap: 8 }}>
        <select className="input" style={{ width: "auto" }} value={problemId} onChange={(event) => setProblemId(event.target.value)} aria-label="Attach to problem">
          {problems.map((problem) => (
            <option key={problem.id} value={problem.id}>
              {problem.id} — {(problem.title || "untitled").slice(0, 40)}
            </option>
          ))}
        </select>
        <select className="input" style={{ width: "auto" }} value={type} onChange={(event) => setType(event.target.value as EvidenceType)} aria-label="Evidence type">
          {evidenceTypes.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <select className="input" style={{ width: "auto" }} value={confidence} onChange={(event) => setConfidence(event.target.value as Confidence)} aria-label="Confidence">
          {confidences.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <select className="input" style={{ width: "auto" }} value={linkStatus} onChange={(event) => setLinkStatus(event.target.value as LinkStatus)} aria-label="Link status">
          {LINK_OPTIONS.map((option) => (
            <option key={option} value={option}>
              link {option}
            </option>
          ))}
        </select>
        <button className="btn btn-primary btn-sm" onClick={() => onAttach(source, problemId, type, confidence, linkStatus)}>
          Attach as evidence
        </button>
        {!spent && (
          <button className="btn btn-sm" onClick={onDiscard}>
            Discard
          </button>
        )}
        {source.status === "kept" && source.attachTo && (
          <Link className="link-button" href={`/problems/${source.attachTo}`}>
            open {source.attachTo}
          </Link>
        )}
      </div>
    </article>
  );
}

function ProposalCard({
  proposal,
  problemTitle,
  canAccept,
  onAccept,
  onReject
}: {
  proposal: Proposal;
  problemTitle: string;
  canAccept: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <article className="aside-card">
      <div className="chip-row" style={{ marginBottom: 10 }}>
        <span className="chip chip-warn">suggested</span>
        <span className="chip chip-plain">
          {proposal.problemId} · {proposal.signalKey}
        </span>
        <span className="chip">{proposal.value}/3</span>
      </div>
      <p className="faint" style={{ margin: "0 0 8px", fontSize: 12.5 }}>
        {problemTitle}
      </p>
      <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>{proposal.reason}</p>
      <a href={proposal.sourceUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
        {proposal.sourceUrl.replace(/^https?:\/\//, "").slice(0, 80)} ↗
      </a>
      <div className="chip-row" style={{ marginTop: 14 }}>
        <button className="btn btn-primary btn-sm" disabled={!canAccept} onClick={onAccept}>
          Accept — writes the score and the reason
        </button>
        <button className="btn btn-sm" onClick={onReject}>
          Reject
        </button>
        <span className="faint" style={{ fontSize: 11.5 }}>
          Accepting replaces the current answer and its note for this question.
        </span>
      </div>
    </article>
  );
}
