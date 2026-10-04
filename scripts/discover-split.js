#!/usr/bin/env node
// oppie.lab — split a stored run into distinct pains, each with the businesses that sell a fix.
//
//   pnpm discover:split <run-id>          print the checked split, write nothing
//   pnpm discover:split <run-id> --save   also store each pain as a waiting proposal
//   pnpm discover:split <run-id> --from split.json   check a split written elsewhere instead of calling the gateway
//
// Needs SUPABASE_URL + SUPABASE_SECRET_KEY (.env.local) and AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN.
// ENV_FILE=<path> loads one extra env file (e.g. a fresh `vercel env pull` kept outside the repo).
// The model only suggests; checkSplit drops any citation or quote the stored sources don't support.

const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const lib = (name) => require(path.join(ROOT, ".tmp-test", `${name}.js`));
const { requestSplit, checkSplit, proposalsFromSplit, DEFAULT_SPLIT_MODEL } = lib("painSplit");
const { discoverySourceFromRow } = lib("discovery");

function loadEnv(file, override = false) {
  if (!file || !fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && (override || !process.env[m[1]])) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

async function main() {
  loadEnv(process.env.ENV_FILE, true);
  loadEnv(path.join(ROOT, ".env.local"));
  const runId = process.argv[2];
  const save = process.argv.includes("--save");
  if (!runId) { console.error("usage: pnpm discover:split <run-id> [--save]"); process.exit(1); }
  const { SUPABASE_URL: url, SUPABASE_SECRET_KEY: key } = process.env;
  const fromIndex = process.argv.indexOf("--from");
  const fromFile = fromIndex > 0 ? process.argv[fromIndex + 1] : null;
  const token = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;
  if (!url || !key) { console.error("SUPABASE_URL and SUPABASE_SECRET_KEY must be set."); process.exit(1); }
  if (!token && !fromFile) { console.error("Set AI_GATEWAY_API_KEY, or VERCEL_OIDC_TOKEN via ENV_FILE, or pass --from <file>."); process.exit(1); }
  const rest = async (method, table, query, body) => {
    const r = await fetch(`${url}/rest/v1/${table}${query}`, { method, headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=representation" }, body: body && JSON.stringify(body) });
    const text = await r.text();
    if (!r.ok) throw new Error(`${method} ${table}: ${r.status} ${text.slice(0, 200)}`);
    return text ? JSON.parse(text) : null;
  };

  const [run] = await rest("GET", "discovery_runs", `?id=eq.${encodeURIComponent(runId)}&select=*`);
  if (!run) throw new Error(`run ${runId} not found`);
  const sources = (await rest("GET", "discovery_sources", `?run_id=eq.${encodeURIComponent(runId)}&triage=neq.discarded&select=*`)).map(discoverySourceFromRow);
  console.log(`“${run.direction}” — ${sources.length} sources — ${fromFile ? `checking ${path.basename(fromFile)}` : `asking ${process.env.AI_GATEWAY_MODEL || DEFAULT_SPLIT_MODEL}`}…`);

  const started = Date.now();
  const suggested = fromFile
    ? { ok: true, value: JSON.parse(fs.readFileSync(fromFile, "utf8")) }
    : await requestSplit(run.direction, sources, token, (u, init) => fetch(u, init), process.env.AI_GATEWAY_MODEL || DEFAULT_SPLIT_MODEL);
  if (!suggested.ok) throw new Error(suggested.error);
  const report = checkSplit(suggested.value, sources);
  const byId = new Map(sources.map((s) => [s.id, s]));
  console.log(`model suggested ${suggested.value.pains.length} pains in ${Math.round((Date.now() - started) / 1000)}s; kept ${report.pains.length}. Dropped: ${JSON.stringify(report.dropped)}\n`);
  report.pains.forEach((pain, i) => {
    console.log(`${i + 1}. ${pain.name}${pain.who ? `  [who: ${pain.who}]` : ""}`);
    console.log(`   ${pain.description}`);
    for (const e of pain.evidence) console.log(`   pain  “${e.quote}”  — ${byId.get(e.sourceId).url.slice(0, 80)}`);
    for (const b of pain.businesses) console.log(`   sells ${b.name}: ${b.offer}${b.priceQuote ? ` (“${b.priceQuote}”)` : ""}  — ${byId.get(b.sourceId).url.slice(0, 70)}`);
    console.log("");
  });
  if (save) {
    const proposals = proposalsFromSplit(runId, report);
    if (proposals.length) await rest("POST", "discovery_proposals", "", proposals.map((p) => ({ id: p.id, run_id: p.runId, title: p.title, workflow: p.workflow, actor: p.actor ?? null, business_pattern: p.businessPattern ?? null, unknowns: p.unknowns, kill_reasons: p.killReasons, source_ids: p.sourceIds, company_ids: p.companyIds, status: p.status })));
    console.log(`stored ${proposals.length} pain proposal(s), waiting in /inbox`);
  }
}
main().catch((error) => { console.error(error.message); process.exit(1); });
