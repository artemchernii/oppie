// oppie.lab — the analysis rubric's rules.
//
// These assertions protect the two things about a score that decide whether it is honest:
// an `unknown` must never be summed as a zero, and a `no` must never be produced from a field that
// is merely empty. Both failure modes look like a working score and quietly mis-rank everything.

const assert = require("assert");
const path = require("path");

const OUT = path.join(__dirname, "..", ".tmp-test");
const problems = require(path.join(OUT, "problems.js"));
const { analyse, summarise, requiresReason, compareByScore, dimensionDefs, WEIGHTS, RUBRIC_VERSION, DIVERGENCE_THRESHOLD } = require(path.join(OUT, "analysis.js"));

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

const ev = (id, type, url, confidence, linkStatus) => ({ id, type, observation: "seen in passing", url, date: "2026-10-01", confidence, linkStatus });

/** Hand-built dimensions, so `summarise` can be tested without a Problem in the way. */
const dims = (list) => list.map(([key, verdict]) => ({ key, label: key, rule: "test", verdict }));

/** A record that answers all seven dimensions. Everything the engine is trying to earn. */
const good = () => {
  const problem = problems.emptyProblem("P-900");
  problem.affectedRole = "Fund operations lead";
  problem.what = "Reconcile broker statements by hand";
  problem.market = "EU small fund managers";
  problem.consequence = "Month-end close slips two days";
  problem.buyer = "Head of fund operations";
  problem.whyTheyPay = "They already pay an analyst to do it";
  problem.killReason = "Crowded: three vendors already sell this";
  problem.companyIds = ["c-one"];
  problem.signals = problem.signals.map((signal) => {
    if (signal.key === "pay") return { ...signal, value: 3, note: "an analyst salary" };
    if (signal.key === "moat") return { ...signal, value: 2, note: "two compounding advantages" };
    return signal;
  });
  problem.evidence = [
    ev("P-900-e1", "job", "https://jobs.test/ops", "direct", "checked"),
    ev("P-900-e2", "price", "https://vendor.test/pricing", "direct", "checked"),
    ev("P-900-e3", "community", "https://forum.test/thread", "reported", "unverified")
  ];
  return problem;
};

const find = (problem, key) => analyse(problem).dimensions.find((dimension) => dimension.key === key);

test("an empty record answers nothing, and no score is invented for it", () => {
  const analysis = analyse(problems.emptyProblem("P-901"));
  assert.strictEqual(analysis.dimensions.length, 7);
  assert.ok(analysis.dimensions.every((dimension) => dimension.verdict === "unknown"));
  assert.strictEqual(analysis.answered, 0);
  assert.strictEqual(analysis.max, 0);
  assert.strictEqual(analysis.score, null, "nothing answered must be null, not 0");
  assert.strictEqual(analysis.unknown.length, 7);
});

test("a missing field is unknown, never a no — only a checked answer can be a no", () => {
  const empty = analyse(problems.emptyProblem("P-902"));
  assert.ok(empty.dimensions.every((dimension) => dimension.verdict !== "no"), "an empty record produced a no");
  const full = analyse(good());
  assert.ok(full.dimensions.every((dimension) => dimension.verdict !== "no"));
});

test("a no is counted, so known holes cannot look like unanswered questions", () => {
  const holes = summarise(dims([["wedge", "yes"], ["paid", "yes"], ["repeats", "yes"], ["buyer", "no"], ["competition", "no"]]));
  const open = summarise(dims([["wedge", "yes"], ["paid", "yes"], ["repeats", "yes"], ["buyer", "unknown"], ["competition", "unknown"]]));
  assert.strictEqual(holes.raw, 1, "three yes and two no should sum to one");
  assert.strictEqual(holes.max, 5);
  assert.strictEqual(open.raw, 3, "unknowns contribute nothing");
  assert.strictEqual(open.max, 3, "unknowns shrink the base instead");
  assert.notStrictEqual(holes.score, open.score, "a known hole and a gap must not score the same");
});

