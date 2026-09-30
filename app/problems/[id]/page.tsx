import { seedProblems } from "../../../lib/problems";
import ProblemDetail from "../../ProblemDetail";

/** Every seeded problem gets a real URL. Records created in the browser still resolve, they just render after hydration. */
export function generateStaticParams() {
  return seedProblems.map((problem) => ({ id: problem.id }));
}

export default function Page({ params }: { params: { id: string } }) {
  return <ProblemDetail id={params.id} />;
}
