import ProblemsList from "./ProblemsList";
import { problemsForPage } from "../lib/problemRemote";

/**
 * Per-person data behind a session cookie. Force-dynamic rather than merely "dynamic because
 * `cookies()` was touched": the read is wrapped in a try/catch that returns the seed on failure,
 * and a caught dynamic-usage error would let Next prerender this once at build time and serve
 * that snapshot to everybody. Explicit is the only safe answer here.
 */
export const dynamic = "force-dynamic";

export default async function Page() {
  return <ProblemsList remote={await problemsForPage()} />;
}
