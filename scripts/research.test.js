// oppie.lab — research pipeline rules.
//
// The assertions that matter here are about the line between collecting and concluding.
// The engine may dedupe, may normalise, and may carry a suggestion. It may not turn a
// suggestion into a record without a human, and it may not carry a bare number.

const assert = require("assert");
const path = require("path");

const OUT = path.join(__dirname, "..", ".tmp-test");
const research = require(path.join(OUT, "research.js"));
const store = require(path.join(OUT, "researchPersistence.js"));
const { emptyProblem } = require(path.join(OUT, "problems.js"));

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

const src = (url, extra = {}) => ({
  id: "x",
  url,
  title: "",
  finding: "",
  foundFor: "",
  collectedAt: "2026-10-01T00:00:00.000Z",
  status: "new",
  ...extra
});

test("the same page is not collected twice, however the URL is spelled", () => {
  assert.strictEqual(research.urlKey("https://www.Example.com/a/"), research.urlKey("http://example.com/a"));
  assert.strictEqual(research.urlKey("https://example.com/a?utm_source=x#top"), research.urlKey("https://example.com/a"));
  const fresh = research.newSources([src("https://example.com/a/"), src("http://www.example.com/a?ref=1")], []);
  assert.strictEqual(fresh.length, 1, "two spellings of one URL are one source");
});

test("re-running the same search adds nothing", () => {
  const existing = [src("https://example.com/a")];
  assert.deepStrictEqual(research.newSources([src("https://www.example.com/a/")], existing), []);
  assert.strictEqual(research.ingest(existing, [src("https://example.com/a")]).length, 1);
});

test("a source with no URL is rejected rather than stored as a dead entry", () => {
  assert.strictEqual(store.normalizeSource({ title: "no url" }, 0), null);
  assert.strictEqual(store.normalizeSource("nope", 1), null);
  assert.strictEqual(store.normalizeSource({ url: "https://example.com/x" }, 2).url, "https://example.com/x");
});

test("an unknown source status degrades to new, not to a silent discard", () => {
  assert.strictEqual(store.normalizeSource({ url: "https://e.com", status: "archived" }, 0).status, "new");
  assert.strictEqual(store.normalizeSource({ url: "https://e.com", status: "kept" }, 0).status, "kept");
});

test("a proposal with no reason is dropped, because a bare number is what this prevents", () => {
  const bare = { problemId: "P-001", signalKey: "pain", value: 3, reason: "   ", sourceUrl: "https://e.com" };
  assert.strictEqual(store.normalizeProposal(bare, 0), null);
  const explained = { ...bare, reason: "Because the RFP says so." };
  assert.strictEqual(store.normalizeProposal(explained, 0).value, 3);
});

test("a proposal outside 0-3 or on an unknown question is rejected, not clamped", () => {
  const base = { problemId: "P-001", signalKey: "pain", reason: "cited", sourceUrl: "https://e.com" };
  assert.strictEqual(store.normalizeProposal({ ...base, value: 7 }, 0), null);
  assert.strictEqual(store.normalizeProposal({ ...base, value: -1 }, 0), null);
  assert.strictEqual(store.normalizeProposal({ ...base, value: "3" }, 0), null);
  assert.strictEqual(store.normalizeProposal({ ...base, value: 2, signalKey: "vibes" }, 0), null);
  assert.strictEqual(store.normalizeProposal({ ...base, value: 2, problemId: "" }, 0), null);
});

test("nothing is auto-applied: a proposal starts life as proposed", () => {
  assert.ok(research.seedProposals.every((proposal) => proposal.status === "proposed"), "seed proposals must await a human");
  assert.ok(research.seedProposals.every((proposal) => proposal.reason.trim().length > 0), "every suggestion carries its reason");
  assert.strictEqual(research.pendingProposals(research.seedProposals).length, research.seedProposals.length);
});

