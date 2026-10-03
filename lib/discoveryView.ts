// oppie.lab — what /discover shows for one persisted run.
//
// Pure and dependency-free, so it is tested without a database. It only rearranges stored rows:
// it never writes a rating, a price, a region signal or a conclusion. Every figure it shows is a
// count of rows, and every sentence it shows was stored by ingestion or proposal generation.

import type { DiscoveryProposal, DiscoveryRun, DiscoverySignalType, DiscoverySource } from "./discovery";

/** A company linked to a proposal, as stored. `amount` is verbatim and never parsed or summed. */
export type DiscoveryCompanyView = {
  id: string;
  name: string;
  role: string;
  amount: string;
  location: string;
};

export type DiscoveryRunData = {
  run: DiscoveryRun;
  sources: DiscoverySource[];
  proposals: DiscoveryProposal[];
  companies: DiscoveryCompanyView[];
};

export type SignalGroup = {
  /** Plain label for the reader. */
  label: string;
  signals: DiscoverySignalType[];
  sources: DiscoverySource[];
};

export type CandidateView = {
  proposal: DiscoveryProposal;
  /** Sources the proposal cites that this run still has, discarded ones excluded. */
  sources: DiscoverySource[];
  /** Cited ids with no readable source row. Shown, never silently dropped. */
  missingSourceIds: string[];
  /** Cited sources a person has discarded since the proposal was built. */
  discardedSourceIds: string[];
  signalGroups: SignalGroup[];
  companies: DiscoveryCompanyView[];
  /** Linked company ids with no readable company row. */
  missingCompanyIds: string[];
};

export type RunView = {
  run: DiscoveryRun;
  counts: { sources: number; untriaged: number; attached: number; discarded: number; proposals: number; waiting: number };
  candidates: CandidateView[];
};

/**
 * Signals grouped the way the method reads them: what the work is, whether it hurts, and whether
 * money already moves. Demand and context are kept apart from pain on purpose — a trend is not a
 * complaint, and a complaint is not a budget.
 */
const SIGNAL_GROUPS: Array<Omit<SignalGroup, "sources">> = [
  { label: "Work", signals: ["workflow"] },
  { label: "Pain", signals: ["pain"] },
  { label: "Money", signals: ["budget", "price"] },
  { label: "Demand and context", signals: ["demand", "context"] }
];

export function candidateView(proposal: DiscoveryProposal, sources: DiscoverySource[], companies: DiscoveryCompanyView[]): CandidateView {
  const byId = new Map(sources.map((source) => [source.id, source]));
  const cited = proposal.sourceIds.map((id) => byId.get(id));
  const live = cited.filter((source): source is DiscoverySource => !!source && source.triage !== "discarded");
  const companyById = new Map(companies.map((company) => [company.id, company]));
  return {
    proposal,
    sources: live,
    missingSourceIds: proposal.sourceIds.filter((id) => !byId.has(id)),
    discardedSourceIds: proposal.sourceIds.filter((id) => byId.get(id)?.triage === "discarded"),
    signalGroups: SIGNAL_GROUPS.map((group) => ({ ...group, sources: live.filter((source) => group.signals.includes(source.signalType)) })),
    companies: proposal.companyIds.map((id) => companyById.get(id)).filter((company): company is DiscoveryCompanyView => !!company),
    missingCompanyIds: proposal.companyIds.filter((id) => !companyById.has(id))
  };
}

export function runView(data: DiscoveryRunData): RunView {
  const { run, sources, proposals, companies } = data;
  return {
    run,
    counts: {
      sources: sources.length,
      untriaged: sources.filter((source) => source.triage === "untriaged").length,
      attached: sources.filter((source) => source.triage === "attached").length,
      discarded: sources.filter((source) => source.triage === "discarded").length,
      proposals: proposals.length,
      waiting: proposals.filter((proposal) => proposal.status === "waiting").length
    },
    // Waiting first, because those are the ones asking for a decision; otherwise stored order.
    candidates: proposals
      .map((proposal, index) => ({ proposal, index }))
      .sort((a, b) => Number(b.proposal.status === "waiting") - Number(a.proposal.status === "waiting") || a.index - b.index)
      .map(({ proposal }) => candidateView(proposal, sources, companies))
  };
}

/** The label a proposal's decision state reads as. Never implies more than the stored status. */
export function proposalStatusLabel(proposal: DiscoveryProposal): string {
  if (proposal.status === "accepted") return "accepted by a person";
  if (proposal.status === "rejected") return "rejected by a person";
  return "waiting for review · not accepted";
}

export const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;
