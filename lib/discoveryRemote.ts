// oppie.lab — server-side persistence for the first discovery backend slice.

import { supabaseForRoute } from "./supabase/server";
import { supabaseConfig } from "./supabaseConfig";
import { isNextControlFlow, messageOf, reason } from "./supabaseResult";
import { canonicalDiscoveryUrl, discoveryProposalFromRow, discoveryRunFromRow, discoverySourceFromRow, discoveryUrlKey, newDiscoveryRun, validateDiscoverySource, acceptanceBlockedByRun, runStatusAfter, validateProposalAcceptance, validateProposalRejection, type RunEvent, type DiscoveryInput, type DiscoveryRun, type DiscoverySource, type DiscoverySourceInput } from "./discovery";
import { redditSources } from "./ingestion";
import { collect, type Lane, type Provider } from "./collectors";
import { checkSplit, DEFAULT_SPLIT_MODEL, proposalsFromSplit, requestSplit, type SplitReport } from "./painSplit";
import { generateDiscoveryProposals } from "./proposals";
import { problemFromDiscoveryProposal, mergeDiscoveryEvidence, runAcceptance, type StepResult } from "./discoveryAcceptance";
import type { Problem } from "./problems";
import { readRemoteProblems, saveRemoteProblem } from "./problemRemote";
import type { DiscoveryCompanyView, DiscoveryRunData } from "./discoveryView";
import type { DiscoveryInboxData } from "./discoveryInbox";
import type { AcceptedDecision } from "./problemTrail";

export type DiscoveryResult<T> = { ok: true; value: T } | { ok: false; error: string };

export async function createDiscoveryRun(input: DiscoveryInput): Promise<DiscoveryResult<DiscoveryRun>> {
  try {
    const run = newDiscoveryRun(input);
    if (!supabaseConfig().userConfigured) return { ok: false, error: "Supabase is not configured" };
    const { supabase } = supabaseForRoute();
    const { error } = await supabase.from("discovery_runs").insert({
      id: run.id,
      direction: run.direction,
      geography: run.geography ?? null,
      role: run.role ?? null,
      workflow: run.workflow ?? null,
      constraint_text: run.constraint ?? null,
      status: run.status,
      created_at: run.createdAt,
      updated_at: run.updatedAt
    });
    if (error) return { ok: false, error: reason(error) };
    return { ok: true, value: run };
  } catch (error) {
    if (isNextControlFlow(error)) throw error;
    return { ok: false, error: messageOf(error, "could not create discovery run") };
  }
}

