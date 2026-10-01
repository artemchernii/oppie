// oppie.lab — where the Supabase credentials come from, and whether they are usable.
//
// Deliberately dependency-free, like `authConfig` in lib/auth.ts, so the rules can be
// exercised in plain Node. `lib/supabaseServer.ts` is the thin client over this.
//
// Two properties matter, and both are tested:
//   - it fails CLOSED. With either value missing, nothing is configured and the server
//     client refuses to be built, rather than handing back a client whose every read comes
//     back empty. An empty app and a misconfigured app must not look the same.
//   - a publishable key in the secret slot is caught here, because it is the one mistake
//     that produces no error at all: RLS denies the publishable key by design, so the
//     reads simply return nothing and the records look lost.

export type SupabaseConfig = {
  configured: boolean;
  url: string;
  secret: string;
  /**
   * A publishable key sitting where the secret key belongs. The database cannot complain
   * about this — it just denies every row — so it is caught here instead.
   *
   * Only the `sb_publishable_` form is detected. The legacy `anon` key is a JWT and is
   * indistinguishable from the legacy `service_role` key without decoding it and reading
   * the `role` claim, so a project still on legacy keys gets no warning from this.
   */
  publishableKeyInSecretSlot: boolean;
};

export function supabaseConfig(env: Record<string, string | undefined> = process.env): SupabaseConfig {
  const url = env.SUPABASE_URL ?? "";
  const secret = env.SUPABASE_SECRET_KEY ?? "";
  return {
    configured: Boolean(url && secret),
    url,
    secret,
    publishableKeyInSecretSlot: secret.startsWith("sb_publishable_")
  };
}
