// oppie.lab — the rules between a Supabase row and a Company record.
//
// Pure, like lib/problemSync.ts, so `pnpm test` can exercise the mapping and the repairs without a
// database. Both directions live here, so a rename cannot make the reader and the writer disagree.
//
// The one rule that is specific to companies: **`kind` decides what `amount` means.** An employer's
// figure is a salary, a vendor's is a price for software, a bespoke supplier's is a fee for the work
// done by hand. So a row whose `kind` is unusable is **dropped** rather than repaired — repairing it
// would put a price where a salary belongs, and the number would look perfectly fine.

import { moneyBases, type Company, type Confidence, type LinkStatus, type MoneyBasis } from "./problems";

export type Row = Record<string, unknown>;

const KINDS: Company["kind"][] = ["employer", "vendor", "bespoke"];
const CONFIDENCES: Confidence[] = ["direct", "reported", "inferred"];
const LINK_STATUSES: LinkStatus[] = ["checked", "dead", "unverified"];
const CURRENCIES: Company["currency"][] = ["USD", "GBP", "EUR", ""];

const isRow = (value: unknown): value is Row =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const text = (value: unknown): string => (typeof value === "string" ? value : "");

const oneOf = <T extends string>(value: unknown, allowed: readonly T[]): T | null => {
  const found = text(value);
  return (allowed as readonly string[]).indexOf(found) !== -1 ? (found as T) : null;
};

/** A country is two capital letters or nothing. Anything else is not a code and is not kept. */
const country = (value: unknown): string => (/^[A-Z]{2}$/.test(text(value)) ? text(value) : "");

/**
 * One `companies` row as a Company, or null when the row cannot be read as one.
 *
 * Text fields are repaired to empty rather than rejected — a missing location is a gap, not a
 * mistake. `kind`, `confidence` and `link_status` are not repairable: the first decides what the
 * money means and the other two are what the record asserts about its own evidence.
 */
export function companyFromRow(row: unknown): Company | null {
  if (!isRow(row)) return null;

  const id = text(row.id).trim();
  const name = text(row.name).trim();
  const kind = oneOf(row.kind, KINDS);
  const confidence = oneOf(row.confidence, CONFIDENCES);
  const linkStatus = oneOf(row.link_status, LINK_STATUSES);
  if (!id || !name || !kind || !confidence || !linkStatus) return null;

  const currency = oneOf(row.currency, CURRENCIES);
  const basis = oneOf(row.basis, moneyBases);

  return {
    id,
    name,
    kind,
    location: text(row.location),
    country: country(row.country),
    role: text(row.role),
    // Verbatim. Never parsed, never rounded, never converted.
    amount: text(row.amount),
    amountNote: text(row.amount_note),
    currency: currency === null || currency === undefined ? "" : currency,
    basis: (basis === null || basis === undefined ? "" : basis) as MoneyBasis,
    url: text(row.url),
    confidence,
    linkStatus
  };
}

/** Every row that could be read, in the order it arrived. Unreadable rows are dropped, not guessed at. */
export function companiesFromRows(rows: unknown): Company[] {
  if (!Array.isArray(rows)) return [];
  return rows.map(companyFromRow).filter((company): company is Company => company !== null);
}

/** The `companies` row for a Company. Explicit, so a rename cannot silently read `undefined`. */
export function companyRowFrom(company: Company): Row {
  return {
    id: company.id,
    name: company.name,
    kind: company.kind,
    location: company.location,
    country: company.country,
    role: company.role,
    amount: company.amount,
    amount_note: company.amountNote,
    currency: company.currency,
    basis: company.basis,
    url: company.url,
    confidence: company.confidence,
    link_status: company.linkStatus
  };
}
