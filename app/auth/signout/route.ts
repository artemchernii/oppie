import { NextResponse } from "next/server";
import { supabaseForRoute } from "../../../lib/supabase/server";

/**
 * Signs out. A form posts here, so this works with JavaScript switched off, and the 303 tells the
 * browser to follow with a GET — a 307 would repeat the POST and sign out again on refresh.
 */
export async function POST(request: Request) {
  try {
    const { supabase, applyCookies } = supabaseForRoute();
    await supabase.auth.signOut();
    return applyCookies(NextResponse.redirect(new URL("/login", request.url), 303));
  } catch {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }
}
