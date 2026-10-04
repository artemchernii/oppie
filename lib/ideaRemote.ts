// oppie.lab — live numbers and the owner's decisions for the Ideas board.
//
// Server only, read as the signed-in person (RLS applies). The idea records come from
// lib/ideas.ts; this file adds what the database knows. A count that cannot be read is null and
// renders as "Not added yet" — never as zero (AGENTS.md § 6).

import { supabaseForRoute } from "./supabase/server";
import { supabaseConfig } from "./supabaseConfig";
import { idChunks, isNextControlFlow, messageOf, reason } from "./supabaseResult";
import { currentDecisions, distinctSellers, ideaById, ideaDecisionError, ideaDecisionFromRow, IDEAS, type Idea, type IdeaCard, type IdeaDecision, type IdeaSeller, type IdeaStatus } from "./ideas";
import { playwrightFixturesActive } from "./playwrightFixtures";

export type IdeaQuote = { id: string; title: string; url: string; excerpt: string };
export type IdeaBoard = { cards: IdeaCard[]; error: string | null; decisionsMissing: boolean };
export type IdeaDetail = IdeaCard & { sellerList: IdeaSeller[]; quotes: IdeaQuote[]; searches: number; error: string | null; decisionsMissing: boolean };

/** PostgREST's "no such table" — the migration has not been applied yet. */
const tableMissing = (error: { code?: string | null } | null) => !!error && (error.code === "PGRST205" || error.code === "42P01");

type Client = ReturnType<typeof supabaseForRoute>["supabase"];

async function readDecisions(supabase: Client): Promise<{ decisions: Map<string, IdeaDecision>; missing: boolean; error: string | null }> {
  const result = await supabase.from("idea_decisions").select("*").order("decided_at", { ascending: true });
  if (tableMissing(result.error)) return { decisions: new Map(), missing: true, error: null };
  if (result.error) return { decisions: new Map(), missing: false, error: reason(result.error) };
  const rows = (result.data ?? []).map((row) => ideaDecisionFromRow(row as Record<string, unknown>)).filter((row): row is IdeaDecision => !!row);
  return { decisions: currentDecisions(rows), missing: false, error: null };
}

async function complaintCount(supabase: Client, idea: Idea): Promise<number | null> {
  const result = await supabase.from("discovery_sources").select("id", { count: "exact", head: true })
    .in("run_id", idea.runIds).eq("signal_type", "pain").neq("triage", "discarded");
  return result.error ? null : result.count ?? 0;
}

async function businessLines(supabase: Client, runIds: string[]): Promise<string[] | null> {
  const results = await Promise.all(idChunks(runIds, 50).map((chunk) => supabase.from("discovery_proposals").select("business_pattern").in("run_id", chunk)));
  if (results.some((result) => result.error)) return null;
  return results.flatMap((result) => (result.data ?? []).map((row) => String((row as Record<string, unknown>).business_pattern ?? "")));
}

export async function readIdeaBoard(): Promise<IdeaBoard> {
  if (playwrightFixturesActive()) return fixtureBoard();
  if (!supabaseConfig().userConfigured) return { cards: [], error: "Supabase is not configured", decisionsMissing: false };
  try {
    const { supabase } = supabaseForRoute();
    const allRuns = IDEAS.flatMap((idea) => idea.runIds);
    const [decisions, lines, counts] = await Promise.all([
      readDecisions(supabase),
      Promise.all(idChunks(allRuns, 50).map((chunk) => supabase.from("discovery_proposals").select("run_id,business_pattern").in("run_id", chunk))),
      Promise.all(IDEAS.map((idea) => complaintCount(supabase, idea)))
    ]);
    const linesFailed = lines.some((result) => result.error);
    const rows = linesFailed ? [] : lines.flatMap((result) => (result.data ?? []) as Array<{ run_id: string; business_pattern: string | null }>);
    const cards = IDEAS.map((idea, index): IdeaCard => ({
      idea,
      complaints: counts[index],
      sellers: linesFailed ? null : distinctSellers(rows.filter((row) => idea.runIds.indexOf(row.run_id) >= 0).map((row) => row.business_pattern)).length,
      decision: decisions.decisions.get(idea.id)
    }));
    return { cards, error: decisions.error, decisionsMissing: decisions.missing };
  } catch (error) {
    if (isNextControlFlow(error)) throw error;
    return { cards: [], error: messageOf(error, "could not read the ideas"), decisionsMissing: false };
  }
}

