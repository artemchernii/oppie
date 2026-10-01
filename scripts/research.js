#!/usr/bin/env node
// oppie.lab — the research ingest step.
//
//   pnpm research <file.json>
//
// Takes a batch of collected sources, drops anything already in the inbox, and merges
// the rest into research/inbox.json. It does not search, and it does not score: a
// search provider would need an API key this repo does not hold, and scoring is a
// judgement, which belongs to a person.
//
// The batch format is a JSON array of { url, title, finding, foundFor, suggests? }.
// Only `url` is required, and a source with no `finding` is still kept — an empty
// finding is honest, an invented one is not.

const fs = require("fs");
const path = require("path");

const INBOX = path.join(__dirname, "..", "research", "inbox.json");

const urlKey = (url) =>
  String(url).trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/[?#].*$/, "").replace(/\/+$/, "");

const readJson = (file, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
};

const batchFile = process.argv[2];
if (!batchFile) {
  console.error("usage: pnpm research <batch.json>");
  console.error("  batch.json is an array of { url, title, finding, foundFor, suggests? }");
  process.exit(1);
}

const batch = readJson(batchFile, null);
if (!Array.isArray(batch)) {
  console.error(`${batchFile} is not a JSON array of sources`);
  process.exit(1);
}

const existing = readJson(INBOX, []);
const seen = new Set(existing.map((source) => urlKey(source.url)));

const added = [];
const skipped = [];
const malformed = [];

for (const [index, raw] of batch.entries()) {
  if (!raw || typeof raw.url !== "string" || !raw.url.trim()) {
    malformed.push(index);
    continue;
  }
  const key = urlKey(raw.url);
  if (seen.has(key)) {
    skipped.push(raw.url);
    continue;
  }
  seen.add(key);
  added.push({
    id: `src-${key.replace(/[^a-z0-9]+/g, "-").slice(0, 40)}`,
    url: raw.url.trim(),
    title: typeof raw.title === "string" ? raw.title : "",
    finding: typeof raw.finding === "string" ? raw.finding : "",
    foundFor: typeof raw.foundFor === "string" ? raw.foundFor : "",
    suggests: typeof raw.suggests === "string" ? raw.suggests : undefined,
    collectedAt: new Date().toISOString(),
    status: "new",
    linkStatus: "unverified"
  });
}

fs.mkdirSync(path.dirname(INBOX), { recursive: true });
fs.writeFileSync(INBOX, JSON.stringify([...existing, ...added], null, 2) + "\n");

console.log(`read      ${batch.length} sources from ${path.basename(batchFile)}`);
console.log(`added     ${added.length}`);
console.log(`already   ${skipped.length} (same URL, not duplicated)`);
if (malformed.length) console.log(`rejected  ${malformed.length} with no usable url`);
console.log(`inbox now ${existing.length + added.length} → research/inbox.json`);
console.log("\nNothing was scored and nothing was attached. Triage happens in the app, at /inbox.");
