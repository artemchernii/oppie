#!/usr/bin/env node
// oppie.lab — load the researched companies into the database, once.
//
//   pnpm load:companies          insert the 21, leaving existing rows alone
//   pnpm load:companies --force  overwrite rows that already exist
//
// The 21 companies in `lib/problems.ts` are research findings that happen to live in code, not
// placeholders, so they belong in the table. This is the one-way door: afterwards the database is
// the record and `lib/problems.ts` is only the starting point. `DECISIONS.md` #7.
//
// It reads the compiled model rather than repeating the rows in SQL, so there is one copy of the
// data and nothing to drift. Without `--force` an existing row is left exactly as it is, so running
// this twice cannot undo an edit made in the app.
//
// Needs SUPABASE_SECRET_KEY. Admin work only — never call this from anything a browser drives.

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const MODEL = path.join(ROOT, ".tmp-test", "problems.js");

function loadEnvLocal() {
  const file = path.join(ROOT, ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const value = match[2].replace(/^["']|["']$/g, "");
    if (!process.env[match[1]]) process.env[match[1]] = value;
  }
}

/** The `companies` row for a Company. Explicit, like lib/problemSync.ts, so a rename cannot hide. */
const rowFrom = (company) => ({
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
});

async function main() {
  loadEnvLocal();

  if (!fs.existsSync(MODEL)) {
    console.error(`${MODEL} is missing. Run: pnpm test   (it compiles lib/ into .tmp-test/)`);
    process.exit(1);
  }

  const { seedCompanies } = require(MODEL);
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    console.error("SUPABASE_URL and SUPABASE_SECRET_KEY must both be set, in .env.local or the environment.");
    process.exit(1);
  }
  if (key.startsWith("sb_publishable_")) {
    console.error("SUPABASE_SECRET_KEY holds a publishable key. RLS would refuse every row and the load would look silently empty.");
    process.exit(1);
  }

  const force = process.argv.includes("--force");
  const prefer = force ? "resolution=merge-duplicates,return=representation" : "resolution=ignore-duplicates,return=representation";

  const response = await fetch(`${url}/rest/v1/companies?on_conflict=id&select=id`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: prefer
    },
    body: JSON.stringify(seedCompanies.map(rowFrom))
  });

  const body = await response.text();
  if (!response.ok) {
    console.error(`load failed: ${response.status} ${body.slice(0, 300)}`);
    process.exit(1);
  }

  const written = JSON.parse(body).length;
  console.log(`companies offered   ${seedCompanies.length}`);
  console.log(`rows written        ${written}${force ? " (--force: existing rows overwritten)" : " (existing rows left alone)"}`);
  console.log(`rows skipped        ${seedCompanies.length - written}`);
  console.log("\nRead them back at /companies once the page reads from the database.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
