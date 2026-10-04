import { NextResponse } from "next/server";
import { splitRun } from "../../../../../lib/discoveryRemote";

/** A model call over a few dozen sources can take a while. */
export const maxDuration = 120;

/**
 * Gateway auth: an explicit AI_GATEWAY_API_KEY, else the Vercel OIDC token. On Vercel the token
 * arrives on the request as `x-vercel-oidc-token`; locally it comes from `vercel env pull`.
 */
export async function POST(request: Request, context: { params: { id: string } }) {
  const token = process.env.AI_GATEWAY_API_KEY || request.headers.get("x-vercel-oidc-token") || process.env.VERCEL_OIDC_TOKEN || null;
  const result = await splitRun(context.params.id, token);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });
  return NextResponse.json({ split: result.value }, { status: 201 });
}
