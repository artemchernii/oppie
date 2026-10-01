// oppie.lab — the Supabase credential rules.
//
// The failure that matters is not a crash, it is a misconfigured client that reports "no
// records" instead of "no credentials". That looks like lost work, and it is the reason
// every assertion here is about refusing loudly rather than degrading quietly.

const assert = require("assert");
const path = require("path");

const OUT = path.join(__dirname, "..", ".tmp-test");
const { supabaseConfig } = require(path.join(OUT, "supabaseConfig.js"));
const { supabaseServer } = require(path.join(OUT, "supabaseServer.js"));

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

const URL = "https://example.supabase.co";
const SECRET = "sb_secret_" + "a".repeat(31);
const PUBLISHABLE = "sb_publishable_" + "a".repeat(31);

test("no configured url means nothing is configured", () => {
  assert.strictEqual(supabaseConfig({ SUPABASE_SECRET_KEY: SECRET }).configured, false);
});

test("no configured secret means nothing is configured", () => {
  assert.strictEqual(supabaseConfig({ SUPABASE_URL: URL }).configured, false);
});

test("configured requires both values, not either", () => {
  assert.strictEqual(supabaseConfig({}).configured, false);
  assert.strictEqual(supabaseConfig({ SUPABASE_URL: URL, SUPABASE_SECRET_KEY: SECRET }).configured, true);
});

test("an empty string counts as missing, not as a value", () => {
  assert.strictEqual(supabaseConfig({ SUPABASE_URL: "", SUPABASE_SECRET_KEY: SECRET }).configured, false);
  assert.strictEqual(supabaseConfig({ SUPABASE_URL: URL, SUPABASE_SECRET_KEY: "" }).configured, false);
});

test("the client refuses to be built without both values", () => {
  assert.throws(() => supabaseServer({ SUPABASE_URL: URL }), /must both be set/);
  assert.throws(() => supabaseServer({}), /must both be set/);
});

test("a publishable key in the secret slot is refused rather than trusted", () => {
  // The database would answer this with an empty list and no error at all.
  const env = { SUPABASE_URL: URL, SUPABASE_SECRET_KEY: PUBLISHABLE };
  assert.strictEqual(supabaseConfig(env).publishableKeyInSecretSlot, true);
  assert.throws(() => supabaseServer(env), /publishable key/);
});

test("a real secret key is not mistaken for a publishable one", () => {
  const env = { SUPABASE_URL: URL, SUPABASE_SECRET_KEY: SECRET };
  assert.strictEqual(supabaseConfig(env).publishableKeyInSecretSlot, false);
  assert.doesNotThrow(() => supabaseServer(env));
});

test("values are passed through untouched, so nothing is silently rewritten", () => {
  const config = supabaseConfig({ SUPABASE_URL: URL, SUPABASE_SECRET_KEY: SECRET });
  assert.strictEqual(config.url, URL);
  assert.strictEqual(config.secret, SECRET);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
