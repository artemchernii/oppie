// oppie.lab — client-only persistence for the research inbox and its proposals.
//
// Same shape as the problem store: React-free, versioned, and forgiving of anything
// unexpected in storage. Triage is user work, so losing it would be losing effort.

import { seedInbox, seedProposals, urlKey, type CollectedSource, type Proposal, type SourceStatus } from "./research";

export const RESEARCH_STORAGE_KEY = "oppie.lab.research";
export const RESEARCH_SCHEMA_VERSION = 1;

export type PersistedResearch = {
  version: number;
  sources: CollectedSource[];
  proposals: Proposal[];
};

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export const freshInbox = (): CollectedSource[] => clone(seedInbox);
export const freshProposals = (): Proposal[] => clone(seedProposals);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const oneOf = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;

export function normalizeSource(raw: unknown, index: number): CollectedSource | null {
  if (!isRecord(raw)) return null;
  const url = typeof raw.url === "string" ? raw.url : "";
  if (!url) return null;
  const collectedAt = typeof raw.collectedAt === "string" ? raw.collectedAt : new Date().toISOString();
  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : `src-recovered-${index}`,
    url,
    title: typeof raw.title === "string" ? raw.title : "",
    finding: typeof raw.finding === "string" ? raw.finding : "",
    foundFor: typeof raw.foundFor === "string" ? raw.foundFor : "",
    suggests: typeof raw.suggests === "string" ? raw.suggests : undefined,
    collectedAt,
    status: oneOf<SourceStatus>(raw.status, ["new", "kept", "spent"], "new"),
    attachTo: typeof raw.attachTo === "string" ? raw.attachTo : undefined,
    evidenceType: typeof raw.evidenceType === "string" ? (raw.evidenceType as CollectedSource["evidenceType"]) : undefined,
    confidence: typeof raw.confidence === "string" ? (raw.confidence as CollectedSource["confidence"]) : undefined,
    linkStatus: typeof raw.linkStatus === "string" ? (raw.linkStatus as CollectedSource["linkStatus"]) : "unverified"
  };
}

export function normalizeProposal(raw: unknown, index: number): Proposal | null {
  if (!isRecord(raw)) return null;
  const problemId = typeof raw.problemId === "string" ? raw.problemId : "";
  if (!problemId) return null;
  const key = typeof raw.signalKey === "string" ? raw.signalKey : "";
  if (!["pain", "pay", "moat", "speed", "cost"].includes(key)) return null;
  const rawValue = typeof raw.value === "number" ? Math.round(raw.value) : NaN;
  if (!(rawValue >= 0 && rawValue <= 3)) return null;
  const reason = typeof raw.reason === "string" ? raw.reason : "";
  // A suggestion with no reason is a bare number, which is the thing this pipeline exists to stop.
  if (!reason.trim()) return null;
  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : `prop-recovered-${index}`,
    problemId,
    signalKey: key as Proposal["signalKey"],
    value: rawValue as Proposal["value"],
    reason,
    sourceUrl: typeof raw.sourceUrl === "string" ? raw.sourceUrl : "",
    status: oneOf(raw.status, ["proposed", "accepted", "rejected"] as const, "proposed"),
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : new Date().toISOString()
  };
}

/** A proposal with no reason is a bare number, which is the thing this pipeline exists to prevent. */
export const isUsableProposal = (proposal: Proposal): boolean => proposal.reason.trim().length > 0;

export function readStoredResearch(): { sources: CollectedSource[]; proposals: Proposal[] } | null {
  if (typeof window === "undefined") return null;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(RESEARCH_STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    if (parsed.version !== RESEARCH_SCHEMA_VERSION) return null;
    const sources = Array.isArray(parsed.sources)
      ? parsed.sources.map((item, i) => normalizeSource(item, i)).filter((item): item is CollectedSource => item !== null)
      : [];
    const proposals = Array.isArray(parsed.proposals)
      ? parsed.proposals.map((item, i) => normalizeProposal(item, i)).filter((item): item is Proposal => item !== null)
      : [];
    // Re-running the same search must not create a second copy of the same page.
    const deduped: CollectedSource[] = [];
    const seen = new Set<string>();
    for (const source of sources) {
      const key = urlKey(source.url);
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(source);
    }
    return { sources: deduped, proposals };
  } catch {
    return null;
  }
}

export function writeStoredResearch(sources: CollectedSource[], proposals: Proposal[]): boolean {
  try {
    const payload: PersistedResearch = { version: RESEARCH_SCHEMA_VERSION, sources, proposals };
    window.localStorage.setItem(RESEARCH_STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}
