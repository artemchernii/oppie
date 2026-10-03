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

import { seedProblems, type Evidence, type Problem, type Signal } from "./problems";
import { normalizeProblem } from "./problemPersistence";

export type Row = Record<string, unknown>;

const isRow = (value: unknown): value is Row =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const rows = (value: unknown): Row[] => (Array.isArray(value) ? value.filter(isRow) : []);

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const positionOf = (row: Row): number =>
  typeof row.position === "number" && Number.isFinite(row.position) ? row.position : 0;

const byPosition = (a: Row, b: Row): number => positionOf(a) - positionOf(b);

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
      createdAt: problem.created_at,
      updatedAt: problem.updated_at
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

// ============================================================ what may leave the browser

/** Order-independent, key-order-independent, so two identical records compare equal. */
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (isRow(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stable(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

/**
 * Both sides go through `normalizeProblem` before comparing, so an incidental shape difference
 * (a key order, a field the read path repairs) does not read as "somebody edited this".
 */
const projection = (value: unknown): string => stable(normalizeProblem(value, 0));

/**
 * True when this record is a seeded problem, untouched.
 *
 * This is the guard that keeps reference data out of the database. It compares against the seed
 * rather than against an id list, so the moment any field is edited — including `updatedAt`,
 * which every mutation rewrites — the record stops being pristine and becomes the user's.
 */
export function isPristineSeed(problem: Problem, seeds: readonly Problem[] = seedProblems): boolean {
  const seed = seeds.find((item) => item.id === problem.id);
  return seed ? projection(seed) === projection(problem) : false;
}

/** Untouched seeds never leave the browser; everything else is the user's record. */
export function shouldPersistToRemote(problem: Problem, seeds: readonly Problem[] = seedProblems): boolean {
  return !isPristineSeed(problem, seeds);
}

/** Keeps `base`'s order and lets `overlay` win where the ids collide. */
function mergeById(base: readonly Problem[], overlay: readonly Problem[]): Problem[] {
  const merged = base.map((problem) => clone(problem));
  for (const problem of overlay) {
    const index = merged.findIndex((item) => item.id === problem.id);
    if (index === -1) merged.push(clone(problem));
    else merged[index] = clone(problem);
  }
  return merged;
}

export type FirstLoadPlan = {
  /** What the screen should show once this browser's records have been reconciled. */
  problems: Problem[];
  /** Rows this browser holds that the database does not have yet. Written once, never again. */
  upload: Problem[];
};

/**
 * The one-time cutover, decided in the same place every time.
 *
 * `remote === null` means the read did not produce a row set — unconfigured, denied, or failed.
 * That is NOT the same as an empty table, and the difference is the point: with the remote state
 * unknown, the browser's own records are still shown but nothing is uploaded. Pushing into a
 * table that could not be read is how a stale local copy overwrites a newer remote one.
 *
 * With `remote === []` the table really is empty, so local work is pushed up once. Untouched
 * seeds are never in that push, because `isPristineSeed` filters them out first.
 */
export function planFirstLoad({
  remote,
  local,
  seeds = seedProblems
}: {
  remote: Problem[] | null;
  local: Problem[] | null;
  seeds?: readonly Problem[];
}): FirstLoadPlan {
  const remoteList = remote ?? [];
  const base = remoteList.length > 0 ? remoteList : clone(seeds as Problem[]);

  const localList = local ?? [];
  const localWork = localList.filter((problem) => !isPristineSeed(problem, seeds));

  const overlay = remote === null ? localList : localWork;
  const problems = mergeById(base, overlay);

  const upload =
    remote === null
      ? []
      : localWork.filter((problem) => {
          const existing = remoteList.find((item) => item.id === problem.id);
          return !existing || projection(existing) !== projection(problem);
        });

  return { problems, upload };
}

export type WritePlan = {
  /** Whether this render may touch storage at all. False before hydration, always. */
  shouldCache: boolean;
  /** Records the user actually changed, seeds and repeats already removed. */
  upload: Problem[];
};

/**
 * The write gate, as a rule rather than as an `if` inside an effect.
 *
 * Before `hydrated` nothing is written anywhere. That is the whole hydration contract: the first
 * client render is the seed (so it matches the server), and if it were ever the thing that got
 * persisted, it would replace the user's records with reference data.
 */
export function planWrite({
  hydrated,
  dirty,
  problems,
  seeds = seedProblems
}: {
  hydrated: boolean;
  dirty: readonly string[];
  problems: readonly Problem[];
  seeds?: readonly Problem[];
}): WritePlan {
  if (!hydrated) return { shouldCache: false, upload: [] };

  const seen = new Set<string>();
  const upload: Problem[] = [];
  for (const id of dirty) {
    if (seen.has(id)) continue;
    seen.add(id);
    const problem = problems.find((item) => item.id === id);
    if (problem && shouldPersistToRemote(problem, seeds)) upload.push(problem);
  }

  return { shouldCache: true, upload };
}
