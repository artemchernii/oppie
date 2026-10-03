// oppie.lab — the rules between a Supabase row and a Problem record.
//
// React-free and browser-free on purpose, like lib/problemPersistence.ts, so `pnpm test` can
// exercise the two rules that can destroy work without a browser or a database:
//
//   1. The first-load merge. The screen renders from data the server already read, and only then
//      reconciles what this browser still holds. Getting that order wrong is what silently
//      overwrites records — the seed list must never be the thing that gets written back.
//   2. What may leave the browser. The seeded problems are reference data for the method and are
//      never uploaded, so "is this row uploadable" is a rule here rather than a hope. A seed
//      becomes uploadable only once somebody has actually edited it.
//
// Column names are snake_case in Postgres and camelCase in TypeScript, and both directions are
// mapped explicitly here rather than derived. A rename that quietly starts reading `undefined`
// is the failure this file exists to make impossible.

import { type Evidence, type Problem, type Signal } from "./problems";
import { normalizeProblem } from "./problemPersistence";

export type Row = Record<string, unknown>;

const isRow = (value: unknown): value is Row =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const rows = (value: unknown): Row[] => (Array.isArray(value) ? value.filter(isRow) : []);


const positionOf = (row: Row): number =>
  typeof row.position === "number" && Number.isFinite(row.position) ? row.position : 0;

const byPosition = (a: Row, b: Row): number => positionOf(a) - positionOf(b);

/**
 * Postgres hands a `timestamptz` back as `2026-10-01T09:00:00+00:00`; the app writes
 * `new Date().toISOString()`, which is `...000Z`. They are the same instant and different strings,
 * and a structural comparison read that as a change — so a saved record never matched the row it had
 * just become. Measured against the live project on 2026-10-03, before this fix: the row came back
 * `+00:00`, the stored copy held `Z`, and the next load recomputed it as an edit.
 *
 * Canonicalising on the way in is the fix. An unparseable value is passed through rather than
 * dropped, so a bad timestamp stays visible instead of silently becoming *now*.
 */
