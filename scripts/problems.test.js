// oppie.lab — problem-record storage rules.
//
// The assertion that matters most is the first one: a checked zero and an unchecked
// blank are different, and collapsing them would silently turn a missing check into a
// zero score. Everything else protects the same promise from a different angle.

const assert = require("assert");
const path = require("path");

const OUT = path.join(__dirname, "..", ".tmp-test");
const problems = require(path.join(OUT, "problems.js"));
const store = require(path.join(OUT, "problemPersistence.js"));
const sync = require(path.join(OUT, "problemSync.js"));

let passed = 0;
let failed = 0;

const test = (name, fn) => {
  try {
    fn();
    passed += 1;
    console.log("PASS  " + name);
  } catch (error) {
    failed += 1;
    console.log("FAIL  " + name + "\n      " + error.message);
  }
};

const first = () => JSON.parse(JSON.stringify(problems.seedProblems[0]));

test("an unchecked signal stays null rather than becoming zero", () => {
  const blanks = problems.blankSignals();
  assert.strictEqual(blanks.length, problems.signalDefs.length);
  assert.ok(blanks.every((signal) => signal.value === null));
  const clean = problems.emptyProblem("P-999");
  assert.strictEqual(problems.readiness(clean).unchecked, problems.signalDefs.length);
  assert.strictEqual(problems.readiness(clean).total, 0);
});

test("readiness counts blanks and never treats them as zero", () => {
  const problem = first();
  problem.signals = problem.signals.map((signal, index) => ({ ...signal, value: index < 2 ? 3 : null, note: index < 2 ? "cited" : "" }));
  const r = problems.readiness(problem);
  assert.strictEqual(r.total, 6);
  assert.strictEqual(r.checked, 2);
  assert.strictEqual(r.unchecked, 3);
  assert.strictEqual(r.max, problems.SIGNAL_MAX);
});

test("a fully checked record outranks the same gate carrying blanks", () => {
  const full = first();
  full.id = "P-full";
  full.signals = full.signals.map((signal) => ({ ...signal, value: 2, note: "cited" }));
  const partial = first();
  partial.id = "P-partial";
  partial.signals = partial.signals.map((signal) => ({ ...signal, value: 3, note: "cited" }));
  partial.signals[0] = { ...partial.signals[0], value: null, note: "" };

  const ordered = problems.rankProblems([partial, full]);
  assert.strictEqual(ordered[0].id, "P-full", "10/15 with nothing missing beats 12/15 with a blank");
});

test("a further gate always outranks a closer one", () => {
  const early = first();
  early.id = "P-early";
  early.gate = "G1-signal";
  early.signals = early.signals.map((signal) => ({ ...signal, value: 3, note: "cited" }));
  const later = first();
  later.id = "P-later";
  later.gate = "G5-tested";
  later.signals = later.signals.map((signal) => ({ ...signal, value: null, note: "" }));

  const ordered = problems.rankProblems([early, later]);
  assert.strictEqual(ordered[0].id, "P-later");
});

test("a numeric string is not accepted as a score", () => {
  assert.strictEqual(store.normalizeScore("0"), null);
  assert.strictEqual(store.normalizeScore("3"), null);
  assert.strictEqual(store.normalizeScore(true), null);
  assert.strictEqual(store.normalizeScore(null), null);
});

test("out-of-range and non-finite scores degrade to blank, not to a clamp", () => {
  assert.strictEqual(store.normalizeScore(4), null);
  assert.strictEqual(store.normalizeScore(-1), null);
  assert.strictEqual(store.normalizeScore(2.4), 2);
  assert.strictEqual(store.normalizeScore(Infinity), null);
  assert.strictEqual(store.normalizeScore(NaN), null);
});

test("signals are rebuilt from the definitions, so an unknown key is dropped", () => {
  const repaired = store.normalizeSignals([
    { key: "moat", value: 2, note: "kept" },
    { key: "invented-dimension", value: 3, note: "must not survive" }
  ]);
  assert.deepStrictEqual(
    repaired.map((signal) => signal.key),
    problems.signalDefs.map((def) => def.key)
  );
  assert.strictEqual(repaired.find((signal) => signal.key === "moat").value, 2);
  assert.ok(!repaired.some((signal) => signal.key === "invented-dimension"));
  assert.strictEqual(repaired.filter((signal) => signal.value === null).length, problems.signalDefs.length - 1);
});

