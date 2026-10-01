// oppie.lab — reading the session during a request.
//
// The Next-shaped half of the gate: lib/auth.ts holds the rules and is plain Node, this file
// is the two lines that touch `next/headers`. Same split as lib/persistence.ts and
// lib/store.ts, and for the same reason — the part that can be tested has no framework in it.
//
// Reading cookies() opts the route into dynamic rendering, which is exactly right: a cached
// page must never be served past the gate.

import { cookies } from "next/headers";
import { SESSION_COOKIE, authConfig, verifySession } from "./auth";

/**
 * Whether the request carries a session this app can verify.
 *
 * Fails closed twice over: an unconfigured deploy answers false, and so does a missing, stale,
 * tampered or wrongly-signed cookie. Every path that reads a record is expected to call this
 * first. The layout calls it too, but for the screen rather than the data — Next renders a
 * route's page independently of its layout, so a layout check is presentation, not a boundary.
 */
export function hasValidSession(now = Date.now()): boolean {
  const { configured, secret } = authConfig();
  if (!configured) return false;
  return verifySession(cookies().get(SESSION_COOKIE)?.value, secret, now);
}
