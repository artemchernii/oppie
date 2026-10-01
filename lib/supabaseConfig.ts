// oppie.lab — where the Supabase credentials come from, and whether they are usable.
//
// Deliberately dependency-free, like the rest of lib/, so the rules can be exercised in plain
// Node. The clients in lib/supabase/ are thin wrappers over this.
//
// Two keys, two jobs, and they are not interchangeable:
//
//   * the publishable key identifies the project and carries the signed-in user's token, so
//     Postgres applies RLS as that person. It is meant to be public.
//   * the secret key bypasses RLS entirely. It is for migrations and admin work and must never
//     reach a request that a browser can influence.
//
// Nothing here fails loudly at import time. Both clients refuse at construction instead, so a
// misconfigured deploy shows a clear error in one place rather than reading empty tables
// everywhere and looking like lost records.

export type SupabaseConfig = {
  /** URL + secret key. The privileged pair, for migrations and admin work. */
  configured: boolean;
  /** URL + publishable key. Enough to act as a signed-in user under RLS. */
  userConfigured: boolean;
  url: string;
  publishable: string;
  secret: string;
  /**
   * A publishable key sitting where the secret key belongs.
   *
   * Measured on 2026-10-01 against the live project: `42501 permission denied for table
   * problems`. The refusal arrives as an error rather than an empty list, because the migration
   * revokes `anon` instead of leaving the deny to RLS alone. This guard is still worth keeping,
   * for a smaller reason than "the failure is silent" — it fires before a request is made, with
   * a message that names the mistake.
   *
   * Only the `sb_publishable_` form is detected. A legacy `anon` key is a JWT and is
   * indistinguishable from `service_role` without decoding its `role` claim.
   */
  publishableKeyInSecretSlot: boolean;
};

export function supabaseConfig(env: Record<string, string | undefined> = process.env): SupabaseConfig {
  const url = env.SUPABASE_URL ?? "";
  const publishable = env.SUPABASE_PUBLISHABLE_KEY ?? "";
  const secret = env.SUPABASE_SECRET_KEY ?? "";
  return {
    configured: Boolean(url && secret),
    userConfigured: Boolean(url && publishable),
    url,
    publishable,
    secret,
    publishableKeyInSecretSlot: secret.startsWith("sb_publishable_")
  };
}
