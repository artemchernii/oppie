import ProblemDetail from "../../ProblemDetail";
import { readProblemDiscoveryTrail } from "../../../lib/discoveryRemote";
import { playwrightFixturesActive, playwrightProblems, playwrightTrail } from "../../../lib/playwrightFixtures";
import { problemsForPage, ratingsForPage } from "../../../lib/problemRemote";

/** Rendered per request as the signed-in person. A prerendered page would be one person's records. */
export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: { id: string } }) {
  if (playwrightFixturesActive()) {
    return <ProblemDetail id={params.id} initial={playwrightProblems()} readError={null} initialRatings={[]} ratingsError={null} trail={playwrightTrail(params.id)} trailError={null} />;
  }
  const [{ problems, error }, { ratings, error: ratingsError }, trail] = await Promise.all([problemsForPage(), ratingsForPage(), readProblemDiscoveryTrail(params.id)]);
  return (
    <ProblemDetail
      id={params.id}
      initial={problems}
      readError={error}
      initialRatings={ratings}
      ratingsError={ratingsError}
      trail={trail.ok ? trail.value : []}
      trailError={trail.ok ? null : trail.error}
    />
  );
}
