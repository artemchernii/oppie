import { notFound } from "next/navigation";
import IdeaDetail from "../../IdeaDetail";
import { ideaById } from "../../../lib/ideas";
import { readIdeaDetail } from "../../../lib/ideaRemote";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { id: string } }) {
  const idea = ideaById(params.id);
  return { title: idea ? `${idea.title} — oppie.lab` : "Idea not found — oppie.lab" };
}

export default async function Page({ params }: { params: { id: string } }) {
  const detail = await readIdeaDetail(params.id);
  if (!detail) notFound();
  return <IdeaDetail detail={detail} />;
}
