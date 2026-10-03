import { NextResponse } from "next/server";
import { acceptDiscoveryProposal } from "../../../../../lib/discoveryRemote";

export async function POST(request: Request, context: { params: { id: string } }) {
  let body: { reason?: string; sourceIds?: string[]; problemId?: string };
  try {
    body = await request.json() as { reason?: string; sourceIds?: string[]; problemId?: string };
  } catch {
    return NextResponse.json({ error: "Request body must be JSON" }, { status: 400 });
  }

  const result = await acceptDiscoveryProposal(context.params.id, body.reason ?? "", body.sourceIds ?? [], body.problemId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ accepted: true, problemId: result.value.problemId, warning: result.value.warning });
}