test("the base travels with the number, so five answers cannot pass for seven", () => {
  const five = summarise(dims([["wedge", "yes"], ["paid", "yes"], ["repeats", "yes"], ["buyer", "yes"], ["competition", "yes"], ["kill", "unknown"], ["citations", "unknown"]]));
  const seven = summarise(dims([["wedge", "yes"], ["paid", "yes"], ["repeats", "yes"], ["buyer", "yes"], ["competition", "yes"], ["kill", "yes"], ["citations", "yes"]]));
  assert.strictEqual(five.answered, 5);
  assert.strictEqual(five.max, 5);
  assert.deepStrictEqual(five.unknown, ["kill", "citations"]);
  assert.strictEqual(seven.answered, 7);
  assert.strictEqual(seven.max, 7);
  // The score is a proportion, so the same proportion gives the same number. That is exactly why the
  // base has to be shown beside it: 10 over 5 answers and 10 over 7 are both "everything checked so
  // far", and only the base says which of the two is more checked. A surface that shows the score
  // without `answered` and `max` is showing a number that cannot be read.
  assert.strictEqual(five.score, seven.score);
});

// Regression, found by running the rubric over the seeded records on 2026-10-03: P-002 had two of
// seven dimensions checked, got them both right, and scored 10/10 — the same as P-001 with six of
// seven checked and one known hole. The score is a proportion, so the base has to decide the order.
test("an almost untouched record cannot outrank a well-checked one on a high proportion", () => {
  const keys = dimensionDefs.map((def) => def.key);
  const barely = summarise(dims(keys.map((key) => [key, key === "wedge" || key === "paid" ? "yes" : "unknown"])));
  const thoroughly = summarise(dims(keys.map((key) => [key, "yes"])));
  assert.strictEqual(barely.score, thoroughly.score, "both are a perfect proportion over what was checked");
  assert.strictEqual(barely.answered, 2);
  assert.strictEqual(thoroughly.answered, 7);
  const order = [thoroughly, barely].sort(compareByScore);
  assert.strictEqual(order[0].answered, 7, "completeness must sort above the proportion");
});

test("a record with nothing answered sorts last, not first", () => {
  const nothing = analyse(problems.emptyProblem("P-951"));
  const something = analyse(good());
  const order = [nothing, something].sort(compareByScore);
  assert.strictEqual(order[0].answered, 7);
  assert.strictEqual(order[1].score, null);
});

test("the score is on the same 0-10 scale as a rating, so the two can be compared", () => {
  const all = [["wedge"], ["paid"], ["repeats"], ["buyer"], ["competition"], ["kill"], ["citations"]];
  assert.strictEqual(analyse(good()).score, 10);
  const allNo = summarise(dims(all.map(([key]) => [key, "no"])));
  assert.strictEqual(allNo.score, 0, "checked and everything is no is a real zero");
  [analyse(good()).score, allNo.score].forEach((value) => assert.ok(value >= 0 && value <= 10, "score " + value + " is off the rating scale"));
});

test("every verdict names its rule, and every answered one cites what decided it", () => {
  const analysis = analyse(good());
  analysis.dimensions.forEach((dimension) => {
    assert.ok(dimension.rule, dimension.key + " names no rule");
    if (dimension.verdict !== "unknown") {
      assert.ok(dimension.citation && (dimension.citation.field || dimension.citation.url), dimension.key + " has a verdict with no citation");
    }
  });
  assert.strictEqual(analysis.rubricVersion, RUBRIC_VERSION);
});

test("the rubric is the seven dimensions, in gate order, each weighted the same", () => {
  assert.deepStrictEqual(dimensionDefs.map((def) => def.key), ["wedge", "paid", "repeats", "buyer", "competition", "kill", "citations"]);
  dimensionDefs.forEach((def) => assert.strictEqual(WEIGHTS[def.key], 1, def.key + " is not weighted 1"));
});

