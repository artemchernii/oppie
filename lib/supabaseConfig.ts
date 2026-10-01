// oppie.lab — where the Supabase credentials come from, and whether they are usable.
//
// Deliberately dependency-free, like `authConfig` in lib/auth.ts, so the rules can be
// exercised in plain Node. `lib/supabaseServer.ts` is the thin client over this.
//
// Two properties matter, and both are tested:
//   - it fails CLOSED. With either value missing, nothing is configured and the server
//     client refuses to be built, rather than handing back a client whose every read comes
//     back empty. An empty app and a misconfigured app must not look the same.
//   - a publishable key in the secret slot is caught here. Measured against the live project,
//     that mistake is a hard `42501 permission denied` rather than a quiet empty list, because
//     the migration revokes `anon` explicitly instead of relying on RLS alone. Catching it here
//     still earns its place: it fires before a request goes out and names the actual mistake,
//     instead of leaving a Postgres permission error to be read as a schema problem.

export type SupabaseConfig = {
  configured: boolean;
  url: string;
  secret: string;
  /**
   * A publishable key sitting where the secret key belongs.
   *
   * Measured on 2026-10-01 against the live project: `42501 permission denied for table
   * problems`. The refusal arrives as an error, not as an empty result, because the migration
   * revokes `anon` rather than leaving the deny to RLS alone. That is the better outcome, and
   * this guard is worth keeping for a smaller reason than "the failure is silent" — it fires
   * before a request is made, with a message that names the mistake.
   *
   * The empty-result version of this failure is still real, and applies if the revoke is ever
   * dropped so that only RLS remains: then the denial becomes an empty list, and an empty list
   * reads as lost records.
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
