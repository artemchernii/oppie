// oppie.lab — the gate's rules.
//
// The failure that matters is a gate that lets everyone in when it is misconfigured.
// Every assertion here is about failing closed, plus the tamper and expiry cases that
// a hand-rolled cookie gets wrong.

const assert = require("assert");
const path = require("path");

const OUT = path.join(__dirname, "..", ".tmp-test");
const auth = require(path.join(OUT, "auth.js"));

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

const SECRET = "a-long-random-secret";
const NOW = 1_700_000_000_000;

test("no configured password means nobody gets in", () => {
  assert.strictEqual(auth.checkPassword("", ""), false);
  assert.strictEqual(auth.checkPassword("anything", ""), false);
  assert.strictEqual(auth.checkPassword("", "hunter2"), false);
  assert.strictEqual(auth.checkPassword("hunter2", "hunter2"), true);
});

test("no configured secret means no session verifies", () => {
  const token = auth.signSession(auth.sessionExpiry(NOW), SECRET);
  assert.strictEqual(auth.verifySession(token, "", NOW), false);
  assert.strictEqual(auth.verifySession("", SECRET, NOW), false);
  assert.strictEqual(auth.verifySession(null, SECRET, NOW), false);
  assert.strictEqual(auth.verifySession(undefined, SECRET, NOW), false);
});

test("signing refuses without a secret rather than emitting a forgeable token", () => {
  assert.throws(() => auth.signSession(auth.sessionExpiry(NOW), ""), /no secret/);
});

test("the gate is only considered configured with both values", () => {
  assert.strictEqual(auth.authConfig({}).configured, false);
  assert.strictEqual(auth.authConfig({ APP_PASSWORD: "x" }).configured, false);
  assert.strictEqual(auth.authConfig({ APP_SECRET: "y" }).configured, false);
  assert.strictEqual(auth.authConfig({ APP_PASSWORD: "x", APP_SECRET: "y" }).configured, true);
});

test("a freshly signed session verifies", () => {
  const token = auth.signSession(auth.sessionExpiry(NOW), SECRET);
  assert.strictEqual(auth.verifySession(token, SECRET, NOW), true);
  assert.strictEqual(auth.verifySession(token, SECRET, NOW + 1000), true);
});

test("a session signed with a different secret does not verify", () => {
  const token = auth.signSession(auth.sessionExpiry(NOW), "someone-elses-secret");
  assert.strictEqual(auth.verifySession(token, SECRET, NOW), false);
});

test("an expired session does not verify, and the boundary is exact", () => {
  const expiry = auth.sessionExpiry(NOW);
  const token = auth.signSession(expiry, SECRET);
  assert.strictEqual(auth.verifySession(token, SECRET, expiry - 1), true);
  assert.strictEqual(auth.verifySession(token, SECRET, expiry), false, "the expiry instant is already out");
  assert.strictEqual(auth.verifySession(token, SECRET, expiry + 86_400_000), false);
});

test("editing the expiry to extend your own session invalidates it", () => {
  const token = auth.signSession(auth.sessionExpiry(NOW), SECRET);
  const [, nonce, signature] = token.split(".");
  const forged = `${auth.sessionExpiry(NOW) + 999_999}.${nonce}.${signature}`;
  assert.strictEqual(auth.verifySession(forged, SECRET, NOW), false);
});

test("editing the signature invalidates it", () => {
  const token = auth.signSession(auth.sessionExpiry(NOW), SECRET);
  const [expiry, nonce, signature] = token.split(".");
  const flipped = signature.slice(0, -1) + (signature.slice(-1) === "A" ? "B" : "A");
  assert.strictEqual(auth.verifySession(`${expiry}.${nonce}.${flipped}`, SECRET, NOW), false);
});

test("a structurally wrong token is rejected, not thrown on", () => {
  for (const bad of ["", "a", "a.b", "a.b.c.d", "....", "not.a.token"]) {
    assert.strictEqual(auth.verifySession(bad, SECRET, NOW), false, `rejected: ${JSON.stringify(bad)}`);
  }
});