test("a community thread can never answer paid today", () => {
  const problem = problems.emptyProblem("P-903");
  problem.evidence = [ev("P-903-e1", "community", "https://reddit.test/x", "reported", "unverified")];
  assert.strictEqual(find(problem, "paid").verdict, "unknown", "a complaint was treated as proof of money");
});

test("a job posting whose description is the workflow answers paid today", () => {
  const problem = problems.emptyProblem("P-904");
  problem.evidence = [ev("P-904-e1", "job", "https://jobs.test/x", "direct", "checked")];
  const paid = find(problem, "paid");
  assert.strictEqual(paid.verdict, "yes");
  assert.strictEqual(paid.citation.url, "https://jobs.test/x");
  assert.strictEqual(paid.citation.opened, true);
});

test("a signal answered 0 is a checked no, with the reason beside it", () => {
  const problem = problems.emptyProblem("P-905");
  problem.signals = problem.signals.map((signal) => (signal.key === "pay" ? { ...signal, value: 0, note: "checked: nobody pays for this" } : signal));
  const paid = find(problem, "paid");
  assert.strictEqual(paid.verdict, "no");
  assert.strictEqual(paid.citation.field, "signals.pay");
  assert.ok(paid.citation.passage.length > 0, "a no arrived with no reason beside it");
});

test("the wedge is four separate answers, and three of four is not a yes", () => {
  const problem = problems.emptyProblem("P-906");
  problem.affectedRole = "Ops lead";
  problem.what = "Reconcile statements";
  problem.market = "EU funds";
  const partial = find(problem, "wedge");
  assert.strictEqual(partial.parts.length, 4);
  assert.deepStrictEqual(partial.parts.map((item) => item.key), ["customer", "workflow", "place", "consequence"]);
  assert.strictEqual(partial.verdict, "unknown");
  problem.consequence = "Close slips two days";
  assert.strictEqual(find(problem, "wedge").verdict, "yes");
});

test("a kill reason that names nothing real is a no; an empty one is unknown", () => {
  const problem = problems.emptyProblem("P-907");
  assert.strictEqual(find(problem, "kill").verdict, "unknown");
  problem.killReason = "Needs more research";
  assert.strictEqual(find(problem, "kill").verdict, "no");
  problem.killReason = "TBD";
  assert.strictEqual(find(problem, "kill").verdict, "no");
  problem.killReason = "Crowded: three vendors already sell this";
  assert.strictEqual(find(problem, "kill").verdict, "yes");
});

// Regression, and the reason the vocabulary check was removed. Both of these are real seeded
// reasons that a keyword allowlist judged a `no` on 2026-10-03 because they did not use the words
// on the list. A false `no` costs a point and mis-ranks the record.
test("a real reason is a yes even when it uses none of the words RULES § 4 lists", () => {
  const roomy = problems.emptyProblem("P-911");
  roomy.killReason = "Fund administrators buy through procurement. If every reachable buyer needs a committee, the sales cycle is the product.";
  assert.strictEqual(find(roomy, "kill").verdict, "yes", "a procurement committee is a real kill reason");

  const retail = problems.emptyProblem("P-912");
  retail.killReason = "Retail buyer. Individuals pay least and churn fastest.";
  assert.strictEqual(find(retail, "kill").verdict, "yes", "low willingness to pay is a real kill reason");
  assert.ok(retail.killReason.length > 0 && find(retail, "kill").citation.passage.length > 0, "the reason must be shown beside the verdict");
});

test("no seeded record is judged to have failed to write a reason", () => {
  problems.seedProblems.forEach((seed) => {
    if (!seed.killReason.trim()) return;
    assert.notStrictEqual(find(seed, "kill").verdict, "no", seed.id + " has a written reason but was judged a non-reason: " + JSON.stringify(seed.killReason.slice(0, 80)));
  });
});

