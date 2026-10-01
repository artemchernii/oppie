#!/usr/bin/env node
// oppie.lab — the research collector.
//
//   pnpm research "your query"           search Brave, collect what comes back
//   pnpm research "one query" "another"  several queries, sequential
//   pnpm research --file batch.json      ingest a hand-made batch instead
//
// Two modes, one output: sources appended to research/inbox.json, deduped by URL.
//
// What this does NOT do, on purpose:
//   - it does not score anything;
//   - it does not decide what a source is about;
//   - it does not summarise.
// The `finding` it stores is the search result's own snippet, verbatim and possibly
// truncated. That is a lead, not a quote, which is why every collected source starts
// as `linkStatus: "unverified"`. Triage happens in the app at /inbox.
//
// Requires BRAVE_API_KEY, either exported or in .env.local (gitignored).

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const INBOX = path.join(ROOT, "research", "inbox.json");
const BRAVE_ENDPOINT = "https://api.search.brave.com/res/v1/web/search";

/** Minimal .env.local reader, so a key never has to be exported by hand. */
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

const urlKey = (url) =>
  String(url).trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/[?#].*$/, "").replace(/\/+$/, "");

const stripHtml = (text) => String(text).replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

const readJson = (file, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
};

function toSource(result, query, seen) {
  if (!result || typeof result.url !== "string" || !result.url.trim()) return null;
  const key = urlKey(result.url);
  if (!key || seen.has(key)) return null;
  seen.add(key);
  return {
    id: `src-${key.replace(/[^a-z0-9]+/g, "-").slice(0, 40)}`,
    url: result.url.trim(),
    title: stripHtml(result.title ?? ""),
    finding: stripHtml(result.description ?? ""),
    foundFor: query,
    collectedAt: new Date().toISOString(),
    status: "new",
    linkStatus: "unverified"
  };
}

async function search(query, apiKey, count) {
  const url = `${BRAVE_ENDPOINT}?q=${encodeURIComponent(query)}&count=${count}`;
  const response = await fetch(url, {
    headers: { Accept: "application/json", "X-Subscription-Token": apiKey }
  });
  if (response.status === 401 || response.status === 403 || response.status === 422) {
    // Brave answers 422 for a malformed or unsubscribed key, not just 401.
    const body = await response.text().catch(() => "");
    throw new Error(`Brave rejected the key (${response.status}). Check BRAVE_API_KEY. ${stripHtml(body).slice(0, 120)}`);
  }
  if (response.status === 429) {
    throw new Error("Brave rate limit hit (429). The free tier allows about one query per second.");
  }
  if (!response.ok) {
    throw new Error(`Brave returned ${response.status} ${response.statusText}`);
  }
  const payload = await response.json();
  return Array.isArray(payload?.web?.results) ? payload.web.results : [];
}

async function main() {
  loadEnvLocal();

  const args = process.argv.slice(2);
  const existing = readJson(INBOX, []);
  const seen = new Set(existing.map((source) => urlKey(source.url)));

  // ---- ingest mode ----
  const fileIndex = args.indexOf("--file");
  if (fileIndex !== -1) {
    const batchFile = args[fileIndex + 1];
    if (!batchFile) {
      console.error("usage: pnpm research --file batch.json");
      process.exit(1);
    }
    const batch = readJson(batchFile, null);
    if (!Array.isArray(batch)) {
      console.error(`${batchFile} is not a JSON array of sources`);
      process.exit(1);
    }
    const added = [];
    for (const raw of batch) {
      const source = toSource(
        { url: raw?.url, title: raw?.title, description: raw?.finding ?? raw?.description },
        raw?.foundFor ?? "(hand-made batch)",
        seen
      );
      if (source) {
        if (raw?.suggests) source.suggests = raw.suggests;
        added.push(source);
      }
    }
    fs.mkdirSync(path.dirname(INBOX), { recursive: true });
    fs.writeFileSync(INBOX, JSON.stringify([...existing, ...added], null, 2) + "\n");
    console.log(`batch     ${batch.length} entries from ${path.basename(batchFile)}`);
    console.log(`added     ${added.length} (rest were duplicates or unusable)`);
    console.log(`inbox now ${existing.length + added.length} → research/inbox.json`);
    return;
  }

  // ---- search mode ----
  const queries = args.filter((arg) => !arg.startsWith("--"));
  if (queries.length === 0) {
    console.error("usage: pnpm research \"your query\" [\"another query\"]");
    console.error("       pnpm research --file batch.json");
    console.error("");
    console.error("Needs BRAVE_API_KEY in .env.local or the environment.");
    process.exit(1);
  }

  const apiKey = process.env.BRAVE_API_KEY;
  if (!apiKey) {
    console.error("BRAVE_API_KEY is not set.\n");
    console.error("Put it in .env.local (gitignored):");
    console.error("  BRAVE_API_KEY=your-key-here");
    console.error("\nGet one at https://brave.com/search/api/");
    process.exit(1);
  }

  const added = [];
  for (const [index, query] of queries.entries()) {
    try {
      const results = await search(query, apiKey, 20);
      const collected = results.map((result) => toSource(result, query, seen)).filter(Boolean);
      added.push(...collected);
      console.log(`"${query}"\n  ${results.length} results · ${collected.length} new`);
    } catch (error) {
      console.error(`"${query}"\n  failed: ${error.message}`);
    }
    // The free tier allows roughly one query per second.
    if (index < queries.length - 1) await new Promise((resolve) => setTimeout(resolve, 1100));
  }

  fs.mkdirSync(path.dirname(INBOX), { recursive: true });
  fs.writeFileSync(INBOX, JSON.stringify([...existing, ...added], null, 2) + "\n");

  console.log(`\nadded     ${added.length} sources`);
  console.log(`inbox now ${existing.length + added.length} → research/inbox.json`);
  console.log("\nNothing was scored and nothing was attached. Triage at /inbox.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
