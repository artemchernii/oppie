// oppie.lab — the two things every Supabase read has to do the same way.
//
// Pure, so it can be exercised in plain Node. Shared rather than copied, because one of these is a
// trap that fails silently and a second copy of a silent failure is a second silent failure.

export type PostgrestLikeError = { code?: string | null; message?: string } | null;

/** A Supabase error as one line, with its SQLSTATE so `42501` is recognisable at a glance. */
export function reason(error: PostgrestLikeError): string {
  if (!error) return "unknown Supabase error";
  return [error.code, error.message].filter(Boolean).join(" ");
}

/**
 * Next signals "this route cannot be static" by throwing out of `cookies()` with a `digest` of
 * DYNAMIC_SERVER_USAGE. Swallowing that in a `try/catch` looks harmless and is not: the route is
 * then prerendered once at build time and every signed-in person is served whatever that build
 * happened to contain. Anything with a control-flow digest must be rethrown.
 */
export function isNextControlFlow(error: unknown): boolean {
  const digest = (error as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" && /^(DYNAMIC_SERVER_USAGE|NEXT_)/.test(digest);
}

/** An error as a message, for the ones that are not control flow. */
export function messageOf(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

/**
 * Ids for an `.in()` filter, split so each request stays a short URL. PostgREST puts the list in
 * the query string; 570 source ids made a 23 KB URL that the gateway refused with "Bad Request",
 * which took the whole inbox down. 100 ids of ~40 characters is ~4 KB.
 */
export function idChunks<T>(ids: readonly T[], size = 100): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < ids.length; i += size) chunks.push(ids.slice(i, i + size));
  return chunks;
}
