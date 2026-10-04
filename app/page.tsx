import Ideas from "./Ideas";
import { readIdeaBoard } from "../lib/ideaRemote";

export const metadata = { title: "oppie.lab — ideas" };

/** Counts and decisions are read as the signed-in person on every request. */
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: { region?: string } }) {
  // The owner is focusing on the UK (2026-10-04), so the board opens there; "all" shows the rest.
  const region = searchParams.region === "all" ? undefined : "UK";
  return <Ideas board={await readIdeaBoard()} region={region} />;
}
