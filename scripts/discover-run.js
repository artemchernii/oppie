#!/usr/bin/env node
// oppie.lab — run real discovery for a direction and store it, exactly as the Run discovery button does.
//
//   pnpm discover:run "invoice chasing for small agencies"
//
// Admin work from a terminal, like `pnpm load:companies`: it writes with SUPABASE_SECRET_KEY, because
// the app's own route needs a signed-in browser session. It only ADDS: one run, its sources (all
// untriaged), and proposals waiting for review — split into distinct pains when AI Gateway is
// reachable (AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN), otherwise one combined proposal. It never
// accepts, rejects or scores anything — that stays a person's decision in /inbox. Delete the run
// row and everything under it goes too.

const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const lib = (name) => require(path.join(ROOT, ".tmp-test", `${name}.js`));
const { collect } = lib("collectors");
const { newDiscoveryRun, canonicalDiscoveryUrl } = lib("discovery");
const { generateDiscoveryProposals } = lib("proposals");
const { requestSplit, checkSplit, proposalsFromSplit, DEFAULT_SPLIT_MODEL } = lib("painSplit");

function loadEnvLocal() {
  const file = path.join(ROOT, ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

async function main() {
  loadEnvLocal();
  const direction = process.argv.slice(2).join(" ").trim();
  if (!direction) { console.error('usage: pnpm discover:run "a direction"'); process.exit(1); }
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) { console.error("SUPABASE_URL and SUPABASE_SECRET_KEY must both be set in .env.local."); process.exit(1); }
  if (key.startsWith("sb_publishable_")) { console.error("SUPABASE_SECRET_KEY holds a publishable key; every write would be refused."); process.exit(1); }

  const rest = async (method, table, query, body, prefer = "return=representation") => {
    const response = await fetch(`${url}/rest/v1/${table}${query}`, {
      method, headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: prefer },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`${method} ${table} failed: ${response.status} ${text.slice(0, 300)}`);
    return text ? JSON.parse(text) : null;
  };

  const run = newDiscoveryRun({ direction });
  await rest("POST", "discovery_runs", "", [{ id: run.id, direction: run.direction, status: "collecting", created_at: run.createdAt, updated_at: run.updatedAt }]);
  console.log(`run ${run.id} — collecting for “${run.direction}”`);

  const lanes = await collect(run.direction, (u, init) => fetch(u, init), process.env);
  const now = new Date().toISOString();
  const seen = new Set();
  const rows = [];
  for (const lane of lanes) {
    for (const source of lane.sources) {
      const canonical = canonicalDiscoveryUrl(source.url);
      if (!canonical || seen.has(canonical)) continue;
      seen.add(canonical);
      rows.push({
        id: `src-${crypto.randomUUID()}`, run_id: run.id, source_type: source.sourceType, signal_type: source.signalType,
        url: canonical, title: source.title, publisher: source.publisher ?? null, observed_at: source.observedAt ?? null,
        excerpt: source.excerpt, citation: source.citation ?? null, found_for: source.foundFor, link_status: "unverified",
        triage: "untriaged", created_at: now
      });
    }
    console.log(`  ${lane.lane.padEnd(8)} ${lane.provider.padEnd(8)} ${lane.error ? `FAILED: ${lane.error}` : `${lane.sources.length} found`}  (${lane.query})`);
  }

  if (lanes.every((lane) => lane.error)) {
    await rest("PATCH", "discovery_runs", `?id=eq.${run.id}`, { status: "failed", error: "every collector failed", updated_at: new Date().toISOString() });
    console.error("every collector failed; the run is stored as failed.");
    process.exit(1);
  }

  const saved = rows.length ? await rest("POST", "discovery_sources", "?on_conflict=run_id,url", rows, "resolution=ignore-duplicates,return=representation") : [];
  const sources = saved.map((row) => ({ id: row.id, runId: row.run_id, sourceType: row.source_type, signalType: row.signal_type, url: row.url, title: row.title, excerpt: row.excerpt, foundFor: row.found_for, linkStatus: row.link_status, triage: row.triage, createdAt: row.created_at }));
  const companies = (await rest("GET", "companies", "?select=id,url")).map((row) => ({ id: String(row.id), url: String(row.url ?? "") }));
  // Split into distinct pains first, exactly as the Run discovery button does. Only if that cannot
  // happen (no gateway token, gateway refusal, or no pain the sources support) fall back to one
  // combined proposal — and say why.
  let proposals = [];
  let how = "";
  const token = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;
  const model = process.env.AI_GATEWAY_MODEL || DEFAULT_SPLIT_MODEL;
  let whyNot = token ? "" : "no AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN";
  if (token && sources.length) {
    console.log(`splitting into pains with ${model}…`);
    const suggested = await requestSplit(run.direction, sources, token, (u, init) => fetch(u, init), model);
    if (!suggested.ok) whyNot = suggested.error;
    else {
      const report = checkSplit(suggested.value, sources);
      proposals = proposalsFromSplit(run.id, report);
      how = `split into ${proposals.length} pain(s); the checker dropped ${JSON.stringify(report.dropped)}`;
      if (!proposals.length) whyNot = "the model found no pain the sources support with quotes";
    }
  }
  if (!proposals.length) {
    proposals = generateDiscoveryProposals(run.id, sources, companies);
    how = `one combined proposal (pains not split: ${whyNot})`;
  }
  if (proposals.length) {
    await rest("POST", "discovery_proposals", "", proposals.map((p) => ({
      id: p.id, run_id: p.runId, title: p.title, workflow: p.workflow, actor: p.actor ?? null, business_pattern: p.businessPattern ?? null,
      unknowns: p.unknowns, kill_reasons: p.killReasons, source_ids: p.sourceIds, company_ids: p.companyIds, status: p.status
    })));
  }
  await rest("PATCH", "discovery_runs", `?id=eq.${run.id}`, { status: proposals.length ? "ready" : "collecting", error: null, updated_at: new Date().toISOString() });

  const by = (signal) => sources.filter((s) => s.signalType === signal).length;
  console.log(`\nstored ${sources.length} sources (pain ${by("pain")}, price ${by("price")}, budget ${by("budget")}, workflow ${by("workflow")}, context ${by("context")})`);
  console.log(`stored ${how}, waiting for your decision in /inbox`);
  for (const p of proposals) console.log(`  · ${p.title}${p.businessPattern ? `\n      ${p.businessPattern.slice(0, 160)}` : ""}`);
  console.log(`open: /discover?run=${run.id}`);
}

main().catch((error) => { console.error(error.message); process.exit(1); });
