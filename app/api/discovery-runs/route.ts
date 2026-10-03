import { NextResponse } from "next/server";
import { createDiscoveryRun } from "../../../lib/discoveryRemote";
import type { DiscoveryInput } from "../../../lib/discovery";

export async function POST(request: Request) {
  let input: DiscoveryInput;
  try {
    input = await request.json() as DiscoveryInput;
  } catch {
    return NextResponse.json({ error: "Request body must be JSON" }, { status: 400 });
  }

  const result = await createDiscoveryRun(input);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ run: result.value }, { status: 201 });
}
