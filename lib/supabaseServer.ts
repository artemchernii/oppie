// oppie.lab — the server-only Supabase client.
//
// Server-only in the strict sense: the key this carries bypasses RLS and can read and write
// every record. Call it from route handlers and server components. Never from a module
// marked "use client" — the guard below turns that mistake into a loud error instead of a
// leaked credential.
//
// Nothing in the app calls this yet. It exists so the first route that needs data has a
// single, gated way to get it, and so the failure modes are settled before any record
// depends on it.
//
// There are no generated database types: `supabase gen types` needs the Supabase CLI, which
// is not installed on this machine. Until then the client is untyped and the types in lib/
// are the contract. The SQL in supabase/migrations/ mirrors them.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseConfig } from "./supabaseConfig";

export function supabaseServer(
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
    // There is no signed-in user to hold a session for. The gate in lib/auth.ts owns
    // identity and Supabase cannot see its cookie, which is exactly why access is
    // server-only rather than policy-driven.
    auth: { persistSession: false, autoRefreshToken: false }
  });
}