export async function acceptDiscoveryProposal(id: string, decisionReason: string, sourceIds: string[], problemId?: string): Promise<DiscoveryResult<{ problemId: string; warning?: string }>> {
  const validation = validateProposalAcceptance(decisionReason, sourceIds);
  if (validation) return { ok: false, error: validation };
  if (!supabaseConfig().userConfigured) return { ok: false, error: "Supabase is not configured" };

  try {
    const { supabase } = supabaseForRoute();
    const proposalResult = await supabase.from("discovery_proposals").select("*").eq("id", id).eq("status", "waiting").single();
    if (proposalResult.error || !proposalResult.data) return { ok: false, error: proposalResult.error ? reason(proposalResult.error) : "Discovery proposal is not waiting" };
    const proposal = discoveryProposalFromRow(proposalResult.data);
    const runResult = await supabase.from("discovery_runs").select("*").eq("id", proposal.runId).maybeSingle();
    if (runResult.error) return { ok: false, error: reason(runResult.error) };
    const blocked = acceptanceBlockedByRun(runResult.data ? discoveryRunFromRow(runResult.data as Record<string, unknown>) : null);
    if (blocked) return { ok: false, error: blocked };
    if (sourceIds.some((sourceId) => !proposal.sourceIds.includes(sourceId))) return { ok: false, error: "Every selected source must belong to this proposal" };
    const sourceResult = await supabase.from("discovery_sources").select("*").in("id", sourceIds).eq("run_id", proposal.runId);
    if (sourceResult.error) return { ok: false, error: reason(sourceResult.error) };
    if (sourceResult.data.length !== sourceIds.length) return { ok: false, error: "One or more selected sources could not be found" };
    if (sourceResult.data.some((row) => row.triage === "discarded")) return { ok: false, error: "Discarded sources cannot be attached" };
    const sources = sourceResult.data.map((row) => discoverySourceFromRow(row as Record<string, unknown>));
    const now = new Date().toISOString();

    // Resolve the target before claiming anything, so a missing Problem fails with nothing changed.
    let target: Problem;
    const existingId = problemId?.trim();
    if (existingId) {
      const existing = await readRemoteProblems();
      if (!existing.ok) return { ok: false, error: existing.error };
      const current = existing.problems.find((item) => item.id === existingId);
      if (!current) return { ok: false, error: "The selected Problem was not found" };
      target = mergeDiscoveryEvidence(current, proposal, sources, now);
    } else {
      target = problemFromDiscoveryProposal(proposal, sources, `p-${crypto.randomUUID()}`, now);
    }

    const step = (result: { error: unknown }): StepResult => result.error ? { ok: false, error: reason(result.error as Parameters<typeof reason>[0]) } : { ok: true };
    const outcome = await runAcceptance(target.id, {
      claim: async () => {
        const claimed = await supabase.from("discovery_proposals").update({
          status: "accepted", decision_reason: decisionReason.trim(), source_ids: sourceIds, decided_at: now
        }).eq("id", id).eq("status", "waiting").select("id");
        return claimed.error ? { ok: false, error: reason(claimed.error) } : { ok: true, claimed: claimed.data.length > 0 };
      },
      writeProblem: async () => {
        const saved = await saveRemoteProblem(target);
        return saved.ok ? { ok: true } : { ok: false, error: saved.error };
      },
      release: async () => step(await supabase.from("discovery_proposals").update({
        status: "waiting", decision_reason: null, source_ids: proposal.sourceIds, decided_at: null
      }).eq("id", id).eq("status", "accepted").is("problem_id", null)),
      link: async () => step(await supabase.from("discovery_proposals").update({ problem_id: target.id }).eq("id", id)),
      attachSources: async () => step(await supabase.from("discovery_sources").update({ triage: "attached", problem_id: target.id }).in("id", sourceIds).neq("triage", "discarded"))
    });
    if (!outcome.ok) return { ok: false, error: outcome.error };
    return { ok: true, value: { problemId: outcome.problemId, warning: outcome.warning } };
  } catch (error) {
    if (isNextControlFlow(error)) throw error;
    return { ok: false, error: messageOf(error, "could not accept discovery proposal") };
  }
}

/** Record what happened to a run. Best effort: a failed status write never hides the original outcome. */
async function markRun(runId: string, event: RunEvent, error?: string): Promise<void> {
  try {
    const { supabase } = supabaseForRoute();
    await supabase.from("discovery_runs").update({
      status: runStatusAfter(event), error: event === "failed" ? (error ?? "unknown failure") : null, updated_at: new Date().toISOString()
    }).eq("id", runId);
  } catch (caught) {
    if (isNextControlFlow(caught)) throw caught;
    console.error(`[discovery] could not record run ${runId} as ${event}`);
  }
}


export async function readDiscoveryRun(id: string): Promise<DiscoveryResult<DiscoveryRunData>> {
  if (!supabaseConfig().userConfigured) return { ok: false, error: "Supabase is not configured" };
  try {
    const { supabase } = supabaseForRoute();
    const [runResult, sourceResult, proposalResult] = await Promise.all([
      supabase.from("discovery_runs").select("*").eq("id", id).single(),
      supabase.from("discovery_sources").select("*").eq("run_id", id).order("created_at", { ascending: true }),
      supabase.from("discovery_proposals").select("*").eq("run_id", id).order("id", { ascending: true })
    ]);
    if (runResult.error) return { ok: false, error: reason(runResult.error) };
    if (sourceResult.error) return { ok: false, error: reason(sourceResult.error) };
    if (proposalResult.error) return { ok: false, error: reason(proposalResult.error) };
    const proposals = proposalResult.data.map((row) => discoveryProposalFromRow(row as Record<string, unknown>));
    const companyIds = Array.from(new Set(proposals.flatMap((proposal) => proposal.companyIds)));
    let companies: DiscoveryCompanyView[] = [];
    if (companyIds.length > 0) {
      const companyResult = await supabase.from("companies").select("id,name,role,amount,location").in("id", companyIds);
      if (companyResult.error) return { ok: false, error: reason(companyResult.error) };
      companies = companyResult.data.map((row) => ({
        id: String(row.id), name: String(row.name ?? ""), role: String(row.role ?? ""),
        amount: String(row.amount ?? ""), location: String(row.location ?? "")
      }));
    }
    return {
      ok: true,
      value: {
        run: discoveryRunFromRow(runResult.data as Record<string, unknown>),
        sources: sourceResult.data.map((row) => discoverySourceFromRow(row as Record<string, unknown>)),
        proposals,
        companies
      }
    };
  } catch (error) {
    if (isNextControlFlow(error)) throw error;
    return { ok: false, error: messageOf(error, "could not read discovery run") };
  }
}

