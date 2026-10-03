// Source ingestion helpers. Collection is explicit and source-backed; no proposal is generated here.

import type { DiscoverySignalType, DiscoverySourceInput, DiscoverySourceType } from "./discovery";

export type ManualSourceInput = {
  url: string;
  title: string;
  excerpt: string;
  foundFor: string;
  publisher?: string;
  citation?: string;
  signalType?: DiscoverySignalType;
};

export function sourceTypeForUrl(url: string): DiscoverySourceType {
  const host = new URL(url).hostname.replace(/^www\./, "");
  if (host === "linkedin.com" || host.endsWith(".linkedin.com") || host === "indeed.com" || host.endsWith(".indeed.com")) return "job";
  if (host === "upwork.com" || host.endsWith(".upwork.com") || host === "fiverr.com" || host.endsWith(".fiverr.com")) return "freelance";
  if (host === "reddit.com" || host.endsWith(".reddit.com")) return "reddit";
  return "vendor";
}

export function manualSourceInput(input: ManualSourceInput): DiscoverySourceInput {
  const url = input.url.trim();
  if (!/^https?:\/\//i.test(url)) throw new Error("Source URL must start with http:// or https://");
  return {
    sourceType: sourceTypeForUrl(url),
    signalType: input.signalType ?? (sourceTypeForUrl(url) === "vendor" ? "price" : "workflow"),
    url,
    title: input.title.trim(),
    publisher: input.publisher?.trim() || undefined,
    citation: input.citation?.trim() || undefined,
    excerpt: input.excerpt.trim(),
    foundFor: input.foundFor.trim(),
    linkStatus: "unverified"
  };
}

export type RedditListing = {
  data?: { children?: Array<{ data?: { id?: string; permalink?: string; title?: string; selftext?: string; subreddit_name_prefixed?: string; created_utc?: number } }> };
};

export function redditSources(listing: RedditListing, foundFor: string): DiscoverySourceInput[] {
  return (listing.data?.children ?? []).flatMap((child) => {
    const item = child.data;
    if (!item?.id || !item.permalink || !item.title) return [];
    const excerpt = (item.selftext || item.title).trim();
    return [{
      sourceType: "reddit",
      signalType: "pain",
      url: `https://www.reddit.com${item.permalink}`,
      title: item.title,
      publisher: item.subreddit_name_prefixed,
      observedAt: item.created_utc ? new Date(item.created_utc * 1000).toISOString() : undefined,
      excerpt,
      foundFor,
      linkStatus: "unverified"
    }];
  });
}
