import Ideas from "./Ideas";
import { readIdeaBoard } from "../lib/ideaRemote";

export const metadata = { title: "oppie.lab — ideas" };

/** Counts and decisions are read as the signed-in person on every request. */
export const dynamic = "force-dynamic";

export default async function Page() {
  return <Ideas board={await readIdeaBoard()} />;
}
