import { NextResponse } from "next/server";
import { supabaseForRoute } from "../../../lib/supabase/server";

/**
 * Finishes the handshake.
 *
 * GitHub sends the person back here with a one-time code. Exchanging it is what actually creates
 * the session, and the cookies that result are attached to this redirect rather than set
 * implicitly — the person is already leaving the page, so anything not on this response is lost.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const code = url.searchParams.get("code");

  if (!code) return NextResponse.redirect(`${origin}/login?error=missing-code`);

  try {
    const { supabase, applyCookies } = supabaseForRoute();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(`${origin}/login?error=exchange`);
    return applyCookies(NextResponse.redirect(`${origin}/`));
  } catch {
    return NextResponse.redirect(`${origin}/login?error=not-configured`);
  }
}
