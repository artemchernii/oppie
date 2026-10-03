// oppie.lab — how a Problem's evidence got there, for /problems/[id].
//
// Pure and dependency-free. It compares the decisions stored on discovery_proposals with the
// evidence currently on the Problem, and reports both sides honestly: a source a person selected
// and later removed from the record is shown as removed, not hidden and not restored.

import type { DiscoveryProposal, DiscoverySource } from "./discovery";
import type { Evidence } from "./problems";

export type AcceptedDecision = {
  proposal: DiscoveryProposal;
  /** The run's direction, or undefined when the run row could not be read. */
  direction?: string;
  /** The sources the person selected when accepting, as stored. */
  sources: DiscoverySource[];
  /** Selected ids with no readable source row. */
  missingSourceIds: string[];
};

export type TrailSource = { source: DiscoverySource; evidenceId: string; inRecord: boolean };

export type TrailEntry = {
  proposalId: string;
  title: string;
  direction?: string;
  reason?: string;
  /** YYYY-MM-DD, or undefined when not stored. */
  decidedOn?: string;
  sources: TrailSource[];
  missingSourceIds: string[];
};

/** The evidence id acceptance writes for a source. Must match `discoverySourceToEvidence`. */
export const evidenceIdForSource = (sourceId: string) => `ev-${sourceId}`;

export function problemTrail(evidence: Evidence[], decisions: AcceptedDecision[]): TrailEntry[] {
  const present = new Set(evidence.map((item) => item.id));
  return decisions.map(({ proposal, direction, sources, missingSourceIds }) => ({
    proposalId: proposal.id,
    title: proposal.title,
    direction: direction?.trim() || undefined,
    reason: proposal.decisionReason?.trim() || undefined,
    decidedOn: proposal.decidedAt ? proposal.decidedAt.slice(0, 10) : undefined,
    sources: sources.map((source) => {
      const evidenceId = evidenceIdForSource(source.id);
      return { source, evidenceId, inRecord: present.has(evidenceId) };
    }),
    missingSourceIds
  }));
}

/**
 * Evidence id → the decision that brought it in. Evidence typed in by hand has no entry, and the
 * page shows nothing extra for it — absence of a trail is not a mark against it.
 */
export function evidenceOrigins(trail: TrailEntry[]): Map<string, { proposalId: string; decidedOn?: string }> {
  const origins = new Map<string, { proposalId: string; decidedOn?: string }>();
  for (const entry of trail) {
    for (const item of entry.sources) {
      if (!origins.has(item.evidenceId)) origins.set(item.evidenceId, { proposalId: entry.proposalId, decidedOn: entry.decidedOn });
    }
  }
  return origins;
}
