import ProblemDetail from "../../ProblemDetail";
import { problemsForPage } from "../../../lib/problemRemote";

/** Rendered per request as the signed-in person. A prerendered page would be one person's records. */
export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: { id: string } }) {
  const { problems, error } = await problemsForPage();
  return <ProblemDetail id={params.id} initial={problems} readError={error} />;
}
