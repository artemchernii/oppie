// oppie.lab — automatic collection for a discovery run.
//
// Three lanes, matching the method: pain → businesses → money.
//   pain:      people describing the work as manual, slow or broken (Reddit via Brave, Hacker News)
//   business:  products and services already selling around it, with any price they publish (Brave)
//   money:     job posts paying someone to do the work (Remotive)
//
// The engine collects; it does not conclude. Every source keeps the snippet the site returned,
// verbatim, and starts unverified. A signal label is earned by the text, not by the lane: a result
// from the pain lane is labelled `pain` only if its own words describe pain, a business page is
// `price` only if it shows a price, a job is `budget` only if it states a salary. Everything else
// is `context`, the weakest label. Network access is injected, so this file is testable offline.

import type { DiscoverySignalType, DiscoverySourceInput, DiscoverySourceType } from "./discovery";

export type Lane = "pain" | "business" | "money";
export type Provider = "brave" | "hn" | "remotive";

export type CollectorQuery = { lane: Lane; provider: Provider; query: string };

export type LaneResult = { lane: Lane; provider: Provider; query: string; sources: DiscoverySourceInput[]; error?: string };

export type FetchLike = (url: string, init?: { headers?: Record<string, string> }) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

const PAIN_WORDS = /\b(manual(ly)?|by hand|spreadsheets?|tedious|painful|nightmare|hate|frustrat\w*|error[- ]prone|copy[- ]?past\w*|re-?enter\w*|chasing|headache|time[- ]consuming|takes (hours|days|forever)|\d+\s?(\+\s?)?hours? (a|per|each|every) (day|week|month)|hours (a|per|each|every) (day|week|month)|waste[sd]? (hours|time|days))\b/i;
const PRICE = /([$€£]\s?\d[\d,.]*\s?[kKmM]?)|(\d[\d,.]*\s?(usd|eur|gbp))|(per (user|seat|month|year)|\/\s?(mo|month|yr|year|user|seat))|\b(pricing|price[sd]?|plans?)\b.*\d/i;

export function decodeEntities(text: string): string {
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}

export const describesPain = (text: string) => PAIN_WORDS.test(text);

const STOPWORDS = new Set(["the", "and", "for", "with", "that", "this", "from", "into", "what", "who", "how", "are", "our", "your", "in", "of", "on", "to", "a", "an", "or", "at", "by", "is", "it", "still", "do", "does", "work", "things"]);
/** The words of a direction that a result must mention to count as about it. */
export function directionTerms(direction: string): string[] {
  return Array.from(new Set(direction.toLowerCase().split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word))
    .map((word) => word.replace(/s$/, ""))));
}
/** True when the text mentions at least one direction term (plural-insensitive, whole word start). */
export function mentionsDirection(text: string, terms: string[], atLeast = 1): boolean {
  const lower = text.toLowerCase();
  const hits = terms.filter((term) => new RegExp(`\\b${term.replace(/[^a-z0-9]/g, "")}`).test(lower)).length;
  return hits >= Math.min(atLeast, terms.length);
}
export const showsPrice = (text: string) => PRICE.test(text);

/** The searches one run makes. Few and deliberate: each one costs an API call. */
export function collectorPlan(direction: string): CollectorQuery[] {
  const d = direction.trim();
  return [
    { lane: "pain", provider: "brave", query: `site:reddit.com ${d} manual spreadsheet hours` },
    { lane: "pain", provider: "brave", query: `${d} "takes hours" OR "nightmare" OR "so much manual" forum` },
    { lane: "pain", provider: "hn", query: d },
    { lane: "business", provider: "brave", query: `${d} software pricing` },
    { lane: "business", provider: "brave", query: `${d} service outsourcing pricing per month` },
    { lane: "money", provider: "remotive", query: d }
  ];
}

const provenance = (direction: string, q: CollectorQuery) => `${direction.trim()} · ${q.lane}: ${q.query}`;

const hostOf = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; } };

function braveSourceType(url: string, lane: Lane): DiscoverySourceType {
  const host = hostOf(url);
  if (host === "reddit.com" || host.endsWith(".reddit.com")) return "reddit";
  if (/(^|\.)(linkedin|indeed|glassdoor)\.com$/.test(host)) return "job";
  if (/(^|\.)(upwork|fiverr)\.com$/.test(host)) return "freelance";
  return lane === "business" ? "vendor" : "manual";
}

