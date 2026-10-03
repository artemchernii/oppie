import { NextResponse } from "next/server";
import { triageDiscoverySource } from "../../../../../lib/discoveryRemote";

export async function POST(request: Request, context: { params: { id: string } }) {
  let body: { triage?: "attached" | "discarded" };
  try {
    body = await request.json() as { triage?: "attached" | "discarded" };
  } catch {
    return NextResponse.json({ error: "Request body must be JSON" }, { status: 400 });
  }
  if (body.triage !== "attached" && body.triage !== "discarded") {
    return NextResponse.json({ error: "Triage must be attached or discarded" }, { status: 400 });
  }
  const result = await triageDiscoverySource(context.params.id, body.triage);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ triage: body.triage });
}