/** The most recent runs, newest first, so a run survives a reload and can be reopened. */
export async function listDiscoveryRuns(limit = 8): Promise<DiscoveryResult<DiscoveryRun[]>> {
  if (!supabaseConfig().userConfigured) return { ok: false, error: "Supabase is not configured" };
  try {
    const { supabase } = supabaseForRoute();
    const { data, error } = await supabase.from("discovery_runs").select("*").order("created_at", { ascending: false }).limit(limit);
    if (error) return { ok: false, error: reason(error) };
    return { ok: true, value: data.map((row) => discoveryRunFromRow(row as Record<string, unknown>)) };
  } catch (error) {
    if (isNextControlFlow(error)) throw error;
    return { ok: false, error: messageOf(error, "could not list discovery runs") };
  }
}

export async function addDiscoverySource(runId: string, input: DiscoverySourceInput): Promise<DiscoveryResult<DiscoverySource>> {
  const validation = validateDiscoverySource(input);
  if (validation) return { ok: false, error: validation };
  if (!supabaseConfig().userConfigured) return { ok: false, error: "Supabase is not configured" };
  const now = new Date().toISOString();
  const source: DiscoverySource = { ...input, id: `src-${crypto.randomUUID()}`, runId, url: canonicalDiscoveryUrl(input.url), triage: "untriaged", createdAt: now };
  try {
    const { supabase } = supabaseForRoute();
    const { data, error } = await supabase.from("discovery_sources").upsert({
      id: source.id, run_id: runId, source_type: source.sourceType, signal_type: source.signalType,
      url: source.url, title: source.title, publisher: source.publisher ?? null,
      observed_at: source.observedAt ?? null, excerpt: source.excerpt, citation: source.citation ?? null,
      found_for: source.foundFor, link_status: source.linkStatus, triage: source.triage, created_at: now
    }, { onConflict: "run_id,url", ignoreDuplicates: true }).select("*").maybeSingle();
    if (error) { await markRun(runId, "failed", `saving a source: ${reason(error)}`); return { ok: false, error: reason(error) }; }
    if (!data) return { ok: false, error: `Source already exists for this run: ${discoveryUrlKey(source.url)}` };
    await markRun(runId, "source-saved");
    return { ok: true, value: source };
  } catch (error) {
    if (isNextControlFlow(error)) throw error;
    return { ok: false, error: messageOf(error, "could not add discovery source") };
  }
}

export async function triageDiscoverySource(id: string, triage: "attached" | "discarded"): Promise<DiscoveryResult<true>> {
  if (!supabaseConfig().userConfigured) return { ok: false, error: "Supabase is not configured" };
  try {
    const { supabase } = supabaseForRoute();
    const { data, error } = await supabase.from("discovery_sources").update({ triage }).eq("id", id).eq("triage", "untriaged").select("id");
    if (error) return { ok: false, error: reason(error) };
    if (data.length === 0) return { ok: false, error: "The source was not found or has already been triaged" };
    return { ok: true, value: true };
  } catch (error) {
    if (isNextControlFlow(error)) throw error;
    return { ok: false, error: messageOf(error, "could not triage discovery source") };
  }
}

export async function readDiscoveryInbox(): Promise<DiscoveryResult<DiscoveryInboxData>> {
  if (!supabaseConfig().userConfigured) return { ok: false, error: "Supabase is not configured" };
  try {
    const { supabase } = supabaseForRoute();
    const [sources, proposals, decided] = await Promise.all([
      supabase.from("discovery_sources").select("*").eq("triage", "untriaged").order("created_at", { ascending: true }),
      supabase.from("discovery_proposals").select("*").eq("status", "waiting").order("id", { ascending: true }),
      supabase.from("discovery_proposals").select("*").neq("status", "waiting").order("decided_at", { ascending: false }).limit(10)
    ]);
    if (sources.error) return { ok: false, error: reason(sources.error) };
    if (proposals.error) return { ok: false, error: reason(proposals.error) };
    if (decided.error) return { ok: false, error: reason(decided.error) };
    const waiting = proposals.data.map((row) => discoveryProposalFromRow(row as Record<string, unknown>));
    // A waiting proposal may cite sources that were already kept, which the untriaged read omits.
    const citedIds = Array.from(new Set(waiting.flatMap((proposal) => proposal.sourceIds)));
    let cited: DiscoverySource[] = [];
    if (citedIds.length > 0) {
      const citedResult = await supabase.from("discovery_sources").select("*").in("id", citedIds);
      if (citedResult.error) return { ok: false, error: reason(citedResult.error) };
      cited = citedResult.data.map((row) => discoverySourceFromRow(row as Record<string, unknown>));
    }
    return {
      ok: true,
      value: {
        sources: sources.data.map((row) => discoverySourceFromRow(row as Record<string, unknown>)),
        proposals: waiting,
        citedSources: cited,
        decided: decided.data.map((row) => discoveryProposalFromRow(row as Record<string, unknown>))
      }
    };
  } catch (error) {
    if (isNextControlFlow(error)) throw error;
    return { ok: false, error: messageOf(error, "could not read discovery inbox") };
  }
}

