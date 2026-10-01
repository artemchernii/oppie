// oppie.lab — the Supabase credential rules.
//
// The failure that matters is not a crash, it is a misconfigured client that reports "no records"
// instead of "no credentials". That looks like lost work, which is why every assertion here is
// about refusing loudly rather than degrading quietly.

const assert = require("assert");
const path = require("path");

const OUT = path.join(__dirname, "..", ".tmp-test");
const { supabaseConfig } = require(path.join(OUT, "supabaseConfig.js"));
const { supabaseService } = require(path.join(OUT, "supabase/service.js"));

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
const PUBLISHABLE = "sb_publishable_" + "a".repeat(31);
const SECRET = "sb_secret_" + "b".repeat(31);

// Nothing here constructs a real client. @supabase/supabase-js needs a global WebSocket to build
// one, which Node 20 does not have, so an assertion that a client was built would pass or fail on
// the runner's Node version rather than on this repo's rules. Every refusal below fires before a
// client exists.

test("no configured url means nothing is configured at all", () => {
  const config = supabaseConfig({ SUPABASE_SECRET_KEY: SECRET, SUPABASE_PUBLISHABLE_KEY: PUBLISHABLE });
  assert.strictEqual(config.configured, false);
  assert.strictEqual(config.userConfigured, false);
});

test("the two keys are separate settings, not one", () => {
  // Acting as a person needs the publishable key. Privileged work needs the secret key. Confusing
  // them is the mistake worth catching, so they are reported separately rather than together.
  const user = supabaseConfig({ SUPABASE_URL: URL, SUPABASE_PUBLISHABLE_KEY: PUBLISHABLE });
  assert.strictEqual(user.userConfigured, true);
  assert.strictEqual(user.configured, false);

  const service = supabaseConfig({ SUPABASE_URL: URL, SUPABASE_SECRET_KEY: SECRET });
  assert.strictEqual(service.userConfigured, false);
  assert.strictEqual(service.configured, true);

  const both = supabaseConfig({ SUPABASE_URL: URL, SUPABASE_PUBLISHABLE_KEY: PUBLISHABLE, SUPABASE_SECRET_KEY: SECRET });
  assert.strictEqual(both.userConfigured, true);
  assert.strictEqual(both.configured, true);
});

test("an empty string counts as missing, not as a value", () => {
  assert.strictEqual(supabaseConfig({ SUPABASE_URL: "", SUPABASE_SECRET_KEY: SECRET }).configured, false);
  assert.strictEqual(supabaseConfig({ SUPABASE_URL: URL, SUPABASE_SECRET_KEY: "" }).configured, false);
  assert.strictEqual(supabaseConfig({ SUPABASE_URL: URL, SUPABASE_PUBLISHABLE_KEY: "" }).userConfigured, false);
});

test("the privileged client refuses to be built without both values", () => {
  assert.throws(() => supabaseService({ SUPABASE_URL: URL }), /must both be set/);
  assert.throws(() => supabaseService({}), /must both be set/);
});

test("the privileged client will not accept a publishable key", () => {
  // Measured against the live project: this is what `sb_publishable_` in the secret slot gets you
  // — permission denied, or an empty list if the revoke is ever dropped. Either way it is not a
  // client, and it is caught before a request goes out.
  const env = { SUPABASE_URL: URL, SUPABASE_SECRET_KEY: PUBLISHABLE };
  assert.strictEqual(supabaseConfig(env).publishableKeyInSecretSlot, true);
  assert.throws(() => supabaseService(env), /publishable key/);
});

test("a real secret key is not mistaken for a publishable one", () => {
  const config = supabaseConfig({ SUPABASE_URL: URL, SUPABASE_SECRET_KEY: SECRET });
  assert.strictEqual(config.publishableKeyInSecretSlot, false);
  assert.strictEqual(config.configured, true);
});

test("values are passed through untouched, so nothing is silently rewritten", () => {
  const config = supabaseConfig({ SUPABASE_URL: URL, SUPABASE_SECRET_KEY: SECRET, SUPABASE_PUBLISHABLE_KEY: PUBLISHABLE });
  assert.strictEqual(config.url, URL);
  assert.strictEqual(config.secret, SECRET);
  assert.strictEqual(config.publishable, PUBLISHABLE);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