export async function readIdeaDetail(id: string): Promise<IdeaDetail | null> {
  const idea = ideaById(id);
  if (!idea) return null;
  if (playwrightFixturesActive()) return fixtureDetail(idea);
  const empty: IdeaDetail = { idea, complaints: null, sellers: null, sellerList: [], quotes: [], searches: idea.runIds.length, error: null, decisionsMissing: false };
  if (!supabaseConfig().userConfigured) return { ...empty, error: "Supabase is not configured" };
  try {
    const { supabase } = supabaseForRoute();
    const [decisions, lines, complaints, quotes] = await Promise.all([
      readDecisions(supabase),
      businessLines(supabase, idea.runIds),
      complaintCount(supabase, idea),
      idea.quoteSourceIds.length ? supabase.from("discovery_sources").select("id,title,url,excerpt").in("id", idea.quoteSourceIds) : Promise.resolve({ data: [], error: null })
    ]);
    const sellerList = lines ? distinctSellers(lines) : [];
    const quoteRows = (quotes.data ?? []) as Array<Record<string, unknown>>;
    return {
      ...empty,
      complaints,
      sellers: lines ? sellerList.length : null,
      sellerList,
      // Keep the order chosen in lib/ideas.ts, not the database's.
      quotes: idea.quoteSourceIds.map((sourceId) => quoteRows.filter((row) => row.id === sourceId)[0]).filter(Boolean)
        .map((row) => ({ id: String(row.id), title: String(row.title ?? ""), url: String(row.url ?? ""), excerpt: String(row.excerpt ?? "") })),
      decision: decisions.decisions.get(idea.id),
      error: decisions.error ?? (quotes.error ? reason(quotes.error) : null),
      decisionsMissing: decisions.missing
    };
  } catch (error) {
    if (isNextControlFlow(error)) throw error;
    return { ...empty, error: messageOf(error, "could not read the idea") };
  }
}

export type DecisionSave = { ok: true; decision: IdeaDecision } | { ok: false; error: string; status: number };

export async function saveIdeaDecision(id: string, input: { status: unknown; reason: unknown }): Promise<DecisionSave> {
  if (!ideaById(id)) return { ok: false, error: "No such idea", status: 404 };
  const invalid = ideaDecisionError(input);
  if (invalid) return { ok: false, error: invalid, status: 400 };
  if (playwrightFixturesActive()) {
    return { ok: true, decision: { ideaId: id, status: input.status as IdeaStatus, reason: String(input.reason).trim(), decidedAt: new Date().toISOString() } };
  }
  if (!supabaseConfig().userConfigured) return { ok: false, error: "Supabase is not configured", status: 503 };
  try {
    const { supabase } = supabaseForRoute();
    const result = await supabase.from("idea_decisions")
      .insert({ idea_id: id, status: input.status, reason: String(input.reason).trim() })
      .select("*").single();
    if (tableMissing(result.error)) return { ok: false, error: "Decisions cannot be saved until the idea_decisions migration is applied", status: 503 };
    if (result.error) return { ok: false, error: reason(result.error), status: 503 };
    const decision = ideaDecisionFromRow(result.data as Record<string, unknown>);
    return decision ? { ok: true, decision } : { ok: false, error: "The saved decision could not be read back", status: 503 };
  } catch (error) {
    if (isNextControlFlow(error)) throw error;
    return { ok: false, error: messageOf(error, "could not save the decision"), status: 503 };
  }
}

// ---- isolated Playwright server only (see lib/playwrightFixtures.ts) ----

function fixtureBoard(): IdeaBoard {
  const cards = IDEAS.map((idea, index): IdeaCard => ({
    idea,
    complaints: idea.id === "credit-control-europe" ? null : 30 - index,
    sellers: 10 + index,
    decision: idea.id === "nis2-supplier-evidence" ? { ideaId: idea.id, status: "park", reason: "Fixture: parked.", decidedAt: "2026-10-04T15:00:00.000Z" } : undefined
  }));
  return { cards, error: null, decisionsMissing: false };
}

function fixtureDetail(idea: Idea): IdeaDetail {
  const sellerList: IdeaSeller[] = [
    { name: "Fixture Tool", offer: "renewal reminders", quote: "$95/month" },
    { name: "Fixture Service", offer: "done-for-you tracking", quote: "$699/month" },
    { name: "Fixture CLM", offer: "contract management" },
    { name: "Fixture Extra", offer: "reminders" }
  ];
  return {
    idea, complaints: 34, sellers: sellerList.length, sellerList, searches: idea.runIds.length,
    quotes: idea.quoteSourceIds.map((id, index) => ({ id, title: `Fixture source ${index + 1}`, url: `https://example.com/${id}`, excerpt: `Fixture quote ${index + 1}: we missed a renewal and paid another year.` })),
    error: null, decisionsMissing: false
  };
}
