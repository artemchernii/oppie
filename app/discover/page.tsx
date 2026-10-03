import Discovery from "../Discovery";
import { listDiscoveryRuns, readDiscoveryRun } from "../../lib/discoveryRemote";

export const dynamic = "force-dynamic";

/**
 * Reads from the database on every request. `?run=<id>` reopens a stored run, so a reload shows
 * the same run and nothing about it is held only in the browser.
 */
export default async function DiscoverPage({ searchParams }: { searchParams: { run?: string } }) {
  const runId = typeof searchParams.run === "string" ? searchParams.run : "";
  const [runResult, recent] = await Promise.all([
    runId ? readDiscoveryRun(runId) : Promise.resolve(null),
    listDiscoveryRuns()
  ]);
  return (
    <Discovery
      initial={runResult?.ok ? runResult.value : null}
      initialError={runResult && !runResult.ok ? runResult.error : null}
      recentRuns={recent.ok ? recent.value : []}
      recentRunsError={recent.ok ? null : recent.error}
    />
  );
}
