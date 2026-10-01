// oppie.lab — Supabase acting as the signed-in person.
//
// This is the client that lets RLS do its job. It carries the publishable key plus the user's
// token from the session cookies, so Postgres evaluates every policy as that person. Nothing
// here can read a row the policies would not allow, which is the whole reason the app moved off
// a hand-rolled password: a shared secret has no identity for a policy to check, and this does.
//
// There is deliberately no browser client. Sign-in, sign-out and the OAuth exchange all happen
// in route handlers on the server, so no Supabase key needs to be inlined into a bundle and no
// NEXT_PUBLIC_ variable is required. The cost is one extra round trip on the sign-in link; the
// benefit is that the browser never holds a key at all.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { supabaseConfig } from "../supabaseConfig";

type PendingCookie = { name: string; value: string; options?: Record<string, unknown> };

/**
 * Builds the client and collects any cookie writes it makes.
 *
 * Writes are collected rather than applied through `cookies().set` so that a route handler can
 * attach them to the exact response it returns — the PKCE verifier set during sign-in has to
 * survive a redirect, and relying on implicit merging would make that depend on internals.
 * Server components never apply them: the middleware refreshes the session there instead.
 */
function build() {
  const { userConfigured, url, publishable } = supabaseConfig();

  if (!userConfigured) {
    throw new Error("SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must both be set");
  }

  const cookieStore = cookies();
  const pending: PendingCookie[] = [];

  const supabase = createServerClient(url, publishable, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        toSet.forEach((cookie) => pending.push(cookie as PendingCookie));
      }
    }
  });

  /** Attach every collected cookie to the response about to be returned. */
  const applyCookies = <T extends NextResponse>(response: T): T => {
    pending.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options as Parameters<T["cookies"]["set"]>[2]);
    });
    return response;
  };

  return { supabase, applyCookies };
}

/** For route handlers: sign-in, the OAuth exchange, sign-out. */
export const supabaseForRoute = build;

/**
 * Who the request belongs to, or null.
 *
 * `getUser` revalidates the token against Supabase rather than trusting the cookie's contents,
 * which costs a round trip and is the difference between believing a session and verifying one.
 */
export async function currentUser() {
  const { userConfigured } = supabaseConfig();
  if (!userConfigured) return null;
  const { supabase } = build();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}
