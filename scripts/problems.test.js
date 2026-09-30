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

const makeWindow = () => {
  const map = new Map();
  return {
    localStorage: {
      getItem: (key) => (map.has(key) ? map.get(key) : null),
      setItem: (key, value) => {
        map.set(key, String(value));
      },
      removeItem: (key) => {
        map.delete(key);
      }
    }
  };
};

const withStorage = (run) => {
  const previous = global.window;
  global.window = makeWindow();
  try {
    run();
  } finally {
    global.window = previous;
  }
};

const first = () => JSON.parse(JSON.stringify(problems.seedProblems[0]));

test("a checked zero survives a round trip and stays zero, not blank", () => {
  withStorage(() => {
    const problem = first();
    problem.signals = problem.signals.map((signal) => (signal.key === "moat" ? { ...signal, value: 0, note: "checked: no moat at all" } : signal));
    assert.strictEqual(store.writeStoredProblems([problem]), true);
    const read = store.readStoredProblems();
    const moat = read[0].signals.find((signal) => signal.key === "moat");
    assert.strictEqual(moat.value, 0);
    assert.notStrictEqual(moat.value, null);
  });
});

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

test("corrupt JSON recovers to null instead of throwing", () => {
  withStorage(() => {
    global.window.localStorage.setItem(store.PROBLEMS_STORAGE_KEY, "{not json");
    assert.strictEqual(store.readStoredProblems(), null);
  });
});

test("a stale schema version is ignored rather than partially merged", () => {
  withStorage(() => {
    global.window.localStorage.setItem(store.PROBLEMS_STORAGE_KEY, JSON.stringify({ version: 99, problems: problems.seedProblems }));
    assert.strictEqual(store.readStoredProblems(), null);
  });
});

test("non-object entries are dropped while valid ones survive", () => {
  withStorage(() => {
    global.window.localStorage.setItem(
      store.PROBLEMS_STORAGE_KEY,
      JSON.stringify({ version: store.PROBLEMS_SCHEMA_VERSION, problems: [null, "nope", 7, { id: "kept", title: "Kept" }] })
    );
    const read = store.readStoredProblems();
    assert.strictEqual(read.length, 1);
    assert.strictEqual(read[0].id, "kept");
  });
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

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
