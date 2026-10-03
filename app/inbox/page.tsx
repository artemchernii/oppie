import Inbox from "../Inbox";
import { readDiscoveryInbox } from "../../lib/discoveryRemote";
import { problemsForPage } from "../../lib/problemRemote";

export const metadata = { title: "oppie.lab — research inbox" };

/** Every record on this page is read from the database on each request. */
export const dynamic = "force-dynamic";

export default async function Page() {
  const [inbox, { problems }] = await Promise.all([readDiscoveryInbox(), problemsForPage()]);
  return (
    <Inbox
      initial={inbox.ok ? inbox.value : null}
      initialError={inbox.ok ? null : inbox.error}
      problems={problems.map((problem) => ({ id: problem.id, title: problem.title }))}
    />
  );
}
