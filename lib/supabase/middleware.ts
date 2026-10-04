// oppie.lab — the session refresh, and the actual boundary.
//
// Unlike the password gate this replaced, middleware runs before any route renders and cannot
// be skipped by a page that forgets to check. That is the whole difference: the old gate decided
// which screen to send, so a page's own server work still ran for a locked request. This runs
// first, for every matched path, and either refreshes the token or redirects.
//
// It also has to keep the session alive, not only check it. Supabase tokens expire; without the
// refresh in setAll a signed-in person would be thrown out mid-session with no explanation.

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfig } from "../supabaseConfig";

/** Reachable without a session, or there would be no way to obtain one. */
const OPEN_PATHS = ["/login", "/auth"];

const isOpen = (pathname: string) =>
  OPEN_PATHS.some((path) => pathname === path || pathname.startsWith(path + "/"));

export async function updateSession(request: NextRequest) {
  // When Supabase does not recognise the requested redirect it falls back to its Site URL, so the
  // one-time code can land on "/" instead of the callback. Hand it on rather than let the login
  // redirect below drop it.
  const stray = strayAuthCode(request);
  if (stray) return NextResponse.redirect(stray);

  let response = NextResponse.next({ request });

  // Only the isolated local Playwright server may bypass OAuth. This is never enabled in a
  // production build, and keeps browser tests focused on the discovery workflow rather than a
  // live GitHub callback.
  if (process.env.PLAYWRIGHT_TEST === "1" && process.env.NODE_ENV !== "production") return response;

  const { userConfigured, url, publishable } = supabaseConfig();
  // Unconfigured: let the pages explain themselves rather than redirecting in a loop.
  if (!userConfigured) return response;

  const supabase = createServerClient(url, publishable, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      }
    }
  });

  // Revalidated against Supabase, not read from the cookie. A tampered cookie fails here.
  const { data } = await supabase.auth.getUser();
  const user = data.user ?? null;
  const { pathname } = request.nextUrl;

  if (!user && !isOpen(pathname)) {
    const to = request.nextUrl.clone();
    to.pathname = "/login";
    to.search = "";
    return NextResponse.redirect(to);
  }

  // Already signed in: no reason to show the sign-in screen again.
  if (user && pathname === "/login") {
    const to = request.nextUrl.clone();
    to.pathname = "/";
    to.search = "";
    return NextResponse.redirect(to);
  }

  return response;
}

/** The callback URL for an OAuth code that arrived anywhere other than the callback, else null. */
export function strayAuthCode(request: NextRequest): URL | null {
  const { pathname, searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  if (!code || pathname.startsWith("/auth/")) return null;
  const to = request.nextUrl.clone();
  to.pathname = "/auth/callback";
  to.search = "";
  to.searchParams.set("code", code);
  return to;
}
