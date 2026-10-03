import { NextResponse } from "next/server";
import { collectRun } from "../../../../../lib/discoveryRemote";

/** Collection makes several outside calls; give it room beyond the default. */
export const maxDuration = 60;

export async function POST(_request: Request, context: { params: { id: string } }) {
  const result = await collectRun(context.params.id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ summary: result.value });
}