const timestamp = (value: unknown): string | undefined => {
  if (typeof value !== "string" || !value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
};

// ============================================================ remote -> record

const signalFromRow = (row: Row): Row => ({
  key: row.key,
  question: row.question,
  value: row.value,
  note: row.note
});

const evidenceFromRow = (row: Row): Row => ({
  id: row.id,
  type: row.type,
  observation: row.observation,
  url: row.url,
  date: row.date,
  confidence: row.confidence,
  linkStatus: row.link_status
});

export type RemoteProblemParts = {
  problem: Row;
  signals?: Row[];
  evidence?: Row[];
  companies?: Row[];
};

/**
 * One row plus its children, as a Problem.
 *
 * The assembled object is handed to `normalizeProblem` rather than trusted, so a column that is
 * null, a string where a number belongs, or a `confidence` nobody recognises degrades to "empty"
 * exactly as it does on the localStorage path. One read path, one set of repair rules.
 *
 * Returns null when the row has no usable id. `normalizeProblem` would otherwise synthesise
 * `recovered-<n>`, which is the right repair for a browser's own storage and the wrong one here:
 * it would invent a database record that does not exist and then offer to write it back.
 */
export function problemFromRemote(parts: RemoteProblemParts, index: number): Problem | null {
  const { problem } = parts;
  if (typeof problem.id !== "string" || !problem.id) return null;

  const evidence = rows(parts.evidence).slice().sort(byPosition);
  const companies = rows(parts.companies).slice().sort(byPosition);

  return normalizeProblem(
    {
      id: problem.id,
      title: problem.title,
      gate: problem.gate,
      action: problem.action,
      verdict: problem.verdict,
      domain: problem.domain,
      market: problem.market,
      what: problem.what,
      affectedRole: problem.affected_role,
      buyer: problem.buyer,
      workaround: problem.workaround,
      frequency: problem.frequency,
      consequence: problem.consequence,
      whyTheyPay: problem.why_they_pay,
      paidToday: problem.paid_today,
      competition: problem.competition,
      path: problem.path,
      nextQuestion: problem.next_question,
      unknowns: problem.unknowns,
      killReason: problem.kill_reason,
      signals: rows(parts.signals).map(signalFromRow),
      evidence: evidence.map(evidenceFromRow),
      companyIds: companies.map((row) => row.company_id).filter((id): id is string => typeof id === "string"),
      createdAt: timestamp(problem.created_at),
      updatedAt: timestamp(problem.updated_at)
    },
    index
  );
}

const groupByProblem = (list: Row[]): Map<string, Row[]> => {
  const grouped = new Map<string, Row[]>();
  for (const row of list) {
    const id = row.problem_id;
    if (typeof id !== "string") continue;
    const bucket = grouped.get(id);
    if (bucket) bucket.push(row);
    else grouped.set(id, [row]);
  }
  return grouped;
};

/** The four queries stitched back together, in table order and then by `position`. */
export function problemsFromRemote(
  problemRows: unknown,
  signalRows: unknown,
  evidenceRows: unknown,
  companyRows: unknown
): Problem[] {
  const signals = groupByProblem(rows(signalRows));
  const evidence = groupByProblem(rows(evidenceRows));
  const companies = groupByProblem(rows(companyRows));

  return rows(problemRows)
    .map((problem, index) => {
      const id = typeof problem.id === "string" ? problem.id : "";
      return problemFromRemote(
        {
          problem,
          signals: signals.get(id) ?? [],
          evidence: evidence.get(id) ?? [],
          companies: companies.get(id) ?? []
        },
        index
      );
    })
    .filter((problem): problem is Problem => problem !== null);
}

// ============================================================ record -> remote

/**
 * The `problems` row. No `signals`, `evidence` or `companies`: those are child tables, and a
 * column that a rename would silently orphan is exactly what the explicit mapping is for.
 */
export function problemRowFrom(problem: Problem): Row {
  return {
    id: problem.id,
    title: problem.title,
    gate: problem.gate,
    action: problem.action,
    verdict: problem.verdict,
    domain: problem.domain,
    market: problem.market,
    what: problem.what,
    affected_role: problem.affectedRole,
    buyer: problem.buyer,
    workaround: problem.workaround,
    frequency: problem.frequency,
    consequence: problem.consequence,
    why_they_pay: problem.whyTheyPay,
    paid_today: problem.paidToday,
    competition: problem.competition,
    path: problem.path,
    next_question: problem.nextQuestion,
    unknowns: problem.unknowns,
    kill_reason: problem.killReason,
    created_at: problem.createdAt,
    updated_at: problem.updatedAt
  };
}

export function signalRowsFrom(problem: Problem): Row[] {
  return problem.signals.map((signal: Signal) => ({
    problem_id: problem.id,
    key: signal.key,
    question: signal.question,
    // null is "not rated" and is a different reading from 0, which is a real answer. The column
    // is nullable with no default for exactly this reason, so nothing is repaired on the way in.
    value: signal.value,
    note: signal.note
  }));
}

export function evidenceRowsFrom(problem: Problem): Row[] {
  return problem.evidence.map((item: Evidence, index: number) => ({
    id: item.id,
    problem_id: problem.id,
    type: item.type,
    observation: item.observation,
    url: item.url,
    date: item.date,
    confidence: item.confidence,
    // NULL, not 'unverified', when nobody said. The column is nullable so the database never
    // claims a link was triaged either way; the UI already renders a missing status as no chip.
    link_status: item.linkStatus ?? null,
    position: index
  }));
}

/**
 * The `problem_companies` rows, in the order the record lists them.
 *
 * This used to be deliberately left unwritten, because the foreign key points at `companies` and
 * that table was empty — a link row would either violate the constraint or need the reference
 * companies uploaded. They are uploaded now (`DECISIONS.md` #7), so a link row resolves and the
 * competition a record claims is real rather than a claim about a list nobody else can see.
 */
export function companyLinkRowsFrom(problem: Problem): Row[] {
  return problem.companyIds
    .filter((companyId: string) => typeof companyId === "string" && companyId.trim().length > 0)
    .map((companyId: string, index: number) => ({
      problem_id: problem.id,
      company_id: companyId,
      position: index
    }));
}
