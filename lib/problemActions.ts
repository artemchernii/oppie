"use server";

// oppie.lab — the writes the problems screen is allowed to make.
//
// A server action, so the browser never holds a Supabase key and never talks to Postgres
// directly. The call arrives as a POST, which means middleware.ts has already checked the session
// before this runs, and Postgres then evaluates the policy again as that same person. Two gates,
// and the second one is the one that matters.

import { saveRemoteProblem, saveRemoteRating, type ProblemSave, type RatingInput } from "./problemRemote";
import { revalidatePath } from "next/cache";
import type { Problem } from "./problems";

/**
 * Upserts one record. Returns a reason instead of throwing, because a client that cannot tell
 * "saved" from "did not save" is how somebody keeps typing into a form that is going nowhere.
 *
 * The path revalidation clears Next's client-side router cache, so navigating back to the list
 * re-reads the database rather than replaying the render from before the write.
 */
export async function saveProblem(problem: Problem): Promise<ProblemSave> {
  const result = await saveRemoteProblem(problem);
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

/**
 * Stores one person's rating of one problem, with the system's score at that moment.
 *
 * Beside `saveProblem` rather than folded into it, because they are different acts: a problem is
 * edited, a rating is only ever added. This one takes three fields and nothing else — the rubric
 * version, the score and the count it was computed over are read from the record server-side, so
 * the browser cannot assert what the system said (`lib/problemRemote.ts`).
 *
 * A refusal comes back as a reason rather than a throw, like a failed save: the surface has to be
 * able to say "that needs a reason" without the queue in front of it disappearing.
 */
export async function rateProblem(input: RatingInput): Promise<ProblemSave> {
  const result = await saveRemoteRating(input);
  if (result.ok) revalidatePath("/", "layout");
  return result;
}