test("a direct claim on a link nobody opened is a no", () => {
  const problem = problems.emptyProblem("P-908");
  problem.evidence = [ev("P-908-e1", "report", "https://x.test/a", "direct", undefined)];
  const unopened = find(problem, "citations");
  assert.strictEqual(unopened.verdict, "no");
  assert.strictEqual(unopened.citation.opened, false);
  problem.evidence = [ev("P-908-e1", "report", "https://x.test/a", "direct", "checked")];
  assert.strictEqual(find(problem, "citations").verdict, "yes");
});

test("two sources is unknown, never a no — absence does not prove rarity", () => {
  const problem = problems.emptyProblem("P-909");
  problem.evidence = [ev("P-909-e1", "community", "https://a.test/1", "reported", "unverified"), ev("P-909-e2", "community", "https://b.test/2", "reported", "unverified")];
  assert.strictEqual(find(problem, "repeats").verdict, "unknown");
  problem.evidence.push(ev("P-909-e3", "community", "https://c.test/3", "reported", "unverified"));
  assert.strictEqual(find(problem, "repeats").verdict, "yes");
});

test("the blocking dimension is the earliest unmet one in gate order", () => {
  const problem = problems.emptyProblem("P-910");
  assert.strictEqual(analyse(problem).blocking, "wedge");
  assert.strictEqual(analyse(good()).blocking, null, "a record with every dimension answered and met blocks on nothing");
  problem.affectedRole = "x";
  problem.what = "y";
  problem.market = "z";
  problem.consequence = "w";
  assert.strictEqual(analyse(problem).blocking, "paid", "the wedge is answered, so the next gate blocks");
});

test("a reason is required only on divergence, and only when there is a score", () => {
  assert.strictEqual(requiresReason(7, 4), false, "exactly the threshold apart needs no reason");
  assert.strictEqual(requiresReason(7, 3), true);
  assert.strictEqual(requiresReason(0, 10), true);
  assert.strictEqual(requiresReason(5, null), false, "there is no disagreement to explain when the machine has no opinion");
  assert.strictEqual(DIVERGENCE_THRESHOLD, 3);
});

test("the same record always produces the same number, twice", () => {
  const problem = good();
  const first = analyse(problem);
  const second = analyse(problem);
  assert.strictEqual(first.score, second.score);
  assert.strictEqual(first.raw, second.raw);
  assert.deepStrictEqual(first.unknown, second.unknown);
});

test("a checked moat of 1 is a weak moat, not a blank", () => {
  // Found by running the rubric over the seeds on 2026-10-03: P-001, P-003 and P-006 all answer moat as
  // 1, and a checked 1 came back as `unknown`, discarding the answer. Below 2 is a wedge that is not
  // defended, which is a `no` rather than a shrug.
  const setMoat = (value) => {
    const problem = problems.emptyProblem("P-913");
    problem.companyIds = ["c-one"];
    problem.signals = problem.signals.map((signal) => (signal.key === "moat" ? { ...signal, value, note: "checked" } : signal));
    return find(problem, "competition").parts.find((item) => item.key === "moat");
  };
  assert.strictEqual(setMoat(0).verdict, "no");
  assert.strictEqual(setMoat(1).verdict, "no", "a checked 1 was discarded as unknown");
  assert.strictEqual(setMoat(2).verdict, "yes");
  assert.strictEqual(setMoat(3).verdict, "yes");
  assert.strictEqual(setMoat(null).verdict, "unknown");
  [0, 1, 2, 3].forEach((value) => assert.ok(setMoat(value).citation && setMoat(value).citation.field, "moat=" + value + " has no reason beside it"));
});

test("a checked signal is never reported as a blank by the dimension that reads it", () => {
  [0, 1, 2, 3].forEach((value) => {
    const problem = problems.emptyProblem("P-914");
    problem.signals = problem.signals.map((signal) => (signal.key === "pay" ? { ...signal, value, note: "checked" } : signal));
    assert.notStrictEqual(find(problem, "paid").verdict, "unknown", "pay=" + value + " was discarded by the paid dimension");
  });
});

console.log("\n" + passed + " passed, " + failed + " failed");
if (failed > 0) process.exit(1);
