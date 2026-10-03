#!/usr/bin/env node
// oppie.lab — load the researched problems into the database, once.
//
//   pnpm load:problems          insert the ten, leaving any existing row exactly as it is
//   pnpm load:problems --force  overwrite rows that already exist
//
// After this runs, the database is the only place a problem lives. The seed file stays as the
// starting point and as the record of what the method was built against, but nothing reads it at
// runtime any more — which is the whole point: one store, and nobody has to think about which one.
//
// A row that already exists is left alone unless `--force`, so running this cannot undo an edit made
// in the app.
//
// Needs SUPABASE_SECRET_KEY. Admin work only — never call this from anything a browser drives.

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const MODEL = path.join(ROOT, ".tmp-test", "problems.js");
const SYNC = path.join(ROOT, ".tmp-test", "problemSync.js");

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

async function main() {
  loadEnvLocal();

  if (!fs.existsSync(MODEL) || !fs.existsSync(SYNC)) {
    console.error(`${MODEL} or ${SYNC} is missing. Run: pnpm test   (it compiles lib/ into .tmp-test/)`);
    process.exit(1);
  }

  const { seedProblems } = require(MODEL);
  const { problemRowFrom, signalRowsFrom, evidenceRowsFrom, companyLinkRowsFrom } = require(SYNC);

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

  const write = async (table, body, query) => {
    const response = await fetch(`${url}/rest/v1/${table}${query}`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: prefer },
      body: JSON.stringify(body)
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`${table}: ${response.status} ${text.slice(0, 300)}`);
    return JSON.parse(text);
  };

  // Parents first, so the children's foreign keys resolve.
  const insertedProblems = await write("problems", seedProblems.map(problemRowFrom), "?on_conflict=id&select=id");
  const landedIds = new Set(insertedProblems.map((row) => row.id));
  const landed = force ? seedProblems : seedProblems.filter((problem) => landedIds.has(problem.id));

  // Everything else is written for **every** problem, additively, with `ignore-duplicates`: a row
  // that already exists is left exactly as it is, and only missing rows are added.
  //
  // This is deliberately additive rather than ignoring rows that already exist, because two records
  // stored before today were truncated to their first three evidence rows: `P-001` had `e1-e3` of
  // seven and `P-006` had `e1-e3` of six. Two records cut at the same boundary is a snapshot taken
  // before the research pass that added the rest, not five hand-deletions, and the remedy for the
  // unlikely other explanation is to delete the row again.
  const signals = seedProblems.flatMap(signalRowsFrom);
  const evidence = seedProblems.flatMap(evidenceRowsFrom);
  const links = seedProblems.flatMap(companyLinkRowsFrom);

  if (signals.length) await write("problem_signals", signals, "?on_conflict=problem_id,key&select=problem_id");
  if (evidence.length) await write("problem_evidence", evidence, "?on_conflict=id&select=id");
  if (links.length) await write("problem_companies", links, "?on_conflict=problem_id,company_id&select=problem_id");

  console.log(`problems offered   ${seedProblems.length}`);
  console.log(`rows written       ${landed.length}${force ? " (--force: existing rows overwritten)" : " (existing rows left alone)"}`);
  console.log(`rows skipped       ${seedProblems.length - landed.length}`);
  console.log(`signals  ${signals.length}   evidence ${evidence.length}   company links ${links.length}`);
  console.log("\nThe database is now the only store for problems.");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
