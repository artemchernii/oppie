// oppie.lab — the backend contract for a traceable discovery run.
//
// Dependency-free by design: this defines the collection/review boundary. It does not fetch
// sources, infer pain, or create Problems by itself.

export type DiscoveryStatus = "queued" | "collecting" | "ready" | "failed";
export type DiscoverySourceType = "reddit" | "job" | "freelance" | "vendor" | "trend" | "manual";
export type DiscoverySignalType = "workflow" | "pain" | "budget" | "price" | "demand" | "context";
export type DiscoveryTriage = "untriaged" | "attached" | "discarded";
export type DiscoveryProposalStatus = "waiting" | "accepted" | "rejected";

export type DiscoveryInput = {
  direction: string;
  geography?: string;
  role?: string;
  workflow?: string;
  constraint?: string;
};

export type DiscoveryRun = DiscoveryInput & {
  id: string;
  status: DiscoveryStatus;
  error?: string;
  createdAt: string;
  updatedAt: string;
};

export type DiscoverySource = {
  id: string;
  runId: string;
  sourceType: DiscoverySourceType;
  signalType: DiscoverySignalType;
  url: string;
  title: string;
  publisher?: string;
  observedAt?: string;
  excerpt: string;
  citation?: string;
  foundFor: string;
  linkStatus: "checked" | "dead" | "unverified";
  triage: DiscoveryTriage;
  createdAt: string;
};

export type DiscoverySourceInput = Omit<DiscoverySource, "id" | "runId" | "createdAt" | "triage">;

/** Shared mapping for run reads, inbox reads, and proposal generation. */
export function discoverySourceFromRow(row: Record<string, unknown>): DiscoverySource {
  return {
    id: String(row.id),
    runId: String(row.run_id),
    sourceType: (["reddit", "job", "freelance", "vendor", "trend", "manual"] as const).includes(row.source_type as DiscoverySourceType) ? row.source_type as DiscoverySourceType : "manual",
    // An unrecognised signal is filed as context, the weakest kind: it must never read as pain or budget.
    signalType: (["workflow", "pain", "budget", "price", "demand", "context"] as const).includes(row.signal_type as DiscoverySignalType) ? row.signal_type as DiscoverySignalType : "context",
    url: String(row.url),
    title: String(row.title ?? ""),
    publisher: typeof row.publisher === "string" ? row.publisher : undefined,
    observedAt: typeof row.observed_at === "string" ? row.observed_at : undefined,
    excerpt: String(row.excerpt ?? ""),
    citation: typeof row.citation === "string" ? row.citation : undefined,
    foundFor: String(row.found_for ?? ""),
    linkStatus: (["checked", "dead"] as const).includes(row.link_status as "checked" | "dead") ? row.link_status as DiscoverySource["linkStatus"] : "unverified",
    // Unknown triage stays untriaged: a source counts in nothing until a person attaches it.
    triage: (["attached", "discarded"] as const).includes(row.triage as "attached" | "discarded") ? row.triage as DiscoveryTriage : "untriaged",
    createdAt: String(row.created_at)
  };
}

export type DiscoveryProposal = {
  id: string;
  runId: string;
  title: string;
  workflow: string;
  actor?: string;
  payer?: string;
  workaround?: string;
  businessPattern?: string;
  unknowns: string[];
  killReasons: string[];
  sourceIds: string[];
  companyIds: string[];
  status: DiscoveryProposalStatus;
  decisionReason?: string;
  decidedAt?: string;
  /** The Problem an accepted proposal created or was linked to. */
  problemId?: string;
};

const optionalText = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value : undefined;
const textList = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(String).filter((item) => item.trim()) : [];

const PROPOSAL_STATUSES: DiscoveryProposalStatus[] = ["waiting", "accepted", "rejected"];
const RUN_STATUSES: DiscoveryStatus[] = ["queued", "collecting", "ready", "failed"];

/**
 * A stored proposal, read back. Blank optional fields stay absent so the page renders "Not added
 * yet" — an empty string is not a payer. An unrecognised status reads as `waiting`, never as
 * `accepted`: the one direction a bad row must not drift is towards a decision nobody made.
 */
