// oppie.lab — client-only persistence primitives.
//
// Deliberately React-free so the storage rules (versioning, recovery, id allocation)
// can be exercised in plain Node. `lib/store.ts` is the thin React hook over this.
//
// No backend, no auth, no sync. One versioned localStorage key.

import { emptyOpportunity, seedOpportunities, type Opportunity, type Source } from "./data";

export const STORAGE_KEY = "oppie.lab.opportunities";
export const SCHEMA_VERSION = 1;

export type Persisted = {
  version: number;
  opportunities: Opportunity[];
};

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export const freshSeed = (): Opportunity[] => clone(seedOpportunities);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Storage is user-editable and outlives code changes, so anything unexpected degrades
 * to "field is empty" rather than a render crash.
 */
export function normalizeSource(raw: unknown, fallbackId: string): Source | null {
  if (!isRecord(raw)) return null;
  const confidence = raw.confidence === "strong" || raw.confidence === "moderate" || raw.confidence === "weak" ? raw.confidence : undefined;
  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : fallbackId,
    type: typeof raw.type === "string" ? (raw.type as Source["type"]) : "Other",
    label: typeof raw.label === "string" ? raw.label : "",
    url: typeof raw.url === "string" ? raw.url : "",
    note: typeof raw.note === "string" ? raw.note : "",
    confidence
  };
}

export function normalizeOpportunity(raw: unknown, index: number): Opportunity | null {
  if (!isRecord(raw)) return null;
  const id = typeof raw.id === "string" && raw.id ? raw.id : `recovered-${index}`;
  const base = emptyOpportunity(id);
  const text = (key: keyof Opportunity) => (typeof raw[key] === "string" ? (raw[key] as string) : "");
  const sources = Array.isArray(raw.sources)
    ? raw.sources.map((source, i) => normalizeSource(source, `${id}-s${i + 1}`)).filter((source): source is Source => source !== null)
    : [];
  return {
    ...base,
    id,
    title: text("title"),
    category: text("category"),
    thesis: text("thesis"),
    stage: typeof raw.stage === "string" ? (raw.stage as Opportunity["stage"]) : base.stage,
    evidenceStatus:
      raw.evidenceStatus === "early" || raw.evidenceStatus === "mixed" || raw.evidenceStatus === "crowded" ? raw.evidenceStatus : base.evidenceStatus,
    statusNote: text("statusNote"),
    evidenceSummary: text("evidenceSummary"),
    unknowns: text("unknowns"),
    buildEstimate: text("buildEstimate"),
    pricingHypothesis: text("pricingHypothesis"),
    killReason: text("killReason"),
    nextTest: text("nextTest"),
    tags: Array.isArray(raw.tags) ? raw.tags.filter((tag): tag is string => typeof tag === "string") : [],
    sources,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : base.createdAt,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : base.updatedAt
  };
}

/** Returns null when nothing usable is stored, so callers can tell "absent" from "empty list". */
export function readStored(): Opportunity[] | null {
  if (typeof window === "undefined") return null;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    // A version bump is a deliberate reset, not a silent partial merge.
    if (parsed.version !== SCHEMA_VERSION) return null;
    if (!Array.isArray(parsed.opportunities)) return null;
    return parsed.opportunities.map((item, i) => normalizeOpportunity(item, i)).filter((item): item is Opportunity => item !== null);
  } catch {
    return null;
  }
}

export function writeStored(opportunities: Opportunity[]): boolean {
  try {
    const payload: Persisted = { version: SCHEMA_VERSION, opportunities };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

/** Ids are allocated against the current list so a new draft cannot collide with an existing record. */
export function nextOpportunityId(existing: Opportunity[]): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return `opp-${crypto.randomUUID().slice(0, 8)}`;
  let n = existing.length + 1;
  while (existing.some((item) => item.id === `opp-${n}`)) n += 1;
  return `opp-${n}`;
}
