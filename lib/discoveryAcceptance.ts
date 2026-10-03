// The human decision boundary between a discovery proposal and a tracked Problem.
// This module is deliberately pure: it only maps accepted, cited source material into the
// existing Problem shape. It does not rate the problem or fill in missing evidence.

import { emptyProblem, type Evidence, type Problem } from "./problems";
import type { DiscoveryProposal, DiscoverySource } from "./discovery";

const evidenceTypeFor = (source: DiscoverySource): Evidence["type"] => {
  if (source.signalType === "price" || source.sourceType === "vendor") return "price";
  if (source.sourceType === "job") return "job";
  if (source.sourceType === "reddit") return "community";
  return "report";
};

export function discoverySourceToEvidence(source: DiscoverySource): Evidence {
  return {
    id: `ev-${source.id}`,
    type: evidenceTypeFor(source),
    observation: source.excerpt,
    url: source.url,
    date: (source.observedAt ?? source.createdAt).slice(0, 10),
    // Imported public material is reported evidence until a person checks it in the Problem.
    confidence: "reported",
    linkStatus: source.linkStatus
  };
}

export function problemFromDiscoveryProposal(
  proposal: DiscoveryProposal,
  sources: DiscoverySource[],
  id: string,
  now: string
): Problem {
  const problem = emptyProblem(id);
  const selected = sources.filter((source) => proposal.sourceIds.includes(source.id));
  return {
    ...problem,
    title: proposal.title,
    action: "researching",
    what: proposal.workflow,
    affectedRole: proposal.actor ?? "",
    buyer: proposal.payer ?? "",
    workaround: proposal.workaround ?? "",
    whyTheyPay: proposal.businessPattern ?? "",
    unknowns: proposal.unknowns.join("\n"),
    evidence: selected.map(discoverySourceToEvidence),
    companyIds: proposal.companyIds,
    createdAt: now,
    updatedAt: now
  };
}

export function mergeDiscoveryEvidence(problem: Problem, proposal: DiscoveryProposal, sources: DiscoverySource[], now: string): Problem {
  const incoming = sources
    .filter((source) => proposal.sourceIds.includes(source.id))
    .map(discoverySourceToEvidence);
  const evidence = [...problem.evidence];
  for (const item of incoming) {
    if (!evidence.some((existing) => existing.id === item.id)) evidence.push(item);
  }
  const unknowns = Array.from(new Set([
    ...problem.unknowns.split("\n").map((item) => item.trim()).filter(Boolean),
    ...proposal.unknowns.map((item) => item.trim()).filter(Boolean)
  ]));
  return {
    ...problem,
    evidence,
    companyIds: Array.from(new Set([...problem.companyIds, ...proposal.companyIds])),
    unknowns: unknowns.join("\n"),
    updatedAt: now
  };
}

// ---- The acceptance sequence, with no partial outcome.
//
// Order: claim the proposal (waiting → accepted, conditional on still waiting), write the Problem,
// record the Problem id on the proposal, mark the sources attached. If the Problem write fails the
// claim is released back to waiting, so a failed attempt leaves nothing accepted and a retry cannot
// create a second Problem. Every step is injected so each failure path is testable without a database.

export type StepResult = { ok: true } | { ok: false; error: string };

export type AcceptanceSteps = {
  /** waiting → accepted with reason and sources. `claimed: false` means it was no longer waiting. */
  claim: () => Promise<{ ok: true; claimed: boolean } | { ok: false; error: string }>;
  writeProblem: () => Promise<StepResult>;
  /** accepted → waiting again, undoing `claim`. Only called when `writeProblem` failed. */
  release: () => Promise<StepResult>;
  link: () => Promise<StepResult>;
  attachSources: () => Promise<StepResult>;
};

export type AcceptanceOutcome =
  | { ok: true; problemId: string; warning?: string }
  | { ok: false; error: string };

export async function runAcceptance(problemId: string, steps: AcceptanceSteps): Promise<AcceptanceOutcome> {
  const claim = await steps.claim();
  if ("error" in claim) return { ok: false, error: claim.error };
  if (!claim.claimed) return { ok: false, error: "The proposal is no longer waiting; it was decided elsewhere" };

  const written = await steps.writeProblem();
  if ("error" in written) {
    const released = await steps.release();
    if ("error" in released) {
      return { ok: false, error: `The Problem could not be written (${written.error}), and the proposal could not be put back to waiting (${released.error}). It shows as accepted with no Problem; reject or fix it by hand.` };
    }
    return { ok: false, error: `The Problem could not be written, so nothing was accepted: ${written.error}` };
  }

  // From here the Problem exists and the decision stands. Later failures are reported, not undone.
  const problems: string[] = [];
  const linked = await steps.link();
  if ("error" in linked) problems.push(`the Problem id was not recorded on the proposal (${linked.error})`);
  const attached = await steps.attachSources();
  if ("error" in attached) problems.push(`the selected sources were not marked kept (${attached.error})`);
  return problems.length ? { ok: true, problemId, warning: `Accepted into ${problemId}, but ${problems.join(" and ")}.` } : { ok: true, problemId };
}
