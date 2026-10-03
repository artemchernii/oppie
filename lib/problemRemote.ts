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

import { problemsFromRemote, ratingFromRow, ratingRowFrom, companyLinkRowsFrom, evidenceRowsFrom, problemRowFrom, signalRowsFrom } from "./problemSync";
import { analyse, requiresReason, DIVERGENCE_THRESHOLD, RATING_MAX, RATING_MIN } from "./analysis";
import type { Problem, ProblemRating } from "./problems";
import { supabaseForRoute } from "./supabase/server";
import { supabaseConfig } from "./supabaseConfig";
import { isNextControlFlow, messageOf, reason } from "./supabaseResult";

export type ProblemsRead = { ok: true; problems: Problem[] } | { ok: false; error: string };
export type ProblemSave = { ok: true } | { ok: false; error: string };
export type RatingsRead = { ok: true; ratings: ProblemRating[] } | { ok: false; error: string };

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

// ============================================================ ratings

export type RatingsPage = { ratings: ProblemRating[]; error: string | null };

/**
 * Every rating ever made, oldest first.
 *
 * All of them rather than the latest per problem, because the divergence log is the point of the
 * table: the older rows are the ones that say the rubric was wrong. The caller picks the row that
 * decides whether a score may be shown — one whose `rubricVersion` is the current one.
 */
export async function readRemoteRatings(): Promise<RatingsRead> {
  if (!supabaseConfig().userConfigured) {
    return { ok: false, error: "SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are not both set" };
  }

  try {
    const { supabase } = supabaseForRoute();
    const result = await supabase.from("problem_ratings").select("*").order("created_at", { ascending: true }).order("id", { ascending: true });
    if (result.error) return { ok: false, error: reason(result.error) };

    const rows = Array.isArray(result.data) ? result.data : [];
    const ratings: ProblemRating[] = [];
    for (const row of rows) {
      const rating = ratingFromRow(row as Record<string, unknown>);
      // A row that cannot be read as a rating is dropped, not repaired. It is not announced here:
      // the caller shows the ratings it can trust, and a made-up one would be worse than a missing
      // one — the arithmetic between the two numbers is the only thing this table is for.
      if (rating) ratings.push(rating);
    }
    return { ok: true, ratings };
  } catch (error) {
    if (isNextControlFlow(error)) throw error;
    return { ok: false, error: messageOf(error, "unknown read failure") };
  }
}

/**
 * What a page renders the ratings from. No fallback, for the same reason `problemsForPage` has
 * none: a screen that shows something else while looking like the real thing is worse than one that
 * says it could not load.
 */
export async function ratingsForPage(): Promise<RatingsPage> {
  const result = await readRemoteRatings();
  if (!result.ok) {
    console.error(`[ratings] read failed: ${result.error}`);
    return { ratings: [], error: result.error };
  }
  return { ratings: result.ratings, error: null };
}

/** What a person submits: their number, and their reason when one is owed. Nothing else. */
export type RatingInput = {
  problemId: string;
  rating: number;
  reason: string;
};

/**
 * Stores one person's rating of one problem, together with the system's score at that moment.
 *
 * **The score is recomputed here, not taken from the browser.** `score_at_rating` claims to be what
 * the system said, so it has to be what the system says: the record is read, `analyse` runs over it,
 * and the version that produced the number is written beside it. A number supplied by the caller
 * would be a claim about the system that the system never made, and the divergence log built on it
 * would be a log of nothing.
 *
 * Nothing is applied on the way in. This is the one path a rating takes, it is one insert, and it
 * happens because a person pressed something — see `docs/RULES.md` § 12.
 *
 * There are two gates on the divergence rule and both are wanted. The caller refuses an empty reason
 * where one is owed, with a message that says how far apart the two numbers were; the database's
 * `rating_reason_required_on_divergence` refuses the same row even if a caller forgets. A silent
 * violation here would be permanent, which is why the rule is held in both places.
 */
export async function saveRemoteRating(input: RatingInput): Promise<ProblemSave> {
  if (!supabaseConfig().userConfigured) {
    return { ok: false, error: "SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are not both set" };
  }

  if (!Number.isInteger(input.rating) || input.rating < RATING_MIN || input.rating > RATING_MAX) {
    return { ok: false, error: `a rating is a whole number from ${RATING_MIN} to ${RATING_MAX}` };
  }

  try {
    const { supabase } = supabaseForRoute();

    // The whole record is read rather than the four child tables filtered by id: the analysis is
    // computed from exactly what the detail surface renders, so the score stored here is the score
    // a person could check by hand against the page they were looking at.
    const problems = await readRemoteProblems();
    if (!problems.ok) return { ok: false, error: `could not read the record to rate it: ${problems.error}` };

    const problem = problems.problems.find((item) => item.id === input.problemId);
    if (!problem) return { ok: false, error: `no problem ${input.problemId} to rate` };

    const analysis = analyse(problem);
    if (analysis.score === null) {
      // `answered_at_rating` is NOT NULL and at least 1 for the same reason. There is no score and
      // no base, so there is nothing for a rating to agree or disagree with.
      return { ok: false, error: `nothing has been answered on ${problem.id} yet, so there is no score to rate against` };
    }

    const given = input.reason.trim();
    if (requiresReason(input.rating, analysis.score) && given === "") {
      const apart = Math.abs(input.rating - analysis.score);
      return { ok: false, error: `a rating ${apart} points from the score (more than ${DIVERGENCE_THRESHOLD}) needs the reason for the disagreement` };
    }

    const written = await supabase.from("problem_ratings").insert(
      ratingRowFrom({
        id: newRatingId(),
        problemId: problem.id,
        rubricVersion: analysis.rubricVersion,
        scoreAtRating: analysis.score,
        answeredAtRating: analysis.answered,
        rating: input.rating,
        reason: given
      })
    );
    if (written.error) return { ok: false, error: reason(written.error) };

    return { ok: true };
  } catch (error) {
    if (isNextControlFlow(error)) throw error;
    return { ok: false, error: messageOf(error, "unknown write failure") };
  }
}

/**
 * A fresh rating id, allocated with the insert and never chosen by a browser.
 *
 * `crypto.randomUUID`, the same source `nextOpportunityId` uses, rather than a count: a rating is
 * never deleted, so a count would be stable either way, but a collision would silently overwrite a
 * person's judgement rather than raise.
 */
function newRatingId(): string {
  return `rate-${crypto.randomUUID()}`;
}
