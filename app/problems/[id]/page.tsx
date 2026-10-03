import ProblemDetail from "../../ProblemDetail";
import { problemsForPage } from "../../../lib/problemRemote";

/**
 * No `generateStaticParams` any more.
 *
 * It listed the seeded problem ids so each got a prerendered URL. That was right while the
 * records lived in the browser and were read after hydration; now the page is rendered per
 * request as the signed-in person, and a prerendered page would be one person's records baked
 * into a file. Records created in the browser still resolve — see the merge in lib/problemSync.ts.
 */
export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: { id: string } }) {
  return <ProblemDetail id={params.id} remote={await problemsForPage()} />;
}
