"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { emptyProblem, gates, gateCopy, rankProblems, seedCompanies, type Gate } from "../lib/problems";
import { nextProblemId } from "../lib/problemPersistence";
import { useProblems } from "../lib/problemStore";
import { GateChip, ReadinessNumber, VerdictChip, isBacklog } from "./ui";

export default function ProblemsList() {
  const { problems, hydrated, insertProblem, resetToSeed } = useProblems();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [gateFilter, setGateFilter] = useState<Gate | "all">("all");
  const [showBacklog, setShowBacklog] = useState(true);

  const ranked = useMemo(() => rankProblems(problems), [problems]);
  const backlogCount = useMemo(() => problems.filter(isBacklog).length, [problems]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return ranked.filter((problem) => {
      if (gateFilter !== "all" && problem.gate !== gateFilter) return false;
      if (!showBacklog && isBacklog(problem)) return false;
      if (!needle) return true;
      return [problem.title, problem.buyer, problem.affectedRole, problem.domain, problem.what, problem.market]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [ranked, query, gateFilter, showBacklog]);

  const counts = gates.map((gate) => ({
    gate,
    count: problems.filter((problem) => problem.gate === gate && (showBacklog || !isBacklog(problem))).length
  }));

  const paidFor = problems.filter((problem) => problem.gate !== "G1-signal").length;

  const createProblem = () => {
    const id = nextProblemId(problems);
    insertProblem(emptyProblem(id));
    router.push(`/problems/${id}`);
  };

  return (
    <main className="wrap">
      <header className="page-head">
        <div className="page-head-row">
          <div>
            <div className="eyebrow">Find a problem worth building</div>
            <h1>Problems</h1>
            <p>
              Every problem you are tracking, how far the evidence goes, and how ready it is. Blank
              means not checked — it is never counted as zero.
            </p>
          </div>
          {hydrated && (
            <button className="btn btn-primary" onClick={createProblem}>
              New problem
            </button>
          )}
        </div>
      </header>

      <div className="summary">
        <div className="summary-item">
          <b>{problems.length - backlogCount}</b>
          <span>researched</span>
        </div>
        <div className="summary-item">
          <b>{backlogCount}</b>
          <span>not looked at yet</span>
        </div>
        <div className="summary-item">
          <b>{paidFor}</b>
          <span>proof someone pays</span>
        </div>
        <div className="summary-item">
          <b>{seedCompanies.length}</b>
          <span>companies with numbers</span>
        </div>
      </div>

      <div className="funnel">
        {counts.map(({ gate, count }) => (
          <button
            key={gate}
            className={`funnel-stage ${gate === "G2-paid" ? "is-g2" : ""} ${count === 0 ? "empty" : ""} ${
              gateFilter === gate ? "active" : ""
            }`}
            onClick={() => setGateFilter((current) => (current === gate ? "all" : gate))}
            title={gateCopy[gate].ask}
          >
            <span className="funnel-count">{count}</span>
            <span className="funnel-label">{gateCopy[gate].label}</span>
            <span className="funnel-ask">{gateCopy[gate].ask}</span>
          </button>
        ))}
      </div>

      <div className="toolbar">
        <input className="input search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, buyer, market…" />
        <div className="seg">
          <button className={gateFilter === "all" ? "active" : ""} onClick={() => setGateFilter("all")}>
            All stages
          </button>
          <button className={gateFilter === "G2-paid" ? "active" : ""} onClick={() => setGateFilter("G2-paid")}>
            Someone pays
          </button>
        </div>
        <button className="btn btn-sm" onClick={() => setShowBacklog((current) => !current)}>
          {showBacklog ? "Hide not-researched" : "Show not-researched"}
        </button>
        <span className="toolbar-note">Sorted by furthest evidence, then how complete</span>
      </div>

      <div className="list">
        {visible.map((problem) => {
          const backlog = isBacklog(problem);
          return (
            <Link key={problem.id} href={`/problems/${problem.id}`} className={`row ${backlog ? "backlog" : ""}`}>
              <div>
                <p className="row-title">
                  <span className="row-id">{problem.id}</span>
                  {problem.title || "Untitled problem"}
                </p>
                <div className="row-meta">
                  {problem.what.trim() ? problem.what.slice(0, 110) + (problem.what.length > 110 ? "…" : "") : "Not described yet."}
                </div>
              </div>
              <div className="row-meta">
                <Value text={problem.buyer} />
              </div>
              <div>
                <GateChip gate={problem.gate} />
              </div>
              <div>
                <ReadinessNumber problem={problem} />
              </div>
            </Link>
          );
        })}
        {visible.length === 0 && <div className="empty">Nothing matches that. Clear the search or the stage filter.</div>}
      </div>

      <div className="footer">
        <span>
          “not researched” means no evidence and no answered question yet — not a score of zero. A
          tally with blanks beside it is a guess, and is labelled as one.
        </span>
        <div className="footer-right">
          <button className="link-button" onClick={resetToSeed}>
            Reset to seed data
          </button>
        </div>
      </div>
    </main>
  );
}

function Value({ text }: { text: string }) {
  return text.trim() ? <>{text}</> : <span className="not-added">no buyer yet</span>;
}