test("accepting a proposal writes the score AND the reason AND the source", () => {
  const problem = emptyProblem("P-005");
  const proposal = {
    id: "p1",
    problemId: "P-005",
    signalKey: "pay",
    value: 2,
    reason: "Opturo publishes $3,960–$5,940 a year.",
    sourceUrl: "https://opturo.com/says-application/composite-reporting/",
    status: "accepted",
    createdAt: "2026-10-01T00:00:00.000Z"
  };
  const after = research.applyProposal(problem, proposal);
  const signal = after.signals.find((entry) => entry.key === "pay");
  assert.strictEqual(signal.value, 2);
  assert.ok(signal.note.includes("Opturo publishes"), "the reason must survive acceptance");
  assert.ok(signal.note.includes("opturo.com"), "the source must survive acceptance");
  assert.strictEqual(research.applyProposal(problem, proposal).signals.filter((entry) => entry.key === "pay").length, 1);
});

test("accepting one question leaves the other four untouched", () => {
  const problem = emptyProblem("P-005");
  const after = research.applyProposal(problem, {
    id: "p1",
    problemId: "P-005",
    signalKey: "pay",
    value: 2,
    reason: "cited",
    sourceUrl: "https://e.com",
    status: "accepted",
    createdAt: "2026-10-01T00:00:00.000Z"
  });
  const others = after.signals.filter((entry) => entry.key !== "pay");
  assert.strictEqual(others.length, 4);
  assert.ok(others.every((entry) => entry.value === null), "an accepted proposal must not fill blanks elsewhere");
});

test("a collected source only becomes evidence with the labels a human chose", () => {
  const evidence = research.sourceToEvidence(
    src("https://e.com/x", { finding: "quoted figure", evidenceType: "price", confidence: "direct", linkStatus: "checked" })
  );
  assert.strictEqual(evidence.type, "price");
  assert.strictEqual(evidence.confidence, "direct");
  assert.strictEqual(evidence.linkStatus, "checked");
  assert.strictEqual(evidence.observation, "quoted figure");
});

test("an untriaged source defaults to unverified rather than claiming to be read", () => {
  const evidence = research.sourceToEvidence(src("https://e.com/y", { finding: "x" }));
  assert.strictEqual(evidence.linkStatus, "unverified");
  assert.strictEqual(evidence.confidence, "reported");
});

test("triage survives a reload, and duplicate URLs collapse on read", () => {
  withStorage(() => {
    const sources = [src("https://example.com/a", { status: "kept", attachTo: "P-001" }), src("https://www.example.com/a?x=1")];
    assert.strictEqual(store.writeStoredResearch(sources, research.seedProposals), true);
    const read = store.readStoredResearch();
    assert.strictEqual(read.sources.length, 1, "duplicate URLs must not come back twice");
    assert.strictEqual(read.sources[0].status, "kept");
    assert.strictEqual(read.sources[0].attachTo, "P-001");
  });
});

test("a stale research schema is ignored rather than partially merged", () => {
  withStorage(() => {
    global.window.localStorage.setItem(store.RESEARCH_STORAGE_KEY, JSON.stringify({ version: 42, sources: [], proposals: [] }));
    assert.strictEqual(store.readStoredResearch(), null);
  });
});

test("corrupt research storage recovers to nothing instead of throwing", () => {
  withStorage(() => {
    global.window.localStorage.setItem(store.RESEARCH_STORAGE_KEY, "{oops");
    assert.strictEqual(store.readStoredResearch(), null);
  });
});

test("freshInbox returns a copy, so triage cannot mutate the seed", () => {
  const copy = store.freshInbox();
  copy[0].status = "spent";
  assert.strictEqual(research.seedInbox[0].status, "new");
});

test("every seeded source says which query found it, so a thin result is traceable", () => {
  for (const source of research.seedInbox) {
    assert.ok(source.foundFor.trim().length > 0, `${source.id} has no query recorded`);
    assert.ok(source.url.startsWith("http"), `${source.id} has no usable url`);
  }
});

test("every seeded source resolves to a problem that exists", () => {
  const ids = new Set(require(path.join(OUT, "problems.js")).seedProblems.map((problem) => problem.id));
  for (const source of research.seedInbox) {
    if (!source.suggests) continue;
    assert.ok(ids.has(source.suggests), `${source.id} suggests ${source.suggests}, which is not a problem`);
  }
  for (const proposal of research.seedProposals) {
    assert.ok(ids.has(proposal.problemId), `${proposal.id} targets ${proposal.problemId}, which is not a problem`);
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
