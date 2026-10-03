"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { analyse, compareByScore, RUBRIC_VERSION } from "../lib/analysis";
import { emptyProblem, gates, gateCopy, rankProblems, seedCompanies, type Gate, type Problem, type ProblemRating } from "../lib/problems";
import { nextProblemId } from "../lib/problemPersistence";
import { useProblems } from "../lib/problemStore";
import { GateChip } from "./ui";

type Order = "cited" | "judgement";

export default function ProblemsList({ initial, readError, initialRatings, ratingsError }: { initial: Problem[]; readError: string | null; initialRatings: ProblemRating[]; ratingsError: string | null }) {
  const { problems, saveError, insertProblem } = useProblems(initial);
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [gateFilter, setGateFilter] = useState<Gate | "all">("all");
  const [showBacklog, setShowBacklog] = useState(true);
  const [order, setOrder] = useState<Order>("cited");

  const ratingsByProblem = useMemo(() => new Map(initialRatings.filter((item) => item.rubricVersion === RUBRIC_VERSION).map((item) => [item.problemId, item])), [initialRatings]);
  const analyses = useMemo(() => new Map(problems.map((problem) => [problem.id, analyse(problem)])), [problems]);
  const ranked = useMemo(() => {
    const cited = rankProblems(problems);
    if (order === "cited") return cited;
    const revealed = cited.filter((problem) => ratingsByProblem.has(problem.id) && (analyses.get(problem.id)?.score ?? null) !== null);
    const unrevealed = cited.filter((problem) => !ratingsByProblem.has(problem.id) || (analyses.get(problem.id)?.score ?? null) === null);
    return [...revealed.sort((a, b) => compareByScore(analyses.get(a.id)!, analyses.get(b.id)!)), ...unrevealed];
  }, [analyses, order, problems, ratingsByProblem]);
  const backlogCount = useMemo(() => problems.filter((problem) => (analyses.get(problem.id)?.answered ?? 0) === 0).length, [analyses, problems]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return ranked.filter((problem) => {
      if (gateFilter !== "all" && problem.gate !== gateFilter) return false;
      if (!showBacklog && (analyses.get(problem.id)?.answered ?? 0) === 0) return false;
      if (!needle) return true;
      return [problem.title, problem.buyer, problem.affectedRole, problem.domain, problem.what, problem.market]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [analyses, ranked, query, gateFilter, showBacklog]);

  const counts = gates.map((gate) => ({
    gate,
    count: problems.filter((problem) => problem.gate === gate && (showBacklog || (analyses.get(problem.id)?.answered ?? 0) > 0)).length
  }));

  const paidFor = problems.filter((problem) => problem.gate !== "G1-signal").length;

  const createProblem = () => {
    const id = nextProblemId(problems);
    insertProblem(emptyProblem(id));
    router.push(`/problems/${id}`);
  };

  return (
    <main className="wrap problems-page">
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
          <button className="btn btn-primary" onClick={createProblem}>
            New problem
          </button>
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
        <div className="seg" aria-label="Problem order">
          <button className={order === "cited" ? "active" : ""} onClick={() => setOrder("cited")}>Cited order</button>
          <button className={order === "judgement" ? "active" : ""} onClick={() => setOrder("judgement")}>This system's judgement</button>
        </div>
        <span className="toolbar-note">{order === "cited" ? "Furthest evidence, then completeness" : "Answered dimensions first, then this system's judgement"}</span>
      </div>

      {ratingsError && <div className="storage-warn" role="alert" style={{ marginBottom: 12 }}>Scores could not be read: {ratingsError}</div>}
      <div className="list">
        {visible.filter((problem) => (analyses.get(problem.id)?.answered ?? 0) > 0).map((problem) => {
          const analysis = analyses.get(problem.id)!;
          const revealed = ratingsByProblem.has(problem.id);
          return (
            <Link key={problem.id} href={`/problems/${problem.id}`} className="row">
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
                {revealed && analysis.score !== null ? <span className="ready-num">{analysis.score}/10 <em>over {analysis.answered} of 7 · judgement</em></span> : <span className="not-added">not rated yet</span>}
                <span className="row-blocking">Blocking: {analysis.blocking ? blockingLabel(analysis.blocking) : "none"}</span>
              </div>
            </Link>
          );
        })}
        {visible.filter((problem) => (analyses.get(problem.id)?.answered ?? 0) > 0).length === 0 && <div className="empty">Nothing matches that. Clear the search or the stage filter.</div>}
      </div>

      <section className="unanalysed-lane">
        <div className="lane-head"><div><h2>Not analysed yet</h2><p>No rubric dimension has an answer. These records stay here regardless of order.</p></div><span className="chip chip-plain">{backlogCount} records</span></div>
        {showBacklog && visible.filter((problem) => (analyses.get(problem.id)?.answered ?? 0) === 0).map((problem) => (
          <Link key={problem.id} href={`/problems/${problem.id}`} className="row backlog">
            <div><p className="row-title"><span className="row-id">{problem.id}</span>{problem.title || "Untitled problem"}</p><div className="row-meta">{problem.what.trim() ? problem.what.slice(0, 110) : "Not described yet."}</div></div>
            <div className="row-meta"><Value text={problem.buyer} /></div><div><GateChip gate={problem.gate} /></div><div className="not-added">not rated yet</div>
          </Link>
        ))}
      </section>

      {readError && (
        <div className="empty storage-warn" role="alert">
          The records could not be read: {readError}
        </div>
      )}

      <div className="footer">
        <span>
          “not researched” means no evidence and no answered question yet — not a score of zero. A
          tally with blanks beside it is a guess, and is labelled as one.
        </span>
        <div className="footer-right">
          {saveError ? (
            <b className="storage-warn">Not saved: {saveError}</b>
          ) : (
            <span>Saved</span>
          )}
        </div>
      </div>
    </main>
  );
}

function blockingLabel(key: ReturnType<typeof analyse>["blocking"]) {
  const labels: Record<string, string> = { wedge: "Wedge", paid: "Paid today", repeats: "Repeats", buyer: "Buyer", competition: "Competition", kill: "Kill reason", citations: "Citation integrity" };
  return key ? labels[key] : "none";
}

function Value({ text }: { text: string }) {
  return text.trim() ? <>{text}</> : <span className="not-added">no buyer yet</span>;
}
