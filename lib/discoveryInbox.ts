// oppie.lab — what /inbox shows and sends, for persisted discovery records.
//
// Pure and dependency-free. The queue is a queue, not evidence: nothing here counts toward a
// Problem until a person accepts a proposal with a reason and the sources they chose.

import { PAID_TODAY_EVIDENCE_TYPES } from "./analysis";
import { discoverySourceToEvidence } from "./discoveryAcceptance";
import { validateProposalAcceptance, validateProposalRejection, type DiscoveryProposal, type DiscoverySource } from "./discovery";

export type DiscoveryInboxData = {
  /** Sources nobody has kept or discarded yet. */
  sources: DiscoverySource[];
  /** Proposals waiting for a decision. */
  proposals: DiscoveryProposal[];
  /** Every source a waiting proposal cites, whatever its triage state. */
  citedSources: DiscoverySource[];
  /** The most recent accepted or rejected proposals, newest first. */
  decided: DiscoveryProposal[];
};

export type ProposalCardView = {
  proposal: DiscoveryProposal;
  /** Cited sources that can still be selected as evidence. */
  selectable: DiscoverySource[];
  /** Cited sources a person discarded; shown, never selectable. */
  discarded: DiscoverySource[];
  /** Cited ids with no readable row. */
  missingIds: string[];
};

export function proposalCardView(proposal: DiscoveryProposal, cited: DiscoverySource[]): ProposalCardView {
  const byId = new Map(cited.map((source) => [source.id, source]));
  const found = proposal.sourceIds.map((id) => byId.get(id)).filter((source): source is DiscoverySource => !!source);
  return {
    proposal,
    selectable: found.filter((source) => source.triage !== "discarded"),
    discarded: found.filter((source) => source.triage === "discarded"),
    missingIds: proposal.sourceIds.filter((id) => !byId.has(id))
  };
}

export function inboxCounts(data: DiscoveryInboxData) {
  return {
    untriaged: data.sources.length,
    waiting: data.proposals.length,
    accepted: data.decided.filter((proposal) => proposal.status === "accepted").length,
    rejected: data.decided.filter((proposal) => proposal.status === "rejected").length
  };
}

/** `"new"` creates a Problem; any other value names an existing Problem to add the evidence to. */
export type AcceptanceDraft = { reason: string; sourceIds: string[]; target: string };

/**
 * The client-side check before an accept request is sent. The server repeats the reason and
 * source checks; this one also refuses a source the proposal does not cite or one that was
 * discarded, so the button cannot send something the server would only refuse later.
 */
export function acceptanceDraftError(draft: AcceptanceDraft, card: ProposalCardView): string | null {
  const base = validateProposalAcceptance(draft.reason, draft.sourceIds);
  if (base) return base;
  const allowed = new Set(card.selectable.map((source) => source.id));
  if (draft.sourceIds.some((id) => !allowed.has(id))) return "Only this proposal's own, undiscarded sources can be selected";
  if (!draft.target.trim()) return "Choose a new Problem or an existing one";
  return null;
}

export function acceptanceBody(draft: AcceptanceDraft): { reason: string; sourceIds: string[]; problemId?: string } {
  return {
    reason: draft.reason.trim(),
    sourceIds: draft.sourceIds,
    ...(draft.target !== "new" ? { problemId: draft.target } : {})
  };
}

export const rejectionDraftError = (reason: string): string | null => validateProposalRejection(reason);

/**
 * True when accepting this source can, by itself, answer the rubric's "Paid today" with yes (a
 * person-checked "nobody pays" still wins).
 * Uses the same mapping acceptance uses and the same list the rubric uses, so the warning cannot
 * drift from what actually happens.
 */
export const answersPaidToday = (source: DiscoverySource): boolean =>
  PAID_TODAY_EVIDENCE_TYPES.includes(discoverySourceToEvidence(source).type);
