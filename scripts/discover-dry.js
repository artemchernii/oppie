#!/usr/bin/env node
// oppie.lab — run the real collectors for a direction and print what comes back. Writes nothing.
//
//   pnpm discover:dry "financial operations in European RIAs"
//
// Uses BRAVE_API_KEY from .env.local. This is how to see real data without touching the database.

const fs = require("fs");
const path = require("path");
const { collect } = require(path.join(__dirname, "..", ".tmp-test", "collectors.js"));

const env = { ...process.env };
const local = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(local)) {
  for (const line of fs.readFileSync(local, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !env[m[1]]) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const direction = process.argv.slice(2).join(" ").trim();
if (!direction) { console.error('usage: pnpm discover:dry "a direction"'); process.exit(1); }

(async () => {
  const lanes = await collect(direction, (url, init) => fetch(url, init), env);
  const all = lanes.flatMap((l) => l.sources);
  const count = (pred) => all.filter(pred).length;
  console.log(`\n${direction}\n${all.length} sources · pain ${count((s) => s.signalType === "pain")} · price ${count((s) => s.signalType === "price")} · budget ${count((s) => s.signalType === "budget")} · context ${count((s) => s.signalType === "context")} · workflow ${count((s) => s.signalType === "workflow")}`);
  for (const lane of lanes) {
    console.log(`\n[${lane.lane}] ${lane.provider}: ${lane.query}${lane.error ? `  — ERROR ${lane.error}` : `  — ${lane.sources.length}`}`);
    for (const s of lane.sources.slice(0, 4)) console.log(`  ${s.signalType.padEnd(8)} ${s.title.slice(0, 70)}\n           “${s.excerpt.slice(0, 150)}”\n           ${s.url.slice(0, 90)}`);
  }
})();
