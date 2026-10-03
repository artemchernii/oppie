// oppie.lab — companies over Supabase.
//
// Server only, and read-only for now. It imports lib/supabase/server.ts, which carries the session
// cookie and acts as the signed-in person, so the read is evaluated by Postgres under the allowlist
// policy. The secret key is not used here; the one place it is used is `pnpm load:companies`, which
// is admin work and runs from a terminal.

import { companiesFromRows } from "./companySync";
import type { Company } from "./problems";
import { supabaseForRoute } from "./supabase/server";
import { supabaseConfig } from "./supabaseConfig";
import { isNextControlFlow, messageOf, reason } from "./supabaseResult";

export type CompaniesRead = { ok: true; companies: Company[] } | { ok: false; error: string };

/**
 * Every company, as the signed-in person.
 *
 * `ok: false` covers unconfigured, denied and failed alike, and it is deliberately not an empty
 * list: a caller that cannot tell "refused" from "none" will show an empty page as though it were
 * the truth.
 */
export async function readRemoteCompanies(): Promise<CompaniesRead> {
  if (!supabaseConfig().userConfigured) {
    return { ok: false, error: "SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are not both set" };
  }

  try {
    const { supabase } = supabaseForRoute();
    const { data, error } = await supabase.from("companies").select("*").order("country", { ascending: true }).order("name", { ascending: true });
    if (error) return { ok: false, error: reason(error) };
    return { ok: true, companies: companiesFromRows(data) };
  } catch (error) {
    if (isNextControlFlow(error)) throw error;
    return { ok: false, error: messageOf(error, "unknown read failure") };
  }
}

export type CompaniesPage = { companies: Company[]; error: string | null };

/**
 * What the page renders from. No fallback, for the same reason as problems: if the read fails, say
 * so. The database is the only store (`DECISIONS.md` #9).
 */
export async function companiesForPage(): Promise<CompaniesPage> {
  const result = await readRemoteCompanies();
  if (!result.ok) {
    console.error(`[companies] read failed: ${result.error}`);
    return { companies: [], error: result.error };
  }
  return { companies: result.companies, error: null };
}