test("a missing signals array is repaired to all-blank rather than left undefined", () => {
  const repaired = store.normalizeSignals(undefined);
  assert.strictEqual(repaired.length, problems.signalDefs.length);
  assert.ok(repaired.every((signal) => signal.value === null && signal.note === ""));
});

test("an unrecognised gate falls back instead of rendering an empty chip", () => {
  const problem = store.normalizeProblem({ id: "x", gate: "G99-nonsense", verdict: "maybe" }, 0);
  assert.strictEqual(problem.gate, "G1-signal");
  assert.strictEqual(problem.verdict, "open");
});

test("a partial record is repaired field by field, missing text becomes empty", () => {
  const repaired = store.normalizeProblem({ id: "partial", title: "Only a title" }, 0);
  assert.strictEqual(repaired.title, "Only a title");
  assert.strictEqual(repaired.buyer, "");
  assert.strictEqual(repaired.killReason, "");
  assert.strictEqual(repaired.evidence.length, 0);
  assert.strictEqual(repaired.signals.length, problems.signalDefs.length);
});

test("an unknown evidence confidence is not accepted as a real one", () => {
  const evidence = store.normalizeEvidence({ observation: "x", confidence: "certain" }, "e1");
  assert.strictEqual(evidence.confidence, "inferred");
  const none = store.normalizeEvidence({ observation: "x" }, "e2");
  assert.strictEqual(none.confidence, "inferred");
});

test("freshProblemSeed returns a copy, so an edit cannot mutate the seed constant", () => {
  const seedPain = problems.seedProblems[0].signals[0].value;
  assert.strictEqual(seedPain, 3, "P-001 starts with a cited pain score of 3");
  const copy = store.freshProblemSeed();
  copy[0].title = "mutated";
  copy[0].signals[0].value = 0;
  assert.notStrictEqual(problems.seedProblems[0].title, "mutated");
  assert.strictEqual(problems.seedProblems[0].signals[0].value, 3);
});

test("id allocation never collides with an existing record", () => {
  const existing = problems.seedProblems;
  const id = store.nextProblemId(existing);
  assert.ok(!existing.some((problem) => problem.id === id), "allocated id must be free");
  assert.ok(/^P-\d{3}$/.test(id));
});

test("every seeded problem carries a note for each answered signal", () => {
  const uncited = [];
  for (const problem of problems.seedProblems) {
    for (const signal of problem.signals) {
      if (signal.value !== null && !signal.note.trim()) uncited.push(`${problem.id}/${signal.key}`);
    }
  }
  assert.deepStrictEqual(uncited, [], "an answered question without a reason is a guess");
});

test("every seeded problem names at most one buyer and a stage the app knows", () => {
  for (const problem of problems.seedProblems) {
    assert.ok(problems.gates.includes(problem.gate), `${problem.id} has an unknown gate`);
    assert.ok(problems.actions.includes(problem.action), `${problem.id} has an unknown action`);
    assert.ok(problems.verdicts.includes(problem.verdict), `${problem.id} has an unknown verdict`);
    assert.ok(!problem.buyer.includes("/"), `${problem.id} names more than one buyer`);
  }
});

test("a record whose gate is G2 or beyond has a paid-today sentence", () => {
  for (const problem of problems.seedProblems) {
    if (problem.gate === "G1-signal") continue;
    assert.ok(problem.paidToday.trim().length > 0, `${problem.id} passed G2 without saying who pays`);
  }
});

test("every company declares whether its link still opens", () => {
  const allowed = ["checked", "dead", "unverified"];
  for (const company of problems.seedCompanies) {
    assert.ok(allowed.includes(company.linkStatus), `${company.name} has linkStatus "${company.linkStatus}"`);
  }
});

test("nothing claims to be read at source unless its link actually resolved", () => {
  const offenders = [];
  for (const company of problems.seedCompanies) {
    if (company.confidence === "direct" && company.linkStatus !== "checked") offenders.push(company.name);
  }
  for (const problem of problems.seedProblems) {
    for (const item of problem.evidence) {
      if (item.confidence === "direct" && item.linkStatus !== "checked") offenders.push(`${problem.id}/${item.id}`);
    }
  }
  assert.deepStrictEqual(offenders, [], "direct means read on the page, which requires the link to open");
});

test("a dead link is never also claiming to be verified", () => {
  for (const company of problems.seedCompanies) {
    if (company.linkStatus === "dead") {
      assert.notStrictEqual(company.confidence, "direct", `${company.name} is dead but claims direct`);
    }
  }
});

