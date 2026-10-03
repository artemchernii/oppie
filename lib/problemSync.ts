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

import { type Evidence, type Problem, type ProblemRating, type Signal } from "./problems";
import { DIVERGENCE_THRESHOLD } from "./analysis";
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
 * rather than to a value. One read path, one set of repair rules.
 *
 * Returns null when the row has no usable id. `normalizeProblem` would otherwise synthesise
 * `recovered-<n>`, which is the right repair for a record somebody typed and the wrong one here: it
 * would invent a database record that does not exist and then offer to write it back.
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

// ============================================================ ratings

// A rating is not part of a Problem. It is an event about one — a person's number, and the system's
// number as it stood at that moment — so it has its own two directions here rather than being
// threaded through `problemFromRemote` and `problemRowFrom`.

/**
 * A rating on its way into `problem_ratings`.
 *
 * Deliberately not a whole `ProblemRating`: `createdAt` is left to the column default, because the
 * moment a rating was made is the moment the database accepted it, not whatever a clock in this
 * process says. Everything else is set by the caller that derived it — the rubric version, the
 * score, and the count it was computed over. None of it comes from the browser.
 */
export type NewRating = {
  id: string;
  problemId: string;
  rubricVersion: number;
  scoreAtRating: number;
  answeredAtRating: number;
  rating: number;
  reason: string;
};

/**
 * An integer from a row, or null when the value cannot be read as one.
 *
 * PostgREST hands a `smallint` back as a number, but a value that arrives as a string, as a float
 * or as null is a row this code does not understand, and a wrong number in a rating is worse than a
 * missing row: the whole point of the table is the arithmetic between the two numbers.
 */
const integerWithin = (value: unknown, min: number, max: number): number | null => {
  const number = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : NaN;
  if (!Number.isInteger(number) || number < min || number > max) return null;
  return number;
};

/**
 * One `problem_ratings` row as a `ProblemRating`, or null when the row cannot be read as one.
 *
 * Null rather than a repaired object, following `problemFromRemote`: guessing here would invent a
 * person's number, or the system's, and the divergence between them is the only reason the table
 * exists. A divergence with a blank reason is also rejected, because the CHECK in the migration
 * keeps such a row from being written — its presence means the row is not trustworthy, not that the
 * caller may read it as agreement.
 */
export function ratingFromRow(row: Row): ProblemRating | null {
  const id = typeof row.id === "string" ? row.id : "";
  const problemId = typeof row.problem_id === "string" ? row.problem_id : "";
  if (!id || !problemId) return null;

  const rubricVersion = integerWithin(row.rubric_version, 1, Number.MAX_SAFE_INTEGER);
  const scoreAtRating = integerWithin(row.score_at_rating, 0, 10);
  const answeredAtRating = integerWithin(row.answered_at_rating, 1, 7);
  const rating = integerWithin(row.rating, 0, 10);
  const reason = typeof row.reason === "string" ? row.reason : null;

  if (rubricVersion === null || scoreAtRating === null || answeredAtRating === null || rating === null || reason === null) {
    return null;
  }
  if (Math.abs(rating - scoreAtRating) > DIVERGENCE_THRESHOLD && reason.trim() === "") return null;

  return {
    id,
    problemId,
    rubricVersion,
    scoreAtRating,
    answeredAtRating,
    rating,
    reason,
    // The column is NOT NULL with a `now()` default, so an unreadable one is a row this code does
    // not understand rather than one to date with today.
    createdAt: timestamp(row.created_at) ?? ""
  };
}

/** The `problem_ratings` row. No `created_at`: the timestamp is the database's to stamp. */
export function ratingRowFrom(rating: NewRating): Row {
  return {
    id: rating.id,
    problem_id: rating.problemId,
    rubric_version: rating.rubricVersion,
    score_at_rating: rating.scoreAtRating,
    answered_at_rating: rating.answeredAtRating,
    rating: rating.rating,
    reason: rating.reason
  };
}
