import Ideas from "./Ideas";
import { readIdeaBoard } from "../lib/ideaRemote";

export const metadata = { title: "oppie.lab — ideas" };

/** Counts and decisions are read as the signed-in person on every request. */
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: { region?: string } }) {
  const region = searchParams.region === "UK" ? "UK" : undefined;
  return <Ideas board={await readIdeaBoard()} region={region} />;
}
