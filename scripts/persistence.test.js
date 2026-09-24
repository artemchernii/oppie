// oppie.lab — persistence rules.
//
// These assertions cover the part of the app that can silently destroy the user's work:
// reading, repairing and writing the localStorage record. They run in plain Node against
// the real lib/persistence.ts compiled to .tmp-test by `pnpm test`.
//
// No test framework on purpose: the repo has no runner, and adding one for 16 assertions
// is more dependency than the check is worth.

const assert = require("assert");
const path = require("path");

const OUT = path.join(__dirname, "..", ".tmp-test");
const store = require(path.join(OUT, "persistence.js"));
const { seedOpportunities, emptyOpportunity } = require(path.join(OUT, "data.js"));

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

/** Minimal browser stub — just enough localStorage to exercise the real code paths. */
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

const persist = (opportunities) => global.window.localStorage.setItem(store.STORAGE_KEY, JSON.stringify({ version: store.SCHEMA_VERSION, opportunities }));

test("seeds: 6 opportunities, 18 sources, every one has a kill reason and a next test", () => {
  assert.strictEqual(seedOpportunities.length, 6);
  assert.strictEqual(
    seedOpportunities.reduce((total, item) => total + item.sources.length, 0),
    18
  );
  seedOpportunities.forEach((item) => {
    assert.ok(item.killReason.trim(), item.id + " has no kill reason");
    assert.ok(item.nextTest.trim(), item.id + " has no next test");
    assert.ok(item.stage, item.id + " has no stage");
    assert.ok(item.evidenceStatus, item.id + " has no evidence status");
    item.sources.forEach((source) => assert.ok(source.id && source.url, item.id + " has an incomplete source"));
  });
});

test("fresh browser profile: nothing stored, so the board falls back to seed", () => {
  global.window = makeWindow();
  assert.strictEqual(store.readStored(), null);
});

test("server render: no window returns null instead of throwing", () => {
  const saved = global.window;
  delete global.window;
  assert.strictEqual(store.readStored(), null);
  global.window = saved;
});

test("round trip: edits survive a reload byte for byte", () => {
  global.window = makeWindow();
  const edited = store.freshSeed();
  edited[0].title = "Construction compliance (PT)";
  edited[0].stage = "validate";
  edited[0].unknowns = "";
  assert.strictEqual(store.writeStored(edited), true);
  const back = store.readStored();
  assert.strictEqual(back[0].title, "Construction compliance (PT)");
  assert.strictEqual(back[0].stage, "validate");
  assert.strictEqual(back[0].unknowns, "");
});

test("freshSeed returns a copy, so an edit cannot mutate the seed constant", () => {
  const copy = store.freshSeed();
  copy[0].title = "mutated";
  assert.notStrictEqual(seedOpportunities[0].title, "mutated");
});

test("a new opportunity persists with blank fields still blank, never invented", () => {
  global.window = makeWindow();
  const list = store.freshSeed();
  const fresh = emptyOpportunity(store.nextOpportunityId(list));
  fresh.title = "My new idea";
  list.push(fresh);
  store.writeStored(list);
  const back = store.readStored();
  assert.strictEqual(back.length, 7);
  const added = back[6];
  assert.strictEqual(added.title, "My new idea");
  assert.strictEqual(added.stage, "discovery");
  assert.strictEqual(added.evidenceStatus, "early");
  assert.deepStrictEqual(added.sources, []);
  assert.strictEqual(added.killReason, "");
});

test("corrupt JSON recovers to seed instead of breaking the board", () => {
  global.window = makeWindow();
  global.window.localStorage.setItem(store.STORAGE_KEY, "{not json at all");
  assert.strictEqual(store.readStored(), null);
});

test("a stale schema version is ignored rather than partially merged", () => {
  global.window = makeWindow();
  global.window.localStorage.setItem(store.STORAGE_KEY, JSON.stringify({ version: 0, opportunities: [{ id: "x", title: "old" }] }));
  assert.strictEqual(store.readStored(), null);
});

test("wrong shapes are ignored: array, string, null, non-array opportunities", () => {
  global.window = makeWindow();
  const bad = ["[]", '"hello"', "null", JSON.stringify({ version: 1, opportunities: "nope" })];
  bad.forEach((payload) => {
    global.window.localStorage.setItem(store.STORAGE_KEY, payload);
    assert.strictEqual(store.readStored(), null, "should reject " + payload);
  });
});

test("a partial record is repaired field by field, missing text becomes empty", () => {
  global.window = makeWindow();
  persist([{ title: "Only a title" }]);
  const back = store.readStored();
  assert.strictEqual(back.length, 1);
  assert.strictEqual(back[0].title, "Only a title");
  assert.strictEqual(back[0].killReason, "");
  assert.strictEqual(back[0].id, "recovered-0");
  assert.strictEqual(back[0].evidenceStatus, "early");
  assert.deepStrictEqual(back[0].tags, []);
});

test("non-object entries are dropped while valid ones survive", () => {
  global.window = makeWindow();
  persist([null, 7, { title: "keeper" }]);
  const back = store.readStored();
  assert.strictEqual(back.length, 1);
  assert.strictEqual(back[0].title, "keeper");
});

test("malformed sources degrade safely and an unknown confidence is not accepted", () => {
  global.window = makeWindow();
  persist([{ title: "t", sources: [null, { label: "no url" }, { label: "ok", url: "https://x.test", confidence: "certain" }] }]);
  const back = store.readStored();
  assert.strictEqual(back[0].sources.length, 2);
  assert.strictEqual(back[0].sources[0].type, "Other");
  assert.strictEqual(back[0].sources[0].id, "recovered-0-s2");
  assert.strictEqual(back[0].sources[1].confidence, undefined);
});

test("unrated sources stay unrated — no fabricated confidence on the seeds", () => {
  assert.ok(seedOpportunities.every((item) => item.sources.every((source) => source.confidence === undefined)));
});

test("quota or private-mode failure reports false instead of throwing", () => {
  global.window = {
    localStorage: {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      }
    }
  };
  assert.strictEqual(store.writeStored(store.freshSeed()), false);
  assert.strictEqual(store.readStored(), null);
});

test("id allocation never collides with an existing record", () => {
  const list = store.freshSeed();
  const seen = new Set(list.map((item) => item.id));
  for (let i = 0; i < 50; i += 1) {
    const id = store.nextOpportunityId(list);
    assert.ok(!seen.has(id), "collision on " + id);
    seen.add(id);
  }
});

test("reset restores the untouched seed, not the current list", () => {
  global.window = makeWindow();
  const dirty = store.freshSeed();
  dirty[0].title = "ruined";
  store.writeStored(dirty);
  assert.strictEqual(store.readStored()[0].title, "ruined");
  assert.strictEqual(store.freshSeed()[0].title, "Construction compliance");
});

console.log("\n" + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