/**
 * Every proposal a person accepted into this Problem, with its run's direction and the sources
 * they selected. Read-only: it shows the decision trail, it never edits the Problem.
 */
export async function readProblemDiscoveryTrail(problemId: string): Promise<DiscoveryResult<AcceptedDecision[]>> {
  if (!supabaseConfig().userConfigured) return { ok: false, error: "Supabase is not configured" };
  try {
    const { supabase } = supabaseForRoute();
    const proposals = await supabase.from("discovery_proposals").select("*").eq("problem_id", problemId).eq("status", "accepted").order("decided_at", { ascending: true });
    if (proposals.error) return { ok: false, error: reason(proposals.error) };
    const accepted = proposals.data.map((row) => discoveryProposalFromRow(row as Record<string, unknown>));
    if (accepted.length === 0) return { ok: true, value: [] };
    const runIds = Array.from(new Set(accepted.map((proposal) => proposal.runId)));
    const sourceIds = Array.from(new Set(accepted.flatMap((proposal) => proposal.sourceIds)));
    const [runs, sources] = await Promise.all([
      supabase.from("discovery_runs").select("id,direction").in("id", runIds),
      sourceIds.length ? supabase.from("discovery_sources").select("*").in("id", sourceIds) : Promise.resolve({ data: [], error: null })
    ]);
    if (runs.error) return { ok: false, error: reason(runs.error) };
    if (sources.error) return { ok: false, error: reason(sources.error) };
    const directionById = new Map(runs.data.map((row) => [String(row.id), String(row.direction ?? "")]));
    const sourceById = new Map(sources.data.map((row) => { const source = discoverySourceFromRow(row as Record<string, unknown>); return [source.id, source]; }));
    return {
      ok: true,
      value: accepted.map((proposal) => ({
        proposal,
        direction: directionById.get(proposal.runId),
        sources: proposal.sourceIds.map((id) => sourceById.get(id)).filter((source): source is DiscoverySource => !!source),
        missingSourceIds: proposal.sourceIds.filter((id) => !sourceById.has(id))
      }))
    };
  } catch (error) {
    if (isNextControlFlow(error)) throw error;
    return { ok: false, error: messageOf(error, "could not read the discovery trail") };
  }
}

export async function rejectDiscoveryProposal(id: string, decisionReason: string): Promise<DiscoveryResult<true>> {
  const validation = validateProposalRejection(decisionReason);
  if (validation) return { ok: false, error: validation };
  if (!supabaseConfig().userConfigured) return { ok: false, error: "Supabase is not configured" };
  try {
    const { supabase } = supabaseForRoute();
    const { data, error } = await supabase.from("discovery_proposals").update({
      status: "rejected",
      decision_reason: decisionReason.trim(),
      decided_at: new Date().toISOString()
    }).eq("id", id).eq("status", "waiting").select("id");
    if (error) return { ok: false, error: reason(error) };
    if (data.length === 0) return { ok: false, error: "The proposal was not found or is no longer waiting" };
    return { ok: true, value: true };
  } catch (error) {
    if (isNextControlFlow(error)) throw error;
    return { ok: false, error: messageOf(error, "could not reject discovery proposal") };
  }
}

