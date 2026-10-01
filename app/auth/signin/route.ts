import { NextResponse } from "next/server";
import { supabaseForRoute } from "../../../lib/supabase/server";

/**
 * Starts the GitHub handshake.
 *
 * A plain link rather than a button wired to a client-side Supabase instance, so no key is ever
 * inlined into the bundle. `redirectTo` is where GitHub sends the code back to, and the PKCE
 * verifier set during this call has to survive the round trip — which is why the cookies it
 * writes are attached to this redirect explicitly rather than left to be merged.
 */
export async function GET(request: Request) {
  const origin = new URL(request.url).origin;

  try {
    const { supabase, applyCookies } = supabaseForRoute();

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: `${origin}/auth/callback` }
    });

    if (error || !data.url) {
      return NextResponse.redirect(`${origin}/login?error=oauth`);
    }

    return applyCookies(NextResponse.redirect(data.url));
  } catch {
    return NextResponse.redirect(`${origin}/login?error=not-configured`);
  }
}
