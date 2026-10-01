import type { NextRequest } from "next/server";
import { updateSession } from "./lib/supabase/middleware";

/**
 * The one place every request passes through before a route renders.
 *
 * The matcher keeps static assets and the OAuth handshake out of it. Everything else — pages,
 * route handlers, server actions — is checked, so adding a screen cannot accidentally add an
 * unguarded one.
 */
export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt)$).*)"
  ]
};