export function discoveryProposalFromRow(row: Record<string, unknown>): DiscoveryProposal {
  const status = PROPOSAL_STATUSES.includes(row.status as DiscoveryProposalStatus) ? row.status as DiscoveryProposalStatus : "waiting";
  return {
    id: String(row.id),
    runId: String(row.run_id),
    title: String(row.title ?? ""),
    workflow: String(row.workflow ?? ""),
    actor: optionalText(row.actor),
    payer: optionalText(row.payer),
    workaround: optionalText(row.workaround),
    businessPattern: optionalText(row.business_pattern),
    unknowns: textList(row.unknowns),
    killReasons: textList(row.kill_reasons),
    sourceIds: textList(row.source_ids),
    companyIds: textList(row.company_ids),
    status,
    decisionReason: optionalText(row.decision_reason),
    decidedAt: optionalText(row.decided_at),
    problemId: optionalText(row.problem_id)
  };
}

/** A stored run, read back. An unrecognised status reads as `failed`, so it is never shown as ready. */
export function discoveryRunFromRow(row: Record<string, unknown>): DiscoveryRun {
  return {
    id: String(row.id),
    direction: String(row.direction ?? ""),
    geography: optionalText(row.geography),
    role: optionalText(row.role),
    workflow: optionalText(row.workflow),
    constraint: optionalText(row.constraint_text),
    status: RUN_STATUSES.includes(row.status as DiscoveryStatus) ? row.status as DiscoveryStatus : "failed",
    error: optionalText(row.error),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? "")
  };
}

export function validateDiscoveryInput(input: DiscoveryInput): string | null {
  if (!input.direction.trim()) return "A direction is required";
  if (input.direction.trim().length > 500) return "A direction must be 500 characters or fewer";
  return null;
}

export function newDiscoveryRun(input: DiscoveryInput, id = `run-${crypto.randomUUID()}`, now = new Date().toISOString()): DiscoveryRun {
  const error = validateDiscoveryInput(input);
  if (error) throw new Error(error);
  return {
    id,
    direction: input.direction.trim(),
    geography: input.geography?.trim() || undefined,
    role: input.role?.trim() || undefined,
    workflow: input.workflow?.trim() || undefined,
    constraint: input.constraint?.trim() || undefined,
    status: "queued",
    createdAt: now,
    updatedAt: now
  };
}

export function validateProposalAcceptance(reason: string, sourceIds: string[]): string | null {
  if (!reason.trim()) return "An acceptance reason is required";
  if (sourceIds.length === 0) return "At least one source is required";
  return null;
}

/** What a run's status becomes after an event. A later success clears an earlier failure. */
export type RunEvent = "source-saved" | "proposals-built" | "failed";
export function runStatusAfter(event: RunEvent): DiscoveryStatus {
  if (event === "failed") return "failed";
  return event === "proposals-built" ? "ready" : "collecting";
}

/** A failed run is inspectable, never a source of an accepted Problem. */
export function acceptanceBlockedByRun(run: Pick<DiscoveryRun, "status" | "error"> | null): string | null {
  if (!run) return "The proposal's run could not be read";
  if (run.status === "failed") return `This proposal's run failed${run.error ? ` (${run.error})` : ""}. Retry the failed step before accepting.`;
  return null;
}

/** A rejection is a decision too, so it carries its reason the same way an acceptance does. */
export function validateProposalRejection(reason: string): string | null {
  if (!reason.trim()) return "A rejection reason is required";
  return null;
}

export function discoveryUrlKey(url: string): string {
  try {
    const parsed = new URL(url.trim());
    const query = Array.from(parsed.searchParams.entries())
      .filter(([key]) => !/^utm_/i.test(key) && !["ref", "referrer", "source"].includes(key.toLowerCase()))
      .sort(([a], [b]) => a.localeCompare(b));
    const search = new URLSearchParams(query).toString();
    return `${parsed.hostname.toLowerCase().replace(/^www\./, "")}${parsed.pathname.replace(/\/+$/, "") || "/"}${search ? `?${search}` : ""}`;
  } catch {
    return url.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/[?#].*$/, "").replace(/\/+$/, "");
  }
}

export function canonicalDiscoveryUrl(url: string): string {
  const key = discoveryUrlKey(url);
  return key ? `https://${key}` : "";
}

export function validateDiscoverySource(input: DiscoverySourceInput): string | null {
  if (!discoveryUrlKey(input.url)) return "A source URL is required";
  if (!input.excerpt.trim()) return "A source excerpt is required";
  if (!input.foundFor.trim()) return "Source provenance is required";
  return null;
}
