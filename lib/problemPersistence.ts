// oppie.lab — client-only persistence for problem records.
//
// React-free on purpose, so the storage rules can be exercised in plain Node by
// `pnpm test`. `lib/problemStore.ts` is the thin React hook over this.
//
// The one rule that matters: a checked 0 and an unchecked blank are DIFFERENT.
// 0 means "checked, and the answer is no". null means "not checked yet".
// Collapsing them would silently turn a missing check into a zero score.

import { blankSignals, emptyProblem, seedProblems, signalDefs, type Evidence, type Problem, type Score, type Signal } from "./problems";

export const PROBLEMS_STORAGE_KEY = "oppie.lab.problems";
export const PROBLEMS_SCHEMA_VERSION = 1;

export type PersistedProblems = {
  version: number;
  problems: Problem[];
};

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export const freshProblemSeed = (): Problem[] => clone(seedProblems);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Only 0–3 are scores. Anything else — including the string "0" — becomes null. */
export function normalizeScore(raw: unknown): Score {
  if (typeof raw !== "number") return null;
  if (!Number.isFinite(raw)) return null;
  const rounded = Math.round(raw);
  if (rounded < 0 || rounded > 3) return null;
  return rounded as Score;
}

/**
 * Signals are rebuilt from the definitions rather than trusted from storage, so a
 * renamed or added dimension cannot leave a record with a signal nobody asked about.
 */
export function normalizeSignals(raw: unknown): Signal[] {
  const stored = Array.isArray(raw) ? raw : [];
  return blankSignals().map((blank) => {
    const match = stored.find((entry) => isRecord(entry) && entry.key === blank.key);
    if (!isRecord(match)) return blank;
    return {
      key: blank.key,
      question: typeof match.question === "string" && match.question ? match.question : blank.question,
      value: normalizeScore(match.value),
      note: typeof match.note === "string" ? match.note : ""
    };
  });
}

export function normalizeEvidence(raw: unknown, fallbackId: string): Evidence | null {
  if (!isRecord(raw)) return null;
  const type = typeof raw.type === "string" ? raw.type : "";
  const confidence = typeof raw.confidence === "string" ? raw.confidence : "";
  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : fallbackId,
    type: (["job", "price", "community", "report", "personal"].includes(type) ? type : "personal") as Evidence["type"],
    observation: typeof raw.observation === "string" ? raw.observation : "",
    url: typeof raw.url === "string" ? raw.url : "",
    date: typeof raw.date === "string" ? raw.date : "",
    confidence: (["direct", "reported", "inferred"].includes(confidence) ? confidence : "inferred") as Evidence["confidence"]
  };
}

export function normalizeProblem(raw: unknown, index: number): Problem | null {
  if (!isRecord(raw)) return null;
  const id = typeof raw.id === "string" && raw.id ? raw.id : `recovered-${index}`;
  const base = emptyProblem(id);
  const text = (key: keyof Problem) => (typeof raw[key] === "string" ? (raw[key] as string) : "");
  const oneOf = <T extends string>(key: keyof Problem, allowed: readonly T[], fallback: T): T => {
    const value = raw[key];
    return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
  };

  return {
    ...base,
    id,
    title: text("title"),
    gate: oneOf("gate", ["G1-signal", "G2-paid", "G3-repeated", "G4-buyer", "G5-tested"] as const, base.gate),
    action: oneOf("action", ["idle", "researching", "interviewing", "hand-running", "building"] as const, base.action),
    verdict: oneOf("verdict", ["open", "parked", "killed"] as const, base.verdict),
    domain: text("domain"),
    market: text("market"),
    what: text("what"),
    affectedRole: text("affectedRole"),
    buyer: text("buyer"),
    workaround: text("workaround"),
    frequency: text("frequency"),
    consequence: text("consequence"),
    whyTheyPay: text("whyTheyPay"),
    paidToday: text("paidToday"),
    competition: text("competition"),
    path: oneOf("path", ["service", "product", "undecided"] as const, base.path),
    signals: normalizeSignals(raw.signals),
    nextQuestion: text("nextQuestion"),
    unknowns: text("unknowns"),
    killReason: text("killReason"),
    evidence: Array.isArray(raw.evidence)
      ? raw.evidence.map((item, i) => normalizeEvidence(item, `${id}-e${i + 1}`)).filter((item): item is Evidence => item !== null)
      : [],
    companyIds: Array.isArray(raw.companyIds) ? raw.companyIds.filter((value): value is string => typeof value === "string") : [],
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : base.createdAt,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : base.updatedAt
  };
}

/** null means "nothing usable stored", so callers can tell absent from an empty list. */
export function readStoredProblems(): Problem[] | null {
  if (typeof window === "undefined") return null;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(PROBLEMS_STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    if (parsed.version !== PROBLEMS_SCHEMA_VERSION) return null;
    if (!Array.isArray(parsed.problems)) return null;
    return parsed.problems.map((item, i) => normalizeProblem(item, i)).filter((item): item is Problem => item !== null);
  } catch {
    return null;
  }
}

export function writeStoredProblems(problems: Problem[]): boolean {
  try {
    const payload: PersistedProblems = { version: PROBLEMS_SCHEMA_VERSION, problems };
    window.localStorage.setItem(PROBLEMS_STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function nextProblemId(existing: Problem[]): string {
  let n = existing.length + 1;
  while (existing.some((item) => item.id === `P-${String(n).padStart(3, "0")}`)) n += 1;
  return `P-${String(n).padStart(3, "0")}`;
}

export const signalDefinitionKeys = signalDefs.map((def) => def.key);
