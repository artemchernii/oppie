// oppie.lab — the `problems` record type over Supabase.
//
// Server only. It imports lib/supabase/server.ts, which carries the session cookie and acts as
// the signed-in person, so every statement here is evaluated by Postgres under the policy in
// 20261002000000_allowlist.sql (`public.is_allowed()`). The secret key is not used and must not
// be: a privileged read would bypass the very check this file exists to exercise.
//
// Both directions live together on purpose. Reads and writes have to agree about column names,
// and a mapping split across two files is where a rename starts reading `undefined` and writing
// null over somebody's record.

import { problemsFromRemote, evidenceRowsFrom, problemRowFrom, signalRowsFrom } from "./problemSync";
import type { Problem } from "./problems";
import { supabaseForRoute } from "./supabase/server";
import { supabaseConfig } from "./supabaseConfig";

export type ProblemsRead = { ok: true; problems: Problem[] } | { ok: false; error: string };
export type ProblemSave = { ok: true } | { ok: false; error: string };

/**
 * Next signals "this route cannot be static" by throwing out of `cookies()` with a `digest` of
 * DYNAMIC_SERVER_USAGE. Swallowing that here would look harmless and is not: the route would be
 * prerendered once at build time and every signed-in person would be served whatever that build
 * happened to contain. Control-flow digests are rethrown so Next sees them.
 */
function isNextControlFlow(error: unknown): boolean {
  const digest = (error as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" && /^(DYNAMIC_SERVER_USAGE|NEXT_)/.test(digest);
}

function reason(error: { code?: string | null; message?: string } | null): string {
  if (!error) return "unknown Supabase error";
  return [error.code, error.message].filter(Boolean).join(" ");
}

/**
 * Every problem, with its signals, evidence and company links.
 *
 * Four queries in parallel rather than one nested `select`: PostgREST embedding would have to be
 * re-derived from the foreign keys, and a relationship it cannot infer fails at runtime with a
 * message about the schema rather than about the record. Four flat selects say what they read.
 *
 * `ok: false` covers unconfigured, denied and failed alike, and it is deliberately not an empty
 * list. `[]` means "the table is empty, so local work may be pushed up"; "we could not tell" must
 * never be mistaken for that, or a failed read would authorise writing over newer rows. See
 * planFirstLoad in lib/problemSync.ts for what the caller does with each.
 */
export async function readRemoteProblems(): Promise<ProblemsRead> {
  if (!supabaseConfig().userConfigured) {
    return { ok: false, error: "SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are not both set" };
  }

  try {
    const { supabase } = supabaseForRoute();
    const [problems, signals, evidence, companies] = await Promise.all([
      supabase.from("problems").select("*").order("created_at", { ascending: true }).order("id", { ascending: true }),
      supabase.from("problem_signals").select("*"),
      supabase.from("problem_evidence").select("*").order("position", { ascending: true }),
      supabase.from("problem_companies").select("*").order("position", { ascending: true })
    ]);

    for (const result of [problems, signals, evidence, companies]) {
      if (result.error) return { ok: false, error: reason(result.error) };
    }

    return {
      ok: true,
      problems: problemsFromRemote(problems.data, signals.data, evidence.data, companies.data)
    };
  } catch (error) {
    if (isNextControlFlow(error)) throw error;
    return { ok: false, error: error instanceof Error ? error.message : "unknown read failure" };
  }
}

/** What a page renders from. Null means "keep using what the browser already has". */
export async function problemsForPage(): Promise<Problem[] | null> {
  const result = await readRemoteProblems();
  if (!result.ok) {
    console.error(`[problems] remote read unavailable: ${result.error}`);
    return null;
  }
  return result.problems;
}

/**
 * Writes one record and its children.
 *
 * The parent goes first so the child foreign keys resolve. Children are upserted and then pruned
 * rather than deleted and re-inserted: a delete that succeeds followed by an insert that fails
 * leaves the record with no evidence at all, which is precisely the silent loss this whole file
 * is supposed to prevent. Upsert-then-prune can only ever leave a stale extra row.
 *
 * There is no transaction across the four tables — PostgREST does not offer one — so a failure
 * part-way leaves a partially written record and returns the reason. The UI surfaces it instead
 * of reporting a save that did not happen.
 */
export async function saveRemoteProblem(problem: Problem): Promise<ProblemSave> {
  if (!supabaseConfig().userConfigured) {
    return { ok: false, error: "SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are not both set" };
  }

  try {
    const { supabase } = supabaseForRoute();

    const parent = await supabase.from("problems").upsert(problemRowFrom(problem), { onConflict: "id" });
    if (parent.error) return { ok: false, error: reason(parent.error) };

    const signals = await supabase.from("problem_signals").upsert(signalRowsFrom(problem), { onConflict: "problem_id,key" });
    if (signals.error) return { ok: false, error: reason(signals.error) };

    const evidence = await supabase.from("problem_evidence").upsert(evidenceRowsFrom(problem), { onConflict: "id" });
    if (evidence.error) return { ok: false, error: reason(evidence.error) };

    const keptEvidence = problem.evidence.map((item) => item.id);
    const prunedEvidence = keptEvidence.length
      ? await supabase.from("problem_evidence").delete().eq("problem_id", problem.id).not("id", "in", inList(keptEvidence))
      : await supabase.from("problem_evidence").delete().eq("problem_id", problem.id);
    if (prunedEvidence.error) return { ok: false, error: reason(prunedEvidence.error) };

    // `problem_companies` is deliberately NOT written. Its foreign key points at `companies`,
    // which is still seed-only data in lib/problems.ts — inserting a link row would either fail
    // the constraint or require uploading the reference companies, which DECISIONS.md #1 forbids.
    // Company attribution is read-only in the UI, so nothing a person can do this slice is lost.
    // It moves with the companies screen.

    return { ok: true };
  } catch (error) {
    if (isNextControlFlow(error)) throw error;
    return { ok: false, error: error instanceof Error ? error.message : "unknown write failure" };
  }
}

/** A PostgREST `in` list. Values are JSON-quoted so an id with a comma or a quote cannot split it. */
function inList(values: readonly string[]): string {
  return `(${values.map((value) => JSON.stringify(value)).join(",")})`;
}
