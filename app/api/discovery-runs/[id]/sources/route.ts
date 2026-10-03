import { NextResponse } from "next/server";
import { addDiscoverySource } from "../../../../../lib/discoveryRemote";
import type { DiscoverySourceInput } from "../../../../../lib/discovery";

export async function POST(request: Request, context: { params: { id: string } }) {
  let input: DiscoverySourceInput;
  try {
    input = await request.json() as DiscoverySourceInput;
  } catch {
    return NextResponse.json({ error: "Request body must be JSON" }, { status: 400 });
  }
  const result = await addDiscoverySource(context.params.id, input);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ source: result.value }, { status: 201 });
}