test("problem company references all resolve", () => {
  const ids = new Set(problems.seedCompanies.map((company) => company.id));
  for (const problem of problems.seedProblems) {
    for (const id of problem.companyIds) assert.ok(ids.has(id), `${problem.id} points at a missing company ${id}`);
  }
});

// ---------------------------------------------------------------------------
// The hydration contract, and what is allowed to leave the browser.
//
// lib/problemSync.ts is the React-free half of lib/problemStore.ts: the same two decisions,
// exercisable without a browser or a running database. The first is the merge that happens after
// mount — the thing whose ordering is the difference between reading a record and eating it. The
// second is the cutover, which pushes the browser's own work up exactly once and must never push
// the reference data.

/** A usable Problem, distinct from any seed, for merge tests. */
const syncProblem = (id, title) => {
  const problem = problems.emptyProblem(id);
  problem.title = title;
  return problem;
};

/** A `problems` row as PostgREST returns it: snake_case, and nothing else. */
const syncRow = (id, title) => ({
  id,
  title,
  gate: "G1-signal",
  action: "idle",
  verdict: "open",
  path: "undecided",
  created_at: "2026-10-01T00:00:00.000Z",
  updated_at: "2026-10-01T00:00:00.000Z"
});

test("a blank signal read from the database stays blank, not a zero", () => {
  const read = sync.problemsFromRemote(
    [syncRow("P-900", "Remote")],
    [{ problem_id: "P-900", key: "pay", value: null, note: "" }],
    [],
    []
  );
  assert.strictEqual(read.length, 1);
  assert.strictEqual(read[0].signals.find((signal) => signal.key === "pay").value, null);
  assert.strictEqual(read[0].signals.find((signal) => signal.key === "pain").value, null);
});

test("a checked zero read from the database stays zero, not blank", () => {
  const read = sync.problemsFromRemote(
    [syncRow("P-900", "Remote")],
    [{ problem_id: "P-900", key: "moat", value: 0, note: "checked: no moat at all" }],
    [],
    []
  );
  assert.strictEqual(read[0].signals.find((signal) => signal.key === "moat").value, 0);
});

test("a database score outside 0-3 degrades to blank rather than being clamped", () => {
  const read = sync.problemsFromRemote([syncRow("P-900", "Remote")], [{ problem_id: "P-900", key: "pain", value: 7, note: "bad" }], [], []);
  assert.strictEqual(read[0].signals.find((signal) => signal.key === "pain").value, null);
});

test("a database row with no id is dropped, not repaired into a record that does not exist", () => {
  assert.deepStrictEqual(sync.problemsFromRemote([{ title: "no id" }], [], [], []), []);
});

test("a procurement document and its link status survive a round trip through the database", () => {
  const source = syncProblem("P-011", "Round trip");
  source.evidence = [
    { id: "P-011-e1", type: "procurement", observation: "stated as a contract requirement", url: "https://x.test", date: "2026", confidence: "direct", linkStatus: "checked" }
  ];
  const written = sync.evidenceRowsFrom(source);
  assert.strictEqual(written[0].position, 0);
  const read = sync.problemsFromRemote([sync.problemRowFrom(source)], [], written.map((row) => ({ ...row, problem_id: source.id })), []);
  assert.strictEqual(read[0].evidence[0].type, "procurement");
  assert.strictEqual(read[0].evidence[0].linkStatus, "checked");
});

test("an untriaged link is written as nothing, not as a claim that it was checked", () => {
  const source = syncProblem("P-011", "Untriaged");
  source.evidence = [
    { id: "P-011-e1", type: "price", observation: "seen in a listing", url: "https://x.test", date: "", confidence: "reported" }
  ];
  const written = sync.evidenceRowsFrom(source);
  assert.strictEqual(written[0].link_status, null);
  const read = sync.problemFromRemote({ problem: sync.problemRowFrom(source), evidence: [{ ...written[0], problem_id: source.id }] }, 0);
  assert.strictEqual(read.evidence[0].linkStatus, undefined);
});

test("the six required keys are rebuilt on every write, so a rename cannot orphan one", () => {
  const source = syncProblem("P-011", "Signals");
  source.signals = source.signals.map((signal, index) => (index === 0 ? { ...signal, value: 3, note: "because" } : signal));
  const rowsWritten = sync.signalRowsFrom(source);
  assert.strictEqual(rowsWritten.length, problems.signalDefs.length);
  assert.deepStrictEqual(rowsWritten.map((row) => row.key), problems.signalDefs.map((def) => def.key));
  assert.strictEqual(rowsWritten[0].problem_id, "P-011");
  assert.strictEqual(rowsWritten[0].value, 3);
});

