// oppie.lab — the company record's read rules.
//
// The mapping is where a rename turns into a silent `undefined`, and where a repairable gap has to be
// told apart from an unreadable row. The rule that matters most is the one specific to companies:
// `kind` decides what `amount` means, so a row whose kind is unusable is dropped rather than repaired.

const assert = require("assert");
const path = require("path");

const OUT = path.join(__dirname, "..", ".tmp-test");
const problems = require(path.join(OUT, "problems.js"));
const sync = require(path.join(OUT, "companySync.js"));
const { reason, isNextControlFlow, messageOf } = require(path.join(OUT, "supabaseResult.js"));

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

/** A `companies` row as PostgREST returns it: snake_case, and nothing else. */
const rowOf = (company) => sync.companyRowFrom(company);
const first = () => problems.seedCompanies[0];

test("every researched company survives a round trip through the database unchanged", () => {
  problems.seedCompanies.forEach((company) => {
    const back = sync.companyFromRow(rowOf(company));
    assert.ok(back, company.name + " could not be read back at all");
    assert.deepStrictEqual(back, company, company.name + " changed on the round trip");
  });
});

test("a row whose kind is unusable is dropped, never repaired", () => {
  // kind decides what amount means. Repairing it would put a price where a salary belongs, and the
  // figure would look perfectly fine afterwards.
  const row = rowOf(first());
  row.kind = "competitor";
  assert.strictEqual(sync.companyFromRow(row), null, "an unusable kind was repaired instead of dropped");
  delete row.kind;
  assert.strictEqual(sync.companyFromRow(row), null, "a missing kind was repaired instead of dropped");
});

test("what a record asserts about its own evidence is not repairable either", () => {
  const wrongConfidence = rowOf(first());
  wrongConfidence.confidence = "certain";
  assert.strictEqual(sync.companyFromRow(wrongConfidence), null);

  const wrongLink = rowOf(first());
  wrongLink.link_status = "fine";
  assert.strictEqual(sync.companyFromRow(wrongLink), null);
});

test("a missing location is a gap and is repaired to empty, not rejected", () => {
  const row = rowOf(first());
  delete row.location;
  delete row.role;
  delete row.url;
  const back = sync.companyFromRow(row);
  assert.ok(back, "a company with a missing text field was dropped");
  assert.strictEqual(back.location, "");
  assert.strictEqual(back.role, "");
  assert.strictEqual(back.url, "");
});

test("a country that is not two capital letters is not kept as a code", () => {
  ["United Kingdom", "uk", "GBR", "G1", "  ", "Unknown"].forEach((bad) => {
    const row = rowOf(first());
    row.country = bad;
    assert.strictEqual(sync.companyFromRow(row).country, "", JSON.stringify(bad) + " was kept as a country code");
  });
  const good = rowOf(first());
  good.country = "GB";
  assert.strictEqual(sync.companyFromRow(good).country, "GB");
});

test("an unknown currency or basis degrades to empty rather than being shown", () => {
  const badCurrency = rowOf(first());
  badCurrency.currency = "CHF";
  assert.strictEqual(sync.companyFromRow(badCurrency).currency, "", "an unrecognised currency was kept");

  const badBasis = rowOf(first());
  badBasis.basis = "per_fortnight";
  assert.strictEqual(sync.companyFromRow(badBasis).basis, "", "an unrecognised basis was kept");
});

test("the money is read back verbatim, character for character", () => {
  const priced = problems.seedCompanies.filter((company) => company.amount.trim());
  assert.ok(priced.length > 0, "no figures to check");
  priced.forEach((company) => {
    const back = sync.companyFromRow(rowOf(company));
    assert.strictEqual(back.amount, company.amount, company.name + " lost its figure in the round trip");
    assert.strictEqual(back.amountNote, company.amountNote, company.name + " lost its provenance note");
  });
});

test("unreadable entries are dropped while readable ones keep their order", () => {
  const rows = [null, 7, "company", rowOf(first()), { id: "x" }, rowOf(problems.seedCompanies[1])];
  const read = sync.companiesFromRows(rows);
  assert.strictEqual(read.length, 2);
  assert.strictEqual(read[0].id, problems.seedCompanies[0].id);
  assert.strictEqual(read[1].id, problems.seedCompanies[1].id);
});

test("anything that is not an array of rows reads as nothing, not as a crash", () => {
  [null, undefined, "rows", 7, {}].forEach((value) => {
    assert.deepStrictEqual(sync.companiesFromRows(value), []);
  });
});

test("a Postgres error keeps its SQLSTATE, so a refusal is recognisable", () => {
  assert.strictEqual(reason({ code: "42501", message: "permission denied for table companies" }), "42501 permission denied for table companies");
  assert.strictEqual(reason({ message: "no code" }), "no code");
  assert.strictEqual(reason(null), "unknown Supabase error");
});

// The trap this guards: swallowing the error Next throws to say "this route cannot be static" means
// the route is prerendered once at build time and that snapshot is served to everybody afterwards.
test("Next's control-flow digests are recognised so they can be rethrown, not swallowed", () => {
  assert.strictEqual(isNextControlFlow({ digest: "DYNAMIC_SERVER_USAGE" }), true);
  assert.strictEqual(isNextControlFlow({ digest: "NEXT_REDIRECT" }), true);
  assert.strictEqual(isNextControlFlow({ digest: "NEXT_NOT_FOUND" }), true);
  assert.strictEqual(isNextControlFlow(new Error("a real failure")), false);
  assert.strictEqual(isNextControlFlow(null), false);
  assert.strictEqual(isNextControlFlow({ digest: 7 }), false);
});

test("an error becomes a message, and something that is not one still does", () => {
  assert.strictEqual(messageOf(new Error("boom"), "fallback"), "boom");
  assert.strictEqual(messageOf("a string", "fallback"), "fallback");
  assert.strictEqual(messageOf(undefined, "unknown read failure"), "unknown read failure");
});

console.log("\n" + passed + " passed, " + failed + " failed");
if (failed > 0) process.exit(1);
