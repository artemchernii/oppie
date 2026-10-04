// THROWAWAY SPIKE — time the sorter and estimate the human part.
const data = require("./generate");
const { categorise } = require("./categorise");
const SECONDS_PER_REVIEW = [30, 60];   // assumption: a trained person deciding one flagged row
const FIXED_MINUTES = [5, 10];          // assumption: open client, sanity-check totals, submit
const out = [];
for (const [key, { label, rows }] of Object.entries(data)) {
  const t0 = process.hrtime.bigint();
  const sorted = rows.map(categorise);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  const review = sorted.filter((r) => r.category === null);
  const caveats = sorted.filter((r) => r.note).length;
  const minutes = SECONDS_PER_REVIEW.map((s, i) => Math.round((review.length * s) / 60 + FIXED_MINUTES[i]));
  out.push({ key, label, rows: rows.length, auto: rows.length - review.length, review: review.length, autoPct: Math.round(((rows.length - review.length) / rows.length) * 100), ms: ms.toFixed(2), minutes, caveats, flagged: review.map((r) => r.payee) });
}
console.log(JSON.stringify(out, null, 1));
