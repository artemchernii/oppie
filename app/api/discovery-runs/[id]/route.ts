import { NextResponse } from "next/server";
import { readDiscoveryRun } from "../../../../lib/discoveryRemote";

export async function GET(_request: Request, context: { params: { id: string } }) {
  const result = await readDiscoveryRun(context.params.id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 404 });
  return NextResponse.json(result.value);
}
