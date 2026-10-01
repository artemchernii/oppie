#!/usr/bin/env node
// oppie.lab — regenerate research/inbox.json from the typed seed.
//
// The typed seed in lib/research.ts is what the app renders; research/inbox.json is
// the collector's working file. This keeps the two from drifting: run it after editing
// the seed, and the collector starts from the same list the app is showing.

const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "..", ".tmp-test");
const { seedInbox } = require(path.join(OUT, "research.js"));
const TARGET = path.join(__dirname, "..", "research", "inbox.json");

fs.mkdirSync(path.dirname(TARGET), { recursive: true });
fs.writeFileSync(TARGET, JSON.stringify(seedInbox, null, 2) + "\n");
console.log(`wrote ${seedInbox.length} sources to research/inbox.json`);
