import { NextResponse } from "next/server";
import { generateRunProposals } from "../../../../../lib/discoveryRemote";

export async function POST(_request: Request, context: { params: { id: string } }) {
  const result = await generateRunProposals(context.params.id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ proposals: result.value }, { status: 201 });
}
