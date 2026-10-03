// oppie.lab — companies over Supabase.
//
// Server only, and read-only for now. It imports lib/supabase/server.ts, which carries the session
// cookie and acts as the signed-in person, so the read is evaluated by Postgres under the allowlist
// policy. The secret key is not used here; the one place it is used is `pnpm load:companies`, which
// is admin work and runs from a terminal.

import { companiesFromRows } from "./companySync";
import { seedCompanies, type Company } from "./problems";
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

/**
 * What the page renders from, and which store it came from.
 *
 * The fallback is the seeds, so a fresh clone with no migration applied still shows the researched
 * companies instead of a blank page. `source` is returned rather than inferred so the page can say
 * which one it is showing — a screen that quietly renders reference data while reading like the
 * database is the kind of thing this whole project keeps trying not to do.
 */
export async function companiesForPage(): Promise<{ companies: Company[]; source: "database" | "seed" }> {
  const result = await readRemoteCompanies();

  if (!result.ok) {
    console.error(`[companies] remote read unavailable: ${result.error}`);
    return { companies: seedCompanies, source: "seed" };
  }
  if (result.companies.length === 0) {
    console.error("[companies] the table is empty; run pnpm load:companies");
    return { companies: seedCompanies, source: "seed" };
  }
  return { companies: result.companies, source: "database" };
}
