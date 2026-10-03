import { NextResponse } from "next/server";
import { readDiscoveryInbox } from "../../../lib/discoveryRemote";

export async function GET() {
  const result = await readDiscoveryInbox();
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 503 });
  return NextResponse.json(result.value);
}
