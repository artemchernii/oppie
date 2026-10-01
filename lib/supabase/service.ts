// oppie.lab — the server-only Supabase client for privileged work.
//
// Named "service" rather than "server" to keep it apart from lib/supabase/server.ts, which is a
// different thing: that one acts as the signed-in person and is subject to RLS, this one acts as
// nobody and is subject to nothing.
//
// Server-only in the strict sense: the key this carries bypasses every policy. Call it from
// migrations, scripts and admin routes. Never from anything a signed-in user drives, and never
// from a module marked "use client" — the guard below turns that mistake into an error rather
// than a leaked credential.
//
// Nothing calls this yet. When the allowlist lands it will be what inserts the one row.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseConfig } from "../supabaseConfig";

export function supabaseService(
  env: Record<string, string | undefined> = process.env
): SupabaseClient {
  if (typeof window !== "undefined") {
    throw new Error("refusing to build the privileged Supabase client in a browser");
  }

  const { configured, url, secret, publishableKeyInSecretSlot } = supabaseConfig(env);

  if (!configured) {
    throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY must both be set");
  }

  if (publishableKeyInSecretSlot) {
    throw new Error(
      "SUPABASE_SECRET_KEY holds a publishable key; RLS would deny every read, and an empty result would look like missing data"
    );
  }

  return createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}
