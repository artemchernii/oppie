import { NextResponse } from "next/server";
import { rejectDiscoveryProposal } from "../../../../../lib/discoveryRemote";

export async function POST(request: Request, context: { params: { id: string } }) {
  let body: { reason?: string };
  try {
    body = await request.json() as { reason?: string };
  } catch {
    return NextResponse.json({ error: "Request body must be JSON" }, { status: 400 });
  }

  const result = await rejectDiscoveryProposal(context.params.id, body.reason ?? "");
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ rejected: true });
}
