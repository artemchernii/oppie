import Inbox from "../Inbox";
import { problemsForPage } from "../../lib/problemRemote";

export const metadata = { title: "oppie.lab — research inbox" };

/** The inbox's own records are still browser-local; the problem list it points into is not. */
export const dynamic = "force-dynamic";

export default async function Page() {
  const { problems } = await problemsForPage();
  return <Inbox initial={problems} />;
}