export async function ingestReddit(runId: string, query: string, subreddit?: string): Promise<DiscoveryResult<DiscoverySource[]>> {
  if (!query.trim()) return { ok: false, error: "A Reddit search query is required" };
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  const userAgent = process.env.REDDIT_USER_AGENT;
  if (!clientId || !clientSecret || !userAgent) {
    return { ok: false, error: "Reddit ingestion needs REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET and REDDIT_USER_AGENT" };
  }
  try {
    const tokenResponse = await fetch("https://www.reddit.com/api/v1/access_token", {
      method: "POST",
      headers: { Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`, "User-Agent": userAgent, "Content-Type": "application/x-www-form-urlencoded" },
      body: "grant_type=client_credentials"
    });
    if (!tokenResponse.ok) { const failure = `Reddit token request failed (${tokenResponse.status})`; await markRun(runId, "failed", failure); return { ok: false, error: failure }; }
    const token = await tokenResponse.json() as { access_token?: string };
    if (!token.access_token) { const failure = "Reddit token response had no access token"; await markRun(runId, "failed", failure); return { ok: false, error: failure }; }
    const params = new URLSearchParams({ q: query.trim(), sort: "relevance", limit: "25", type: "link" });
    if (subreddit?.trim()) params.set("restrict_sr", "true");
    const endpoint = subreddit?.trim() ? `https://oauth.reddit.com/r/${encodeURIComponent(subreddit.trim())}/search?${params}` : `https://oauth.reddit.com/search?${params}`;
    const listingResponse = await fetch(endpoint, { headers: { Authorization: `Bearer ${token.access_token}`, "User-Agent": userAgent } });
    if (!listingResponse.ok) { const failure = `Reddit search failed (${listingResponse.status})`; await markRun(runId, "failed", failure); return { ok: false, error: failure }; }
    const inputs = redditSources(await listingResponse.json() as { data?: { children?: Array<{ data?: { id?: string; permalink?: string; title?: string; selftext?: string; subreddit_name_prefixed?: string; created_utc?: number } }> } }, query.trim());
    const saved: DiscoverySource[] = [];
    for (const input of inputs) {
      const result = await addDiscoverySource(runId, input);
      if (result.ok) saved.push(result.value);
    }
    return { ok: true, value: saved };
  } catch (error) {
    if (isNextControlFlow(error)) throw error;
    const failure = messageOf(error, "could not ingest Reddit sources");
    await markRun(runId, "failed", failure);
    return { ok: false, error: failure };
  }
}

export type CollectSummary = { lane: Lane; provider: Provider; query: string; found: number; saved: number; error?: string };

/**
 * Runs the real collectors for a run's direction and stores what they find as untriaged sources.
 * Collecting never accepts, scores or proposes anything. The run fails only when every provider
 * failed; a partial collection is kept, and each failed provider is named in the summary.
 */
export async function collectRun(runId: string): Promise<DiscoveryResult<CollectSummary[]>> {
  if (!supabaseConfig().userConfigured) return { ok: false, error: "Supabase is not configured" };
  try {
    const { supabase } = supabaseForRoute();
    const runResult = await supabase.from("discovery_runs").select("*").eq("id", runId).maybeSingle();
    if (runResult.error) return { ok: false, error: reason(runResult.error) };
    if (!runResult.data) return { ok: false, error: "The run was not found" };
    const run = discoveryRunFromRow(runResult.data as Record<string, unknown>);
    const lanes = await collect(run.direction, (url, init) => fetch(url, { ...init, cache: "no-store" }), process.env);
    const summary: CollectSummary[] = [];
    for (const lane of lanes) {
      const results = await Promise.all(lane.sources.map((source) => addDiscoverySource(runId, source)));
      const saved = results.filter((result) => result.ok).length;
      summary.push({ lane: lane.lane, provider: lane.provider, query: lane.query, found: lane.sources.length, saved, error: lane.error });
    }
    if (summary.every((item) => item.error)) {
      await markRun(runId, "failed", `every collector failed: ${summary.map((item) => `${item.provider}: ${item.error}`).join("; ")}`);
    }
    return { ok: true, value: summary };
  } catch (error) {
    if (isNextControlFlow(error)) throw error;
    const failure = messageOf(error, "could not collect sources");
    await markRun(runId, "failed", failure);
    return { ok: false, error: failure };
  }
}

export type SplitSummary = { proposals: number; suggested: number; dropped: SplitReport["dropped"] };

/**
 * Splits a run into distinct pains with the language model, keeps only what the stored sources
 * support (`checkSplit`), and stores each pain as a waiting proposal. Nothing is accepted.
 * A gateway failure is returned as an error so the caller can fall back to the plain proposal;
 * it does not fail the run, because the collected sources are still good.
 */
export async function splitRun(runId: string, token: string | null): Promise<DiscoveryResult<SplitSummary>> {
  if (!token) return { ok: false, error: "AI splitting is not configured: no AI_GATEWAY_API_KEY or Vercel OIDC token" };
  if (!supabaseConfig().userConfigured) return { ok: false, error: "Supabase is not configured" };
  try {
    const { supabase } = supabaseForRoute();
    const [runResult, sourceResult] = await Promise.all([
      supabase.from("discovery_runs").select("*").eq("id", runId).maybeSingle(),
      supabase.from("discovery_sources").select("*").eq("run_id", runId).neq("triage", "discarded")
    ]);
    if (runResult.error) return { ok: false, error: reason(runResult.error) };
    if (!runResult.data) return { ok: false, error: "The run was not found" };
    if (sourceResult.error) return { ok: false, error: reason(sourceResult.error) };
    const run = discoveryRunFromRow(runResult.data as Record<string, unknown>);
    const sources = sourceResult.data.map((row) => discoverySourceFromRow(row as Record<string, unknown>));
    if (sources.length === 0) return { ok: false, error: "The run has no sources to split" };
    const suggested = await requestSplit(run.direction, sources, token, (url, init) => fetch(url, { ...init, cache: "no-store" }), process.env.AI_GATEWAY_MODEL || DEFAULT_SPLIT_MODEL);
    if (!suggested.ok) return { ok: false, error: suggested.error };
    const report = checkSplit(suggested.value, sources);
    const proposals = proposalsFromSplit(runId, report);
    if (proposals.length > 0) {
      const written = await supabase.from("discovery_proposals").insert(proposals.map((proposal) => ({
        id: proposal.id, run_id: proposal.runId, title: proposal.title, workflow: proposal.workflow,
        actor: proposal.actor ?? null, payer: null, workaround: null, business_pattern: proposal.businessPattern ?? null,
        unknowns: proposal.unknowns, kill_reasons: proposal.killReasons, source_ids: proposal.sourceIds,
        company_ids: proposal.companyIds, status: proposal.status
      })));
      if (written.error) return { ok: false, error: reason(written.error) };
      await markRun(runId, "proposals-built");
    }
    return { ok: true, value: { proposals: proposals.length, suggested: suggested.value.pains?.length ?? 0, dropped: report.dropped } };
  } catch (error) {
    if (isNextControlFlow(error)) throw error;
    return { ok: false, error: messageOf(error, "could not split the run") };
  }
}

export async function generateRunProposals(runId: string): Promise<DiscoveryResult<unknown[]>> {
  if (!supabaseConfig().userConfigured) return { ok: false, error: "Supabase is not configured" };
  try {
    const { supabase } = supabaseForRoute();
    const [sourceResult, companyResult] = await Promise.all([
      supabase.from("discovery_sources").select("*").eq("run_id", runId).neq("triage", "discarded"),
      supabase.from("companies").select("id,url")
    ]);
    if (sourceResult.error || companyResult.error) {
      const failure = reason((sourceResult.error ?? companyResult.error)!);
      await markRun(runId, "failed", `reading sources for proposals: ${failure}`);
      return { ok: false, error: failure };
    }
    const sources: DiscoverySource[] = sourceResult.data.map((row) => discoverySourceFromRow(row as Record<string, unknown>));
    const companies = companyResult.data.map((row) => ({ id: String(row.id), url: String(row.url ?? "") }));
    const proposals = generateDiscoveryProposals(runId, sources, companies);
    if (proposals.length === 0) return { ok: true, value: [] };
    const rows = proposals.map((proposal) => ({
      id: proposal.id, run_id: proposal.runId, title: proposal.title, workflow: proposal.workflow,
      actor: proposal.actor ?? null, payer: proposal.payer ?? null, workaround: proposal.workaround ?? null,
      business_pattern: proposal.businessPattern ?? null, unknowns: proposal.unknowns,
      kill_reasons: proposal.killReasons, source_ids: proposal.sourceIds, company_ids: proposal.companyIds,
      status: proposal.status
    }));
    const written = await supabase.from("discovery_proposals").insert(rows).select("*");
    if (written.error) { await markRun(runId, "failed", `building proposals: ${reason(written.error)}`); return { ok: false, error: reason(written.error) }; }
    await markRun(runId, "proposals-built");
    return { ok: true, value: written.data };
  } catch (error) {
    if (isNextControlFlow(error)) throw error;
    const failure = messageOf(error, "could not generate discovery proposals");
    await markRun(runId, "failed", failure);
    return { ok: false, error: failure };
  }
}
