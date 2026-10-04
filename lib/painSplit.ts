// oppie.lab — split one run's sources into distinct pains, each with the businesses selling a fix.
//
// A language model reads the run and SUGGESTS the split. This file does not trust it: every
// claim is checked against the stored sources before anything is kept.
//   - a cited source must exist in this run;
//   - every quote must appear word for word in that source's excerpt (whitespace and case aside);
//   - a pain survives only with at least one correctly quoted pain-lane source;
//   - a business must be a business-lane source, and its price is kept only if quoted verbatim.
// Whatever fails a check is dropped and counted, never repaired. The result is a set of waiting
// proposals — a person still accepts or rejects each one in Inbox. Nothing here scores, sizes a
// market, or invents a price. Network access is injected, so this file is testable offline.

import type { DiscoveryProposal, DiscoverySource } from "./discovery";

export type SplitBusiness = { sourceId: string; name: string; offer: string; priceQuote: string };
export type SplitPain = {
  name: string;
  who: string;
  description: string;
  evidence: Array<{ sourceId: string; quote: string }>;
  businesses: SplitBusiness[];
  unknowns: string[];
};
export type SplitResponse = { pains: SplitPain[] };

export type CheckedPain = SplitPain & { painSourceIds: string[]; businessSourceIds: string[] };
export type SplitReport = { pains: CheckedPain[]; dropped: { quotes: number; businesses: number; prices: number; pains: number } };

const BUSINESS_LANE = " · business:";
const isBusinessSource = (source: DiscoverySource) => source.foundFor.includes(BUSINESS_LANE) || source.sourceType === "vendor";
const isPainSource = (source: DiscoverySource) => !isBusinessSource(source);

const normalise = (text: string) => text.toLowerCase().replace(/[“”"']/g, "").replace(/\s+/g, " ").trim();
/** True when `quote` appears in `text` word for word, ignoring case, quotes and whitespace. */
export const quotedVerbatim = (quote: string, text: string) => {
  const q = normalise(quote);
  return q.length >= 8 && normalise(text).includes(q);
};

export const SPLIT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["pains"],
  properties: {
    pains: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "who", "description", "evidence", "businesses", "unknowns"],
        properties: {
          name: { type: "string", description: "Short name of the pain: who suffers, what work, what breaks. Max 90 characters." },
          who: { type: "string", description: "The role doing the painful work, only as stated in the sources; empty if not stated." },
          description: { type: "string", description: "Two sentences: the work and what goes wrong, using only what the quotes say." },
          evidence: {
            type: "array",
            items: {
              type: "object", additionalProperties: false, required: ["sourceId", "quote"],
              properties: { sourceId: { type: "string", description: "The source label, e.g. S3." }, quote: { type: "string", description: "Exact words copied from that source's excerpt." } }
            }
          },
          businesses: {
            type: "array",
            items: {
              type: "object", additionalProperties: false, required: ["sourceId", "name", "offer", "priceQuote"],
              properties: {
                sourceId: { type: "string", description: "The source label, e.g. S12." }, name: { type: "string" },
                offer: { type: "string", description: "What they sell for this pain, in a few words." },
                priceQuote: { type: "string", description: "Exact price words copied from that source, or empty if it states none." }
              }
            }
          },
          unknowns: { type: "array", items: { type: "string" }, description: "What these sources do not establish about this pain." }
        }
      }
    }
  }
} as const;

/**
 * Short labels for the prompt. Models miscopy long random ids (dropping the "src-" prefix, or
 * garbling a digit), which the checker then rightly refuses. `S1`, `S2`… are easy to copy back
 * exactly; `resolveLabels` maps them to the real ids. An unknown label stays unknown and is dropped.
 */
export const sourceLabel = (index: number) => `S${index + 1}`;

export function resolveLabels(response: SplitResponse, sources: DiscoverySource[]): SplitResponse {
  const byLabel = new Map(sources.map((source, index) => [sourceLabel(index), source.id]));
  const resolve = (id: string) => byLabel.get(id.trim().replace(/^\[|\]$/g, "").toUpperCase()) ?? id;
  return {
    pains: (response.pains ?? []).map((pain) => ({
      ...pain,
      evidence: (pain.evidence ?? []).map((item) => ({ ...item, sourceId: resolve(item.sourceId) })),
      businesses: (pain.businesses ?? []).map((business) => ({ ...business, sourceId: resolve(business.sourceId) }))
    }))
  };
}

export function splitPrompt(direction: string, sources: DiscoverySource[]): { system: string; user: string } {
  const lines = sources.map((source, index) =>
    `[${sourceLabel(index)}] lane=${isBusinessSource(source) ? "business" : "pain"} type=${source.sourceType} signal=${source.signalType}\ntitle: ${source.title}\nexcerpt: ${source.excerpt}`);
  return {
    system: [
      "You help a founder find painful, repeated work that businesses already charge to fix, so a business can be copied or adapted.",
      "Group the pain-lane sources into DISTINCT pains. Two sources are the same pain only if the same kind of person struggles with the same work.",
      "For each pain, list the business-lane sources that sell a fix for THAT pain (not merely the same industry).",
      "Rules: cite sources only by their label from the list, exactly as written, e.g. S3. Every quote must be copied exactly, word for word, from that source's excerpt. Never paraphrase inside a quote.",
      "Do not estimate market size, probability, revenue or scores. Do not state a price that is not quoted. If a pain has only one source, keep it but say repetition is unknown.",
      "Skip sources that do not describe a problem. Return at most 8 pains, most evidenced first."
    ].join("\n"),
    user: `Direction: ${direction}\n\nSources:\n\n${lines.join("\n\n")}`
  };
}

