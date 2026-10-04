const assert = require("assert");
const path = require("path");

const ideas = require(path.join(__dirname, "..", ".tmp-test", "ideas.js"));

let passed = 0;
let failed = 0;
const test = (name, fn) => {
  try { fn(); passed += 1; console.log(`PASS  ${name}`); }
  catch (error) { failed += 1; console.log(`FAIL  ${name}\n      ${error.message}`); }
};

test("sellers are read from the stored 'Already sold by' line, quote kept verbatim", () => {
  const line = "Already sold by: Contract Hound — contract software (“$95/month (Business plan — 50 active contracts)”); Zignt — reminders; PandaDoc — renewal reminders";
  assert.deepStrictEqual(ideas.sellersFromBusinessPattern(line), [
    { name: "Contract Hound", offer: "contract software", quote: "$95/month (Business plan — 50 active contracts)" },
    { name: "Zignt", offer: "reminders" },
    { name: "PandaDoc", offer: "renewal reminders" }
  ]);
});

test("a semicolon inside a price quote does not split the seller", () => {
  const line = "Already sold by: Ironclad — CLM (“Custom quote; typically $50/user/month”); Concord — CLM";
  const sellers = ideas.sellersFromBusinessPattern(line);
  assert.strictEqual(sellers.length, 2);
  assert.strictEqual(sellers[0].quote, "Custom quote; typically $50/user/month");
});

test("no business line means no sellers, never an invented one", () => {
  assert.deepStrictEqual(ideas.sellersFromBusinessPattern(undefined), []);
  assert.deepStrictEqual(ideas.sellersFromBusinessPattern(""), []);
  assert.deepStrictEqual(ideas.sellersFromBusinessPattern("Something else entirely"), []);
});

test("the same seller across runs counts once, keeping the first quote seen", () => {
  const sellers = ideas.distinctSellers([
    "Already sold by: Trove — chasing (“£50 a month”)",
    "Already sold by: trove — chasing; Chaser — chasing (“$233 a month”)"
  ]);
  assert.deepStrictEqual(sellers.map((seller) => seller.name), ["Trove", "Chaser"]);
  assert.strictEqual(sellers[0].quote, "£50 a month");
});

test("a decision needs pursue, park or drop and a reason", () => {
  assert.match(ideas.ideaDecisionError({ status: "maybe", reason: "x" }), /Pursue, Park or Drop/);
  assert.match(ideas.ideaDecisionError({ status: "park", reason: "   " }), /reason/);
  assert.strictEqual(ideas.ideaDecisionError({ status: "drop", reason: "Tools are free." }), null);
});

test("the newest decision per idea is the current one", () => {
  const current = ideas.currentDecisions([
    { ideaId: "a", status: "park", reason: "first", decidedAt: "2026-10-04T10:00:00.000Z" },
    { ideaId: "a", status: "pursue", reason: "second", decidedAt: "2026-10-04T12:00:00.000Z" },
    { ideaId: "b", status: "drop", reason: "only", decidedAt: "2026-10-04T11:00:00.000Z" }
  ]);
  assert.strictEqual(current.get("a").status, "pursue");
  assert.strictEqual(current.get("b").reason, "only");
});

test("the board puts undecided ideas first, then most complaints; the summary counts decisions only", () => {
  const cards = [
    { idea: { id: "x" }, complaints: 30, decision: { status: "drop" } },
    { idea: { id: "y" }, complaints: 5 },
    { idea: { id: "z" }, complaints: 12 }
  ];
  assert.deepStrictEqual(ideas.sortBoard(cards).map((card) => card.idea.id), ["z", "y", "x"]);
  assert.deepStrictEqual(ideas.boardSummary(cards), { total: 3, decided: 1, waiting: 2 });
});

test("every idea record is complete: runs, an answer, a verdict, and prices with a named seller", () => {
  const ids = new Set();
  for (const idea of ideas.IDEAS) {
    assert.ok(!ids.has(idea.id), `duplicate id ${idea.id}`); ids.add(idea.id);
    assert.ok(idea.runIds.length > 0, `${idea.id} has no runs`);
    assert.ok(idea.answer.trim().length > 0, `${idea.id} has no answer`);
    assert.ok(Object.keys(ideas.VERDICTS).includes(idea.verdict), `${idea.id} verdict`);
    for (const price of [idea.priceLow, idea.priceHigh].filter(Boolean)) {
      assert.ok(price.seller.trim() && price.quote.trim(), `${idea.id} price without seller or quote`);
    }
  }
  assert.ok(ideas.IDEAS.length >= 10);
});

test("no run belongs to two ideas, so no complaint is counted twice", () => {
  const seen = new Map();
  for (const idea of ideas.IDEAS) for (const run of idea.runIds) {
    assert.ok(!seen.has(run), `${run} is in ${seen.get(run)} and ${idea.id}`);
    seen.set(run, idea.id);
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
