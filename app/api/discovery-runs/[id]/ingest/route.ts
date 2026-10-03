import { NextResponse } from "next/server";
import { addDiscoverySource, ingestReddit } from "../../../../../lib/discoveryRemote";
import { manualSourceInput } from "../../../../../lib/ingestion";

export async function POST(request: Request, context: { params: { id: string } }) {
  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Request body must be JSON" }, { status: 400 });
  }
  if (body.kind === "reddit") {
    const result = await ingestReddit(context.params.id, String(body.query ?? ""), typeof body.subreddit === "string" ? body.subreddit : undefined);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ sources: result.value }, { status: 201 });
  }
  if (body.kind !== "manual") return NextResponse.json({ error: "Ingestion kind must be reddit or manual" }, { status: 400 });
  try {
    const source = manualSourceInput({
      url: String(body.url ?? ""), title: String(body.title ?? ""), excerpt: String(body.excerpt ?? ""),
      foundFor: String(body.foundFor ?? ""), publisher: typeof body.publisher === "string" ? body.publisher : undefined,
      citation: typeof body.citation === "string" ? body.citation : undefined,
      signalType: typeof body.signalType === "string" ? body.signalType as never : undefined
    });
    const result = await addDiscoverySource(context.params.id, source);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ source: result.value }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid manual source" }, { status: 400 });
  }
}