test("two sessions signed at the same moment are different tokens", () => {
  const a = auth.signSession(auth.sessionExpiry(NOW), SECRET);
  const b = auth.signSession(auth.sessionExpiry(NOW), SECRET);
  assert.notStrictEqual(a, b, "a reused token would let one session stand in for another");
});

test("the token carries no secret material", () => {
  const token = auth.signSession(auth.sessionExpiry(NOW), SECRET);
  assert.ok(!token.includes(SECRET));
  assert.ok(!token.includes(auth.SESSION_COOKIE));
});

test("comparison does not leak length", () => {
  assert.strictEqual(auth.safeEqual("short", "a-much-longer-value"), false);
  assert.strictEqual(auth.safeEqual("", "x"), false);
  assert.strictEqual(auth.safeEqual("same", "same"), true);
});

// --- logging in ---------------------------------------------------------------

const ENV = { APP_PASSWORD: "correct horse", APP_SECRET: SECRET };

test("a wrong password produces no cookie at all", () => {
  const outcome = auth.loginOutcome("wrong", ENV, NOW);
  assert.strictEqual(outcome.ok, false);
  assert.strictEqual(outcome.reason, "wrong-password");
  assert.strictEqual(outcome.cookie, undefined);
});

test("an unconfigured deploy is refused as a setting, not as a wrong password", () => {
  // The two are reported differently on purpose: one is a typo, the other is a missing
  // variable, and telling the owner the wrong one sends them hunting for a mistake they did
  // not make.
  assert.strictEqual(auth.loginOutcome("correct horse", {}, NOW).reason, "unconfigured");
  assert.strictEqual(auth.loginOutcome("correct horse", { APP_PASSWORD: "correct horse" }, NOW).reason, "unconfigured");
  assert.strictEqual(auth.loginOutcome("correct horse", { APP_SECRET: SECRET }, NOW).reason, "unconfigured");
});

test("an unconfigured deploy outranks a wrong password", () => {
  assert.strictEqual(auth.loginOutcome("anything at all", {}, NOW).reason, "unconfigured");
});

test("the right password produces a cookie that verifies", () => {
  const outcome = auth.loginOutcome("correct horse", ENV, NOW);
  assert.strictEqual(outcome.ok, true);
  assert.strictEqual(outcome.cookie.name, auth.SESSION_COOKIE);
  assert.strictEqual(auth.verifySession(outcome.cookie.value, SECRET, NOW), true);
  // and it does not verify forever
  assert.strictEqual(auth.verifySession(outcome.cookie.value, SECRET, auth.sessionExpiry(NOW) + 1), false);
});

test("the cookie is httpOnly, same-site and outlasts the tab", () => {
  const { options } = auth.sessionCookie(SECRET, NOW);
  assert.strictEqual(options.httpOnly, true);
  assert.strictEqual(options.sameSite, "lax");
  assert.strictEqual(options.path, "/");
  assert.strictEqual(options.maxAge, auth.SESSION_MAX_AGE);
});

test("the cookie carries neither the password nor the secret", () => {
  const { value } = auth.sessionCookie(SECRET, NOW);
  assert.ok(!value.includes("correct horse"));
  assert.ok(!value.includes(SECRET));
});

test("the secure flag follows the caller rather than being assumed", () => {
  // A Secure cookie is dropped over plain http, which is every local dev request — the gate
  // would then look broken in the one place it is hardest to debug.
  assert.strictEqual(auth.sessionCookie(SECRET, NOW, true).options.secure, true);
  assert.strictEqual(auth.sessionCookie(SECRET, NOW, false).options.secure, false);
});

test("locking clears the cookie rather than storing an empty valid one", () => {
  const cleared = auth.clearedCookie();
  assert.strictEqual(cleared.name, auth.SESSION_COOKIE);
  assert.strictEqual(cleared.value, "");
  assert.strictEqual(cleared.options.maxAge, 0);
  assert.strictEqual(auth.verifySession(cleared.value, SECRET, NOW), false);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