type BraveResult = { url?: string; title?: string; description?: string; page_age?: string; profile?: { name?: string } };
export function braveSources(payload: unknown, direction: string, q: CollectorQuery): DiscoverySourceInput[] {
  const results = ((payload as { web?: { results?: BraveResult[] } })?.web?.results ?? []);
  return results.flatMap((result) => {
    if (!result.url || !/^https?:\/\//.test(result.url)) return [];
    const excerpt = decodeEntities(result.description ?? "");
    if (!excerpt || !mentionsDirection(`${result.title ?? ""} ${excerpt}`, directionTerms(direction))) return [];
    const sourceType = braveSourceType(result.url, q.lane);
    const signalType: DiscoverySignalType =
      q.lane === "business" ? (showsPrice(excerpt) ? "price" : "context")
        : describesPain(excerpt) ? "pain" : "context";
    return [{
      sourceType, signalType, url: result.url, title: decodeEntities(result.title ?? ""),
      publisher: result.profile?.name || hostOf(result.url) || undefined,
      observedAt: result.page_age, excerpt, foundFor: provenance(direction, q), linkStatus: "unverified" as const
    }];
  });
}

type HnHit = { objectID?: string; comment_text?: string; story_title?: string; title?: string; created_at?: string; author?: string };
export function hnSources(payload: unknown, direction: string, q: CollectorQuery): DiscoverySourceInput[] {
  const hits = ((payload as { hits?: HnHit[] })?.hits ?? []);
  return hits.flatMap((hit) => {
    if (!hit.objectID) return [];
    const excerpt = decodeEntities(hit.comment_text ?? "").slice(0, 600);
    // Only comments that themselves describe pain: a comment that merely mentions the topic is noise.
    if (!excerpt || !describesPain(excerpt) || !mentionsDirection(`${hit.story_title ?? ""} ${excerpt}`, directionTerms(direction))) return [];
    return [{
      sourceType: "manual" as const, signalType: "pain" as const,
      url: `https://news.ycombinator.com/item?id=${hit.objectID}`,
      title: decodeEntities(hit.story_title ?? hit.title ?? "Hacker News comment"),
      publisher: "Hacker News", observedAt: hit.created_at, excerpt, foundFor: provenance(direction, q), linkStatus: "unverified" as const
    }];
  });
}

type RemotiveJob = { url?: string; title?: string; company_name?: string; salary?: string; description?: string; publication_date?: string; candidate_required_location?: string };
export function remotiveSources(payload: unknown, direction: string, q: CollectorQuery): DiscoverySourceInput[] {
  const jobs = ((payload as { jobs?: RemotiveJob[] })?.jobs ?? []);
  return jobs.flatMap((job) => {
    if (!job.url || !job.title) return [];
    const salary = (job.salary ?? "").trim();
    const body = decodeEntities(job.description ?? "").slice(0, 400);
    const excerpt = [salary ? `Salary: ${salary}.` : "", body].filter(Boolean).join(" ");
    // Jobs need two direction words, not one: a salary is labelled budget, which can answer
    // "Paid today", so an off-topic job is costlier than an off-topic forum post.
    if (!excerpt || !mentionsDirection(`${job.title} ${body}`, directionTerms(direction), 2)) return [];
    return [{
      sourceType: "job" as const, signalType: salary ? "budget" as const : "workflow" as const,
      url: job.url, title: `${decodeEntities(job.title)} — ${job.company_name ?? "company not named"}`,
      publisher: job.company_name, observedAt: job.publication_date, excerpt,
      citation: job.candidate_required_location ? `Location: ${job.candidate_required_location}` : undefined,
      foundFor: provenance(direction, q), linkStatus: "unverified" as const
    }];
  });
}

export function requestFor(q: CollectorQuery, env: Record<string, string | undefined>): { url: string; headers: Record<string, string> } | { error: string } {
  if (q.provider === "brave") {
    if (!env.BRAVE_API_KEY) return { error: "BRAVE_API_KEY is not set" };
    return { url: `https://api.search.brave.com/res/v1/web/search?count=10&q=${encodeURIComponent(q.query)}`, headers: { Accept: "application/json", "X-Subscription-Token": env.BRAVE_API_KEY } };
  }
  if (q.provider === "hn") return { url: `https://hn.algolia.com/api/v1/search?tags=comment&hitsPerPage=30&query=${encodeURIComponent(q.query)}`, headers: {} };
  return { url: `https://remotive.com/api/remote-jobs?limit=10&search=${encodeURIComponent(q.query)}`, headers: {} };
}

/** Runs every query; one failing provider never hides what the others returned. */
export async function collect(direction: string, fetchImpl: FetchLike, env: Record<string, string | undefined>): Promise<LaneResult[]> {
  const results: LaneResult[] = [];
  for (const q of collectorPlan(direction)) {
    const request = requestFor(q, env);
    if ("error" in request) { results.push({ ...q, sources: [], error: request.error }); continue; }
    try {
      const response = await fetchImpl(request.url, { headers: request.headers });
      if (!response.ok) { results.push({ ...q, sources: [], error: `${q.provider} answered ${response.status}` }); continue; }
      const payload = await response.json();
      const sources = q.provider === "brave" ? braveSources(payload, direction, q) : q.provider === "hn" ? hnSources(payload, direction, q) : remotiveSources(payload, direction, q);
      results.push({ ...q, sources });
    } catch (error) {
      results.push({ ...q, sources: [], error: error instanceof Error ? error.message : `${q.provider} request failed` });
    }
  }
  return results;
}
