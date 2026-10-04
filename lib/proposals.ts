// Conservative proposal generation from collected source bundles.
// A proposal is a review queue item, not a conclusion or a score.

import type { DiscoveryProposal, DiscoverySource } from "./discovery";
import { discoveryUrlKey } from "./discovery";

export type DiscoveryCompanyRef = { id: string; url: string };

const unique = (items: string[]) => Array.from(new Set(items.filter(Boolean)));

export function generateDiscoveryProposals(runId: string, sources: DiscoverySource[], companies: DiscoveryCompanyRef[] = []): DiscoveryProposal[] {
  const groups = new Map<string, DiscoverySource[]>();
  for (const source of sources.filter((item) => item.triage !== "discarded")) {
    // Collected sources record "direction · lane: query"; they group by the direction, so one run's
    // pain, business and money lanes are reviewed together. Manual sources have no " · " part.
    const key = source.foundFor.split(" · ")[0].trim() || "this direction";
    groups.set(key, [...(groups.get(key) ?? []), source]);
  }

  return Array.from(groups.entries()).map(([label, group]) => {
    const signalTypes = new Set(group.map((source) => source.signalType));
    const unknowns = [
      group.length < 2 ? "Repetition is not established yet; this bundle has one source." : "The sources repeat a theme, but the number of affected firms is unknown.",
      !signalTypes.has("pain") ? "Pain and consequence are not established by the current sources." : "The cost of the pain and the person who can approve a purchase are unknown.",
      !signalTypes.has("budget") && !signalTypes.has("price") ? "Who pays and what they pay today are not established." : "The current price may not apply to the same buyer or workflow."
    ];
    const excerpts = unique(group.map((source) => source.excerpt.trim())).slice(0, 2);
    const companyIds = unique(group
      .filter((source) => source.sourceType === "vendor")
      .flatMap((source) => companies.filter((company) => discoveryUrlKey(company.url) === discoveryUrlKey(source.url)).map((company) => company.id)));
    if (group.some((source) => source.sourceType === "vendor") && companyIds.length === 0) {
      unknowns.push("No exact existing company record is linked to the vendor source.");
    }
    return {
      id: `prop-${crypto.randomUUID()}`,
      runId,
      title: `Review repeated work around ${label}`,
      workflow: excerpts.join(" / "),
      unknowns,
      killReasons: [],
      sourceIds: group.map((source) => source.id),
      companyIds,
      status: "waiting"
    };
  });
}
