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

test("nothing is written before hydration, so a pre-load render cannot replace records", () => {
  const plan = sync.planWrite({ hydrated: false, dirty: ["P-001"], problems: [syncProblem("P-001", "pre-load render")] });
  assert.strictEqual(plan.shouldCache, false);
  assert.deepStrictEqual(plan.upload, []);
});

test("first load shows the database records, never the seed placeholder", () => {
  const plan = sync.planFirstLoad({ remote: [syncProblem("P-001", "Read from the database")], local: null });
  assert.strictEqual(plan.problems.length, 1);
  assert.strictEqual(plan.problems[0].title, "Read from the database");
  assert.notStrictEqual(plan.problems[0].title, problems.seedProblems[0].title);
  assert.deepStrictEqual(plan.upload, []);
});

test("a failed read is not an empty table: it pushes nothing", () => {
  const local = [...problems.seedProblems, syncProblem("P-011", "Local only")];
  const plan = sync.planFirstLoad({ remote: null, local });
  assert.deepStrictEqual(plan.upload, [], "a stale local copy must not be written into a table we could not read");
  assert.ok(plan.problems.some((problem) => problem.id === "P-011"), "the browser's own work is still shown");
});

test("an empty table accepts the browser's own records, once", () => {
  const local = [...problems.seedProblems, syncProblem("P-011", "Local only")];
  const plan = sync.planFirstLoad({ remote: [], local });
  assert.deepStrictEqual(plan.upload.map((problem) => problem.id), ["P-011"]);
  assert.strictEqual(plan.problems.length, problems.seedProblems.length + 1);
});

test("the untouched seeds are never uploaded — they are reference data, not records", () => {
  assert.ok(problems.seedProblems.every((problem) => !sync.shouldPersistToRemote(problem)));
  const plan = sync.planFirstLoad({ remote: [], local: problems.seedProblems });
  assert.deepStrictEqual(plan.upload, []);
  assert.strictEqual(plan.problems.length, problems.seedProblems.length);
});

test("a seed becomes uploadable the moment somebody edits it", () => {
  const edited = { ...problems.seedProblems[0], title: "Renamed by hand", updatedAt: "2026-10-02T10:00:00.000Z" };
  assert.strictEqual(sync.shouldPersistToRemote(edited), true);
  assert.deepStrictEqual(sync.planFirstLoad({ remote: [], local: [edited] }).upload.map((problem) => problem.id), [edited.id]);
});

test("a record the database already holds is not pushed again on every load", () => {
  const one = { ...problems.seedProblems[0], title: "Renamed by hand", updatedAt: "2026-10-02T10:00:00.000Z" };
  assert.deepStrictEqual(sync.planFirstLoad({ remote: [one], local: [one] }).upload, []);
});

test("a record the browser has never seen survives the merge and is not dropped", () => {
  const mine = syncProblem("P-011", "Only in this browser");
  const theirs = syncProblem("P-012", "Only in the database");
  const plan = sync.planFirstLoad({ remote: [theirs], local: [mine] });
  assert.deepStrictEqual(
    plan.problems.map((problem) => problem.id).sort(),
    ["P-011", "P-012"]
  );
});

test("for the same id the browser's copy wins, and is written over the database copy", () => {
  const plan = sync.planFirstLoad({
    remote: [syncProblem("P-011", "Older database copy")],
    local: [syncProblem("P-011", "Newer browser copy")]
  });
  assert.strictEqual(plan.problems[0].title, "Newer browser copy");
  assert.deepStrictEqual(plan.upload.map((problem) => problem.id), ["P-011"]);
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

test("a seed survives a storage round trip with its evidence type and link status intact", () => {
  withStorage(() => {
    assert.strictEqual(store.writeStoredProblems(problems.seedProblems), true);
    const back = store.readStoredProblems();
    assert.strictEqual(back.length, problems.seedProblems.length);
    problems.seedProblems.forEach((seed, index) => {
      assert.strictEqual(back[index].evidence.length, seed.evidence.length, seed.id + " lost evidence rows on read");
      seed.evidence.forEach((item, position) => {
        assert.strictEqual(back[index].evidence[position].type, item.type, seed.id + " had an evidence type rewritten");
        assert.strictEqual(back[index].evidence[position].linkStatus, item.linkStatus, seed.id + " lost a link status");
      });
    });
  });
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

test("a Postgres timestamptz and the browser's ISO string are one instant, not an edit", () => {
  // Measured against the live database: the row comes back with `+00:00`, the app writes `Z`,
  // and a structural comparison reads that as a change. Left alone, every page load re-uploads
  // the record it just saved.
  const local = syncProblem("P-011", "Edited by hand");
  local.createdAt = "2026-10-01T09:00:00.000Z";
  local.updatedAt = "2026-10-03T09:28:10.122Z";
  const row = sync.problemRowFrom(local);
  row.created_at = "2026-10-01T09:00:00+00:00";
  row.updated_at = "2026-10-03T09:28:10.122+00:00";

  const read = sync.problemFromRemote({ problem: row, signals: sync.signalRowsFrom(local) }, 0);
  assert.strictEqual(read.createdAt, "2026-10-01T09:00:00.000Z");
  assert.strictEqual(read.updatedAt, "2026-10-03T09:28:10.122Z");
  assert.deepStrictEqual(sync.planFirstLoad({ remote: [read], local: [local] }).upload, []);
});

test("an unreadable timestamp is kept rather than becoming now, which would mark it edited", () => {
  const row = syncRow("P-900", "Remote");
  row.created_at = "not a date";
  const read = sync.problemFromRemote({ problem: row }, 0);
  assert.strictEqual(read.createdAt, "not a date");
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
