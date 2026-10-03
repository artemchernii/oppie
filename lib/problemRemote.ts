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

import { problemsFromRemote, companyLinkRowsFrom, evidenceRowsFrom, problemRowFrom, signalRowsFrom } from "./problemSync";
import type { Problem } from "./problems";
import { supabaseForRoute } from "./supabase/server";
import { supabaseConfig } from "./supabaseConfig";
import { isNextControlFlow, messageOf, reason } from "./supabaseResult";

export type ProblemsRead = { ok: true; problems: Problem[] } | { ok: false; error: string };
export type ProblemSave = { ok: true } | { ok: false; error: string };

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
    return { ok: false, error: messageOf(error, "unknown read failure") };
  }
}

export type ProblemsPage = { problems: Problem[]; error: string | null };

/**
 * What a page renders from.
 *
 * **There is no fallback.** If the read fails the page says so, instead of quietly rendering
 * something else — a screen that shows one thing while looking like another is worse than a screen
 * that admits it could not load. There is no browser copy to fall back to any more either; the
 * database is the only store (`DECISIONS.md` #9).
 */
export async function problemsForPage(): Promise<ProblemsPage> {
  const result = await readRemoteProblems();
  if (!result.ok) {
    console.error(`[problems] read failed: ${result.error}`);
    return { problems: [], error: result.error };
  }
  return { problems: result.problems, error: null };
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

    // The company links. This was left unwritten while `companies` was empty, because the foreign
    // key had nothing to point at; `DECISIONS.md` #7 loaded the researched companies, so a link row
    // now resolves and the competition a record claims is checkable.
    const links = companyLinkRowsFrom(problem);
    if (links.length > 0) {
      const written = await supabase.from("problem_companies").upsert(links, { onConflict: "problem_id,company_id" });
      if (written.error) return { ok: false, error: reason(written.error) };
    }

    const keptCompanies = links.map((row) => String(row.company_id));
    const prunedLinks = keptCompanies.length
      ? await supabase.from("problem_companies").delete().eq("problem_id", problem.id).not("company_id", "in", inList(keptCompanies))
      : await supabase.from("problem_companies").delete().eq("problem_id", problem.id);
    if (prunedLinks.error) return { ok: false, error: reason(prunedLinks.error) };

    return { ok: true };
  } catch (error) {
    if (isNextControlFlow(error)) throw error;
    return { ok: false, error: messageOf(error, "unknown write failure") };
  }
}

/** A PostgREST `in` list. Values are JSON-quoted so an id with a comma or a quote cannot split it. */
function inList(values: readonly string[]): string {
  return `(${values.map((value) => JSON.stringify(value)).join(",")})`;
}