test("an unreadable timestamp is kept rather than becoming now, which would mark it edited", () => {
  const row = syncRow("P-900", "Remote");
  row.created_at = "not a date";
  const read = sync.problemFromRemote({ problem: row }, 0);
  assert.strictEqual(read.createdAt, "not a date");
});

test("every company says where it is in a form that can be counted", () => {
  problems.seedCompanies.forEach((company) => {
    assert.ok(company.country === "" || /^[A-Z]{2}$/.test(company.country), company.name + " has country " + JSON.stringify(company.country));
    assert.ok(company.location.trim(), company.name + " has no location text beside the code");
    assert.ok(problems.seedCompanies.filter((other) => other.id === company.id).length === 1, company.id + " is not unique");
  });
});

test("a figure never arrives without the two things that make it readable", () => {
  problems.seedCompanies.forEach((company) => {
    assert.ok(problems.moneyBases.includes(company.basis), company.name + " has basis " + JSON.stringify(company.basis));
    assert.ok(problems.currencies.includes(company.currency), company.name + " has currency " + JSON.stringify(company.currency));
    if (company.currency) assert.ok(company.amount.trim(), company.name + " carries a currency and no amount");
    if (company.basis) assert.ok(company.amount.trim(), company.name + " carries a basis and no amount");
    if (company.amount.trim()) assert.ok(company.amountNote.trim(), company.name + " quotes a figure with no provenance note");
  });
});

test("the currency matches the symbol the figure is written with", () => {
  const bySymbol = { $: "USD", "£": "GBP", "€": "EUR" };
  problems.seedCompanies.forEach((company) => {
    const symbol = company.amount.trim().charAt(0);
    if (bySymbol[symbol]) assert.strictEqual(company.currency, bySymbol[symbol], company.name + " writes " + company.amount + " and calls it " + company.currency);
  });
});

// A tripwire, not a data assertion. If the figures ever became one kind of quantity in one currency on
// one footing, a total might become defensible and this would fail to say so.
test("the money is not one kind of quantity, so nothing may total it", () => {
  const priced = problems.seedCompanies.filter((company) => company.amount.trim());
  assert.ok(priced.length >= 2, "too few figures to say anything about them");
  assert.ok(new Set(priced.map((company) => company.currency)).size > 1, "every figure shares a currency");
  assert.ok(new Set(priced.map((company) => company.basis)).size > 1, "every figure is on the same footing");
  assert.ok(priced.some((company) => company.kind === "employer"), "no salary is recorded, so the two questions are not both present");
  assert.ok(priced.some((company) => company.kind !== "employer"), "no vendor price is recorded");
  assert.ok(priced.some((company) => /[–%]|tens of thousands|one bespoke/.test(company.amount)), "every figure parsed cleanly into a number, which is suspicious");
});

test("what a figure means is not stored twice — kind already says it", () => {
  problems.seedCompanies.forEach((company) => {
    assert.ok(!("moneyKind" in company), company.name + " carries a second copy of kind");
    assert.ok(["employer", "vendor", "bespoke"].includes(company.kind), company.name + " has kind " + company.kind);
    assert.ok(!("number" in company) && !("where" in company), company.name + " still uses the old field names");
  });
});

test("company links are written in order, and an empty list means no links", () => {
  const source = syncProblem("P-011", "Links");
  source.companyIds = ["c-duco", "c-reconart"];
  const rows = sync.companyLinkRowsFrom(source);
  assert.deepStrictEqual(rows, [
    { problem_id: "P-011", company_id: "c-duco", position: 0 },
    { problem_id: "P-011", company_id: "c-reconart", position: 1 }
  ]);
  source.companyIds = [];
  assert.deepStrictEqual(sync.companyLinkRowsFrom(source), []);
  source.companyIds = ["c-duco", "  ", ""];
  assert.strictEqual(sync.companyLinkRowsFrom(source).length, 1, "a blank company id was written as a link");
});

test("a junk payload reads as nothing rather than throwing", () => {
  [null, undefined, "rows", 7, {}].forEach((value) => {
    assert.deepStrictEqual(sync.problemsFromRemote(value, value, value, value), []);
  });
});

