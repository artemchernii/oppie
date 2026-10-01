// oppie.lab — the gate.
//
// One user, so one secret and one cookie. No user table, no sessions store, no
// OAuth library: those exist to manage many identities, and there is exactly one.
//
// Two properties matter more than the mechanism, and both are tested:
//   - it fails CLOSED. With no configured secret, nothing authenticates at all.
//     A misconfigured deploy locks the owner out rather than letting the world in.
//   - comparisons are timing-safe, so a wrong password leaks nothing about the
//     right one through response time.

import { createHmac, randomBytes, timingSafeEqual } from "crypto";

export const SESSION_COOKIE = "oppie_session";
export const SESSION_DAYS = 30;

const b64url = (buffer: Buffer) => buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

/** Constant-time string compare that does not leak length through an early return. */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(String(a), "utf8");
  const right = Buffer.from(String(b), "utf8");
  // Hash both sides first so differing lengths cannot short-circuit the compare.
  const leftDigest = createHmac("sha256", "compare").update(left).digest();
  const rightDigest = createHmac("sha256", "compare").update(right).digest();
  return timingSafeEqual(leftDigest, rightDigest);
}

export const checkPassword = (input: string, expected: string): boolean => {
  if (!expected) return false; // no configured password means no way in
  return safeEqual(input, expected);
};

/**
 * Session token is `<expiry>.<hmac>`. There is no server-side session list, so
 * signing out is done by clearing the cookie; the token cannot be resurrected
 * without the secret.
 */
export function signSession(expiresAt: number, secret: string, nonce?: string): string {
  if (!secret) throw new Error("refusing to sign a session with no secret");
  const payload = `${expiresAt}.${nonce ?? b64url(randomBytes(9))}`;
  const signature = b64url(createHmac("sha256", secret).update(payload).digest());
  return `${payload}.${signature}`;
}

export function verifySession(token: string | undefined | null, secret: string, now = Date.now()): boolean {
  if (!token || !secret) return false; // fail closed
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [expiry, nonce, signature] = parts;
  const expiresAt = Number(expiry);
  if (!Number.isFinite(expiresAt) || expiresAt <= now) return false;
  const expected = b64url(createHmac("sha256", secret).update(`${expiry}.${nonce}`).digest());
  return safeEqual(signature, expected);
}

export const sessionExpiry = (now = Date.now()): number => now + SESSION_DAYS * 24 * 60 * 60 * 1000;

/** Where the secret and password come from, and whether the gate is even configured. */
export function authConfig(env: Record<string, string | undefined> = process.env): {
  configured: boolean;
  password: string;
  secret: string;
} {
  const password = env.APP_PASSWORD ?? "";
  const secret = env.APP_SECRET ?? "";
  return { configured: Boolean(password && secret), password, secret };
}
