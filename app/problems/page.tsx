import ProblemsList from "../ProblemsList";
import { problemsForPage, ratingsForPage } from "../../lib/problemRemote";

/**
 * Per-person data behind a session cookie. Force-dynamic rather than merely "dynamic because
 * `cookies()` was touched": the read is wrapped in a try/catch, and a caught dynamic-usage error
 * would let Next prerender this once at build time and serve that snapshot to everybody.
 */
export const metadata = { title: "oppie.lab — tracked problems" };

export const dynamic = "force-dynamic";

export default async function Page() {
  const [{ problems, error }, { ratings, error: ratingsError }] = await Promise.all([problemsForPage(), ratingsForPage()]);
  return <ProblemsList initial={problems} readError={error} initialRatings={ratings} ratingsError={ratingsError} />;
}