test("a missing database column becomes an empty field, never a fabricated one", () => {
  const read = sync.problemsFromRemote([{ id: "P-950" }], [], [], []);
  assert.strictEqual(read.length, 1);
  assert.strictEqual(read[0].title, "");
  assert.strictEqual(read[0].killReason, "");
  assert.strictEqual(read[0].gate, "G1-signal", "an absent gate must fall back, not guess");
  assert.deepStrictEqual(read[0].evidence, []);
  assert.deepStrictEqual(read[0].companyIds, []);
  assert.ok(read[0].signals.every((signal) => signal.value === null), "an absent signal must be blank, not zero");
});

// ============================================================ ratings

/** A `problem_ratings` row as PostgREST returns it: snake_case, and nothing else. */
const ratingRow = (over) => ({
  id: "rate-1",
  problem_id: "P-900",
  rubric_version: 1,
  score_at_rating: 3,
  answered_at_rating: 5,
  rating: 7,
  reason: "the buyer already runs this by hand",
  created_at: "2026-10-04T09:00:00.000Z",
  ...over
});

test("a rating is written without a timestamp, and read back with the database's", () => {
  const written = sync.ratingRowFrom({
    id: "rate-1",
    problemId: "P-900",
    rubricVersion: 1,
    scoreAtRating: 3,
    answeredAtRating: 5,
    rating: 7,
    reason: "the buyer already runs this by hand"
  });
  assert.deepStrictEqual(written, {
    id: "rate-1",
    problem_id: "P-900",
    rubric_version: 1,
    score_at_rating: 3,
    answered_at_rating: 5,
    rating: 7,
    reason: "the buyer already runs this by hand"
  });
  // The moment a rating was made is the moment the database accepted it. A clock here would let
  // this process, or a browser driving it, decide when somebody changed their mind.
  assert.ok(!("created_at" in written), "the write asserted its own timestamp");

  const read = sync.ratingFromRow(ratingRow());
  assert.strictEqual(read.id, "rate-1");
  assert.strictEqual(read.problemId, "P-900", "problem_id did not survive the round trip");
  assert.strictEqual(read.rubricVersion, 1);
  assert.strictEqual(read.scoreAtRating, 3);
  assert.strictEqual(read.answeredAtRating, 5, "the base the score was computed over was lost");
  assert.strictEqual(read.rating, 7);
  assert.strictEqual(read.reason, "the buyer already runs this by hand");
  assert.strictEqual(read.createdAt, "2026-10-04T09:00:00.000Z");
});

test("the base travels with the score, and a rating with none is not a rating", () => {
  // Without this the stored score is a number whose inputs cannot be recovered, which is what
  // docs/RULES.md § 5 forbids. Zero answered means there was no score to disagree with at all.
  [0, 8, null, undefined, "five"].forEach((value) => {
    assert.strictEqual(sync.ratingFromRow(ratingRow({ answered_at_rating: value })), null, "answered_at_rating=" + value + " was accepted");
  });
});

test("a rating that cannot be read as one is dropped, not repaired", () => {
  [
    { id: "" },
    { problem_id: "" },
    { rubric_version: 0 },
    { rubric_version: null },
    { score_at_rating: 11 },
    { score_at_rating: 3.5 },
    { rating: -1 },
    { reason: null }
  ].forEach((over) => {
    assert.strictEqual(sync.ratingFromRow(ratingRow(over)), null, JSON.stringify(over) + " was accepted as a rating");
  });
});

test("a divergent row with no reason is not readable as agreement", () => {
  // The CHECK in 20261004000000_problem_ratings.sql keeps such a row from being written. If one is
  // there anyway, the right reading is that the row is not trustworthy — never that the person who
  // disagreed silently agreed.
  assert.strictEqual(sync.ratingFromRow(ratingRow({ rating: 7, score_at_rating: 3, reason: "" })), null);
  assert.strictEqual(sync.ratingFromRow(ratingRow({ rating: 7, score_at_rating: 3, reason: "   " })), null);
});

test("exactly the threshold apart needs no reason; one point further does", () => {
  const atThreshold = sync.ratingFromRow(ratingRow({ rating: 7, score_at_rating: 4, reason: "" }));
  assert.strictEqual(atThreshold.rating, 7, "three points apart is agreement enough to store quietly");
  assert.strictEqual(atThreshold.reason, "", "an empty reason must read as empty, not as a placeholder");
  assert.strictEqual(sync.ratingFromRow(ratingRow({ rating: 7, score_at_rating: 3, reason: "" })), null, "four points apart needs the reason that is not there");
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
