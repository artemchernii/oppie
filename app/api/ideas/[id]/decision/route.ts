import { NextResponse } from "next/server";
import { saveIdeaDecision } from "../../../../../lib/ideaRemote";

export async function POST(request: Request, context: { params: { id: string } }) {
  let body: { status?: unknown; reason?: unknown };
  try {
    body = await request.json() as { status?: unknown; reason?: unknown };
  } catch {
    return NextResponse.json({ error: "Request body must be JSON" }, { status: 400 });
  }

  const result = await saveIdeaDecision(context.params.id, { status: body.status, reason: body.reason });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ decision: result.decision });
}