/** Keep only what the stored sources support; count everything dropped. */
export function checkSplit(response: SplitResponse, sources: DiscoverySource[]): SplitReport {
  const byId = new Map(sources.map((source) => [source.id, source]));
  const dropped = { quotes: 0, businesses: 0, prices: 0, pains: 0 };
  const pains: CheckedPain[] = [];
  for (const pain of response.pains ?? []) {
    const evidence = (pain.evidence ?? []).filter((item) => {
      const source = byId.get(item.sourceId);
      const ok = !!source && isPainSource(source) && quotedVerbatim(item.quote, `${source.title} ${source.excerpt}`);
      if (!ok) dropped.quotes += 1;
      return ok;
    });
    const painSourceIds = Array.from(new Set(evidence.map((item) => item.sourceId)));
    if (painSourceIds.length === 0 || !pain.name?.trim()) { dropped.pains += 1; continue; }
    const seenBusiness = new Set<string>();
    const businesses = (pain.businesses ?? []).flatMap((business) => {
      const source = byId.get(business.sourceId);
      if (!source || !isBusinessSource(source) || seenBusiness.has(business.sourceId)) { dropped.businesses += 1; return []; }
      seenBusiness.add(business.sourceId);
      const text = `${source.title} ${source.excerpt}`;
      const priceKept = business.priceQuote?.trim() && quotedVerbatim(business.priceQuote, text) ? business.priceQuote.trim() : "";
      if (business.priceQuote?.trim() && !priceKept) dropped.prices += 1;
      return [{ ...business, name: business.name.trim() || source.publisher || source.title, priceQuote: priceKept }];
    });
    pains.push({
      ...pain, name: pain.name.trim().slice(0, 120), evidence, businesses,
      painSourceIds, businessSourceIds: businesses.map((business) => business.sourceId)
    });
  }
  return { pains, dropped };
}

/** One waiting proposal per checked pain. Repetition and payment are stated from the evidence, not the model. */
export function proposalsFromSplit(runId: string, report: SplitReport, newId: () => string = () => `prop-${crypto.randomUUID()}`): DiscoveryProposal[] {
  return report.pains.map((pain) => {
    const unknowns = [
      pain.painSourceIds.length < 2 ? "Repetition is not established yet: one source describes this pain." : `Described in ${pain.painSourceIds.length} sources; how many firms are affected is unknown.`,
      pain.businesses.length === 0 ? "No business selling a fix was found in this run." : "Whether the existing businesses fully solve this pain is unknown.",
      ...pain.unknowns.map((item) => item.trim()).filter(Boolean)
    ];
    const businessPattern = pain.businesses.length
      ? `Already sold by: ${pain.businesses.map((business) => `${business.name} — ${business.offer}${business.priceQuote ? ` (“${business.priceQuote}”)` : ""}`).join("; ")}`
      : undefined;
    return {
      id: newId(), runId, title: pain.name, workflow: pain.description.trim(),
      actor: pain.who.trim() || undefined, businessPattern,
      unknowns, killReasons: [], sourceIds: [...pain.painSourceIds, ...pain.businessSourceIds], companyIds: [], status: "waiting"
    };
  });
}

export type GatewayFetch = (url: string, init: { method: string; headers: Record<string, string>; body: string }) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown>; text: () => Promise<string> }>;

/**
 * Free-tier model by default, so splitting costs nothing until someone opts in to paid credits.
 * Checked 2026-10-04 on a real 36-source run: 3 pains kept; the checker dropped 3 misquoted
 * passages and 13 wrongly attributed businesses. For finer splits set AI_GATEWAY_MODEL to a paid
 * model such as `anthropic/claude-sonnet-5.5` (about $0.03 per run, needs AI Gateway credits).
 */
export const DEFAULT_SPLIT_MODEL = "google/gemini-2.5-flash";

/** Asks the gateway for a split. Returns the raw suggestion; callers must run `checkSplit` on it. */
export async function requestSplit(direction: string, sources: DiscoverySource[], token: string, fetchImpl: GatewayFetch, model = DEFAULT_SPLIT_MODEL): Promise<{ ok: true; value: SplitResponse } | { ok: false; error: string }> {
  const { system, user } = splitPrompt(direction, sources);
  const response = await fetchImpl("https://ai-gateway.vercel.sh/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model, stream: false, temperature: 0,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      response_format: { type: "json_schema", json_schema: { name: "pain_split", strict: true, schema: SPLIT_SCHEMA } }
    })
  });
  if (!response.ok) return { ok: false, error: `AI Gateway answered ${response.status}: ${(await response.text()).slice(0, 200)}` };
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) return { ok: false, error: "AI Gateway returned no content" };
  try {
    return { ok: true, value: resolveLabels(JSON.parse(content) as SplitResponse, sources) };
  } catch {
    return { ok: false, error: "AI Gateway returned content that is not JSON" };
  }
}
