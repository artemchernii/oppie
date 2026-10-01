// oppie.lab — the two ways a session begins and ends.
//
// There is no sign-up, no reset and no user table: one password, one signed cookie. Both
// handlers answer with the same shape so the client has one thing to read, and neither says
// anything about the password itself beyond whether it matched.

import { NextResponse } from "next/server";
import { clearedCookie, loginOutcome } from "../../../lib/auth";

/** A Secure cookie would be dropped over plain http, which is every local dev request. */
const isSecure = (request: Request) => new URL(request.url).protocol === "https:";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";

  const outcome = loginOutcome(password, process.env, Date.now(), isSecure(request));

  if (!outcome.ok) {
    // 503 for a missing APP_PASSWORD/APP_SECRET, 401 for a wrong password. The difference
    // matters to the person locked out: one is a typo, the other is a deploy setting.
    const status = outcome.reason === "unconfigured" ? 503 : 401;
    return NextResponse.json({ ok: false, reason: outcome.reason }, { status });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(outcome.cookie.name, outcome.cookie.value, outcome.cookie.options);
  return response;
}

export async function DELETE() {
  const { name, value, options } = clearedCookie();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(name, value, { ...options, secure: false });
  return response;
}
