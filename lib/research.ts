// oppie.lab — the research pipeline's data model and its pure logic.
//
// Two objects, and the split between them is the whole point:
//
//   CollectedSource — something the engine found. It has no opinion. It is raw.
//   Proposal        — a SUGGESTED answer to one of the five questions, with its
//                     reason and its source. It is never applied on its own. A
//                     human accepts or rejects it, or edits it first.
//
// The engine may collect and may suggest. It may not conclude. That line is what
// AGENTS.md §6 protects, and `applyProposal` is the only function that crosses it,
// always under an explicit human action.

import type { Confidence, EvidenceType, LinkStatus, Problem, SignalKey } from "./problems";
import { signalDefs } from "./problems";

export type SourceStatus = "new" | "kept" | "spent";

export type CollectedSource = {
  id: string;
  url: string;
  title: string;
  /** The passage or figure that made this worth keeping. Quoted, not summarised. */
  finding: string;
  /** The query that surfaced it. Kept so a thin result can be traced to a thin search. */
  foundFor: string;
  /** A hint about relevance only. The human decides what it actually attaches to. */
  suggests?: string;
  collectedAt: string;
  status: SourceStatus;
  attachTo?: string;
  evidenceType?: EvidenceType;
  confidence?: Confidence;
  linkStatus?: LinkStatus;
};

export type Proposal = {
  id: string;
  problemId: string;
  signalKey: SignalKey;
  value: 0 | 1 | 2 | 3;
  reason: string;
  sourceUrl: string;
  status: "proposed" | "accepted" | "rejected";
  createdAt: string;
};

export const sourceStatuses: SourceStatus[] = ["new", "kept", "spent"];

/** URL identity for dedupe: scheme, www, trailing slash and query noise don't make a new source. */
export function urlKey(url: string): string {
  return url
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/[?#].*$/, "")
    .replace(/\/+$/, "");
}

/** Only genuinely new URLs come back, so re-running the same search is harmless. */
export function newSources(incoming: CollectedSource[], existing: CollectedSource[]): CollectedSource[] {
  const seen = new Set(existing.map((source) => urlKey(source.url)));
  const out: CollectedSource[] = [];
  for (const source of incoming) {
    const key = urlKey(source.url);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(source);
  }
  return out;
}

export function ingest(existing: CollectedSource[], incoming: CollectedSource[]): CollectedSource[] {
  return [...existing, ...newSources(incoming, existing)];
}

export const pendingProposals = (proposals: Proposal[]): Proposal[] => proposals.filter((proposal) => proposal.status === "proposed");

export const proposalsFor = (proposals: Proposal[], problemId: string): Proposal[] =>
  proposals.filter((proposal) => proposal.problemId === problemId);

export const pendingFor = (proposals: Proposal[], problemId: string): Proposal[] =>
  proposals.filter((proposal) => proposal.problemId === problemId && proposal.status === "proposed");

/**
 * The single human-gated crossing from suggestion to record.
 *
 * The score is written only when a person calls this. The reason is written into the
 * signal's note together with the source, so an accepted proposal never becomes an
 * unexplained number: the trail back to the evidence survives acceptance.
 */
export function applyProposal(problem: Problem, proposal: Proposal): Problem {
  const def = signalDefs.find((item) => item.key === proposal.signalKey);
  return {
    ...problem,
    signals: problem.signals.map((signal) =>
      signal.key === proposal.signalKey
        ? {
            ...signal,
            value: proposal.value,
            note: `${proposal.reason} [accepted ${new Date().toISOString().slice(0, 10)} · ${proposal.sourceUrl}]`
          }
        : signal
    ),
    updatedAt: new Date().toISOString()
  };
}

/** A collected source becomes an evidence row only when a human says which problem it belongs to. */
export function sourceToEvidence(source: CollectedSource): {
  id: string;
  type: EvidenceType;
  observation: string;
  url: string;
  date: string;
  confidence: Confidence;
  linkStatus: LinkStatus;
} {
  return {
    id: `ev-${source.id}`,
    type: source.evidenceType ?? "report",
    observation: source.finding,
    url: source.url,
    date: source.collectedAt.slice(0, 10),
    confidence: source.confidence ?? "reported",
    linkStatus: source.linkStatus ?? "unverified"
  };
}

export const SEED_COLLECTED_AT = "2026-10-01T00:00:00.000Z";

const s = (
  id: string,
  url: string,
  title: string,
  finding: string,
  foundFor: string,
  suggests: string
): CollectedSource => ({
  id,
  url,
  title,
  finding,
  foundFor,
  suggests,
  collectedAt: SEED_COLLECTED_AT,
  status: "new",
  linkStatus: "unverified"
});

/**
 * What the engine has already found and nobody has triaged yet.
 *
 * These are raw findings. They are not attached to anything, they are not scored,
 * and every one of them states its own price or hours verbatim so that a human can
 * judge it without re-fetching the page.
 */
export const seedInbox: CollectedSource[] = [
  // --- numbers that price the work ---
  s(
    "src-opturo",
    "https://opturo.com/says-application/composite-reporting/",
    "Opturo — GIPS composite reporting, published prices",
    "Standard $3,960/yr · Premium $4,950/yr · Advanced $5,940/yr, published month-to-month at $330 / $412.50 / $495. Setup is $50–70.",
    "GIPS composite performance reporting software pricing",
    "P-005"
  ),
  s(
    "src-gips-verification",
    "https://evivgroup.com/prices/",
    "GIPS verification and consulting fees",
    "Ongoing GIPS verification starts at $7,900/yr for traditional strategies and $8,900/yr for private equity and real estate — separate from the software subscription.",
    "GIPS composite performance reporting software pricing",
    "P-005"
  ),
  s(
    "src-gips-enterprise",
    "https://www.finantrix.com/buyer-guides/client-reporting-gips-compliant",
    "Client reporting and GIPS platforms — market price guide",
    "Directional estimates: Backstop $75k–400k · AXYS $100k–500k · Enfusion $120k–600k · StatPro Revolution $150k–800k+ per year. Enterprise implementations $200k–1.2m+.",
    "GIPS composite performance reporting software pricing",
    "P-005"
  ),
  s(
    "src-cerulli-attribution",
    "https://ustechautomations.com/resources/blog/investment-performance-attribution-automation-case-study-2026",
    "Attribution reporting labour at a $1B+ RIA",
    "Reported secondhand from Cerulli: an average RIA with $1B+ AUM dedicates 35–45 hours per week to compiling, verifying and distributing performance attribution reports — roughly $180,000 a year in analyst compensation. Vendor blog: advertising until checked.",
    "multi currency performance attribution advisor pain",
    "P-005"
  ),
  s(
    "src-opturo-competitors",
    "https://www.confluence.com/products/revolution-composites/",
    "Confluence Revolution Composites",
    "A GIPS composites product that markets the capability without publishing a price — the usual shape at the top of this market: custom quote on accounts, composites, integrations, feeds and users.",
    "GIPS composite performance reporting software pricing",
    "P-005"
  ),
  // --- hours per client, which is what a report pack actually costs ---
  s(
    "src-advice-efficiency",
    "https://www.businesshealth.com.au/wp-content/uploads/2023/07/Advice_Efficiency_Survey_2023.pdf",
    "Financial Advice Efficiency Report — review document production",
    "2.1 hours to prepare an existing-client review document with a fully automated process, against 5.5 hours with no automation. Same document, 2.6× the labour.",
    "advisor quarterly client report pack assembly hours",
    "P-007"
  ),
  s(
    "src-advisor360",
    "https://www.advisor360.com/hubfs/Website/Connected%20Wealth%20Report/2024%20CWR%20%20Webpage/Advisor360_2024_Connected_Wealth_Report.pdf",
    "Advisor360 Connected Wealth Report",
    "239 minutes — about 4.0 hours — to prepare reports for a typical client review meeting. Broader than pack assembly alone, but the useful all-in prep benchmark.",
    "advisor quarterly client report pack assembly hours",
    "P-007"
  ),
  s(
    "src-ftadviser",
    "https://www.ftadviser.com/content/e8ad01bc-762f-5294-a1ed-4221404d122a",
    "FTAdviser survey of 121 UK wealth managers",
    "Typical report production of about 160 minutes (2.7 hours), with 95% of respondents saying it can take up to six hours.",
    "advisor quarterly client report pack assembly hours",
    "P-007"
  ),
  // --- small firms, where the labour is per client per month ---
  s(
    "src-aicpa",
    "https://ustechautomations.com/resources/blog/automate-bank-reconciliation-workflow-2026",
    "Bank reconciliation as a CPA firm time sink",
    "Reported: manual bank reconciliation consumes 8–15 hours per client per month-end close, and AICPA names technology adoption the top priority for CPA firms in 2025–2026. Vendor blog: advertising until checked.",
    "accounting firm manual reconciliation client data review",
    "P-009"
  ),
  s(
    "src-tryentries",
    "https://www.tryentries.com/blog/bank-reconciliation-automation-qbo-xero",
    "Reconciliation scaling in client accounting firms",
    "A firm with ten clients and three bank accounts each is managing thirty reconciliations a month; a single accountant can spend 15–20 hours a month on reconciliation alone — a week of billable time generating no revenue.",
    "accounting firm manual reconciliation client data review",
    "P-009"
  ),
  s(
    "src-reddit-smallfirm",
    "https://www.reddit.com/r/smallbusiness/comments/1nr8nex/small_firm_owners_are_you_still_burning_40/",
    "r/smallbusiness — small accounting firm, 40+ hours a week",
    "A firm with one bookkeeper and one CPA spending 40+ hours a week reconciling messy client data, and asking a tool builder whether they can automate it.",
    "accounting firm manual reconciliation client data review",
    "P-009"
  ),
  s(
    "src-client-data-files",
    "https://faturiza.com/en/blog/manual-bank-reconciliation-month-end-close",
    "The mechanics of a manual month-end reconciliation",
    "Describes the real workflow: export the statement from the homebanking portal as a CSV, open last month's spreadsheet, match payments to invoices by eye. Same file-handover shape as the broker and custodian problem.",
    "accounting firm manual reconciliation client data review",
    "P-009"
  ),
  // --- compliance evidence: priced, and crowded ---
  s(
    "src-complyjet",
    "https://www.complyjet.com/products/audit",
    "ComplyJet — flat-price compliance automation",
    "$5,000/yr for one framework, $8,000/yr for two, flat per company with no per-seat fees, explicitly aimed at 5–50 person teams.",
    "audit evidence compliance management software pricing",
    "P-010"
  ),
  s(
    "src-evidr",
    "https://evidr.com/pricing",
    "Evidr — compliance automation pricing",
    "$499/month, billed annually at $5,988. Evidence collection, policy automation and continuous monitoring included; pitched at small teams getting serious about compliance.",
    "audit evidence compliance management software pricing",
    "P-010"
  ),
  s(
    "src-complies",
    "https://complies.ai/pricing",
    "Complies — published prices, no sales call",
    "Starter $79, Growth $199, Scale $499 per month billed yearly, with the incumbents quoted at $10,000+ a year behind a demo call. Explicitly undercutting on transparency.",
    "audit evidence compliance management software pricing",
    "P-010"
  ),
  s(
    "src-compliance365",
    "https://www.compliance365.com.au/pricing/",
    "Compliance365 — per-framework pricing",
    "One annual price per framework, running inside the customer's own Microsoft 365 tenant. Says hiring the same work out as consulting runs $30k–$60k.",
    "audit evidence compliance management software pricing",
    "P-010"
  ),
  // --- key-person risk: documented pain, no product found ---
  s(
    "src-key-person-onetribe",
    "https://www.onetribeadvisory.com/knowledge-hub/key-person-risk-finance/",
    "Key-person risk in a finance team",
    "Concrete mitigation process: inventory and risk-rank critical processes by owner, backup, documentation status and financial impact; write controlled runbooks; cross-train without breaking segregation of duties; test continuity using only the runbook.",
    "key person risk finance team process documentation",
    "P-008"
  ),
  s(
    "src-key-person-glencoyne",
    "https://www.glencoyne.com/guides/key-person-finance-team",
    "Where key-person risk actually bites",
    "Names month-end close, cash management, payroll, journal entries and account reconciliations as the processes that depend on one person, with absence delaying reporting and leaving reconciliations unresolved.",
    "key person risk finance team process documentation",
    "P-008"
  ),
  s(
    "src-gips-cfa",
    "https://rpc.cfainstitute.org/research/financial-analysts-journal/1994/multicurrency-performance-attribution",
    "Multicurrency performance attribution",
    "The currency effect splits into a forward-premium component and a currency-selection component, which is why a single FX conversion cannot explain a multi-currency return. Useful for judging whether P-005 is a real analytical problem or only a formatting one.",
    "multi currency performance attribution advisor pain",
    "P-005"
  ),
  // --- family office: the mid-market price band ---
  s(
    "src-elara",
    "https://www.elara-insights.com/family-office-software",
    "Elara — family office portfolio reporting pricing",
    "Plans start at $12,000/yr (Essential) for single-family offices, $18,000/yr (Professional) for multi-entity, with custom enterprise pricing for multi-family offices and RIAs.",
    "family office portfolio reporting software price",
    "P-004"
  ),
  s(
    "src-asora",
    "https://www.asora.com/pricing",
    "Asora — family office data aggregation and reporting",
    "$15,600/yr headline, plus $3,600/yr per additional pack of 20 investment accounts, $3,600/yr for alternative fund holdings, and $4,000/yr for an extra module.",
    "family office portfolio reporting software price",
    "P-004"
  ),
  s(
    "src-fundcount",
    "https://fundcount.com/family-office-software-cost/",
    "Family office software cost breakdown",
    "FundCount publishes a starting price of $24,000/yr for its HNW and small family office package. The same page names key-person dependency and PDFs from private managers as live problems.",
    "family office portfolio reporting software price",
    "P-004"
  )
];

/** Suggested answers awaiting a human decision. Nothing here has been written to a record. */
export const seedProposals: Proposal[] = [
  {
    id: "prop-P005-pay",
    problemId: "P-005",
    signalKey: "pay",
    value: 2,
    reason:
      "GIPS composite reporting is a priced category with published entry prices: Opturo at $3,960–$5,940/yr, and verification bought separately at $7,900/yr. A price is accepted, but the cheapest published option is already under $6k, so a new entrant has little room above it.",
    sourceUrl: "https://opturo.com/says-application/composite-reporting/",
    status: "proposed",
    createdAt: SEED_COLLECTED_AT
  },
  {
    id: "prop-P005-cost",
    problemId: "P-005",
    signalKey: "cost",
    value: 3,
    reason: "Interviews and one hand-built composite report cost under €50. No data licences are needed to test the reporting step on real statements.",
    sourceUrl: "https://www.confluence.com/products/revolution-composites/",
    status: "proposed",
    createdAt: SEED_COLLECTED_AT
  },
  {
    id: "prop-P007-pain",
    problemId: "P-007",
    signalKey: "pain",
    value: 2,
    reason:
      "Three independent surveys put a client review pack at 2.1 hours automated against 5.5 manual, 239 minutes all-in, and a 160-minute UK median with a six-hour tail. Costly and recurring, but no penalty and no deadline — so 2, not 3.",
    sourceUrl: "https://www.businesshealth.com.au/wp-content/uploads/2023/07/Advice_Efficiency_Survey_2023.pdf",
    status: "proposed",
    createdAt: SEED_COLLECTED_AT
  },
  {
    id: "prop-P009-pain",
    problemId: "P-009",
    signalKey: "pain",
    value: 3,
    reason:
      "Per client, per month, not per year: 8–15 hours of manual bank reconciliation per client at month-end, and 15–20 hours a month for a single accountant across a book. A small firm reports 40+ hours a week on messy client data. A week of billable time producing no revenue is a deadline-shaped loss.",
    sourceUrl: "https://www.tryentries.com/blog/bank-reconciliation-automation-qbo-xero",
    status: "proposed",
    createdAt: SEED_COLLECTED_AT
  },
  {
    id: "prop-P010-moat",
    problemId: "P-010",
    signalKey: "moat",
    value: 0,
    reason:
      "Crowded and being undercut on price transparency. ComplyJet $5,000/yr flat, Evidr $5,988/yr, Complies from $79/month explicitly to undercut incumbents quoting $10,000+ behind a demo call, Compliance365 per framework inside the customer's own tenant. Nothing here is defensible on the evidence found.",
    sourceUrl: "https://complies.ai/pricing",
    status: "proposed",
    createdAt: SEED_COLLECTED_AT
  },
  {
    id: "prop-P008-pay",
    problemId: "P-008",
    signalKey: "pay",
    value: 0,
    reason:
      "The pain is documented by advisory firms and the GAO, and the recommended remedy is runbooks and cross-training — a process, not a purchase. No product with a price was found. On this evidence nobody pays for key-person risk until an incident has already happened.",
    sourceUrl: "https://www.onetribeadvisory.com/knowledge-hub/key-person-risk-finance/",
    status: "proposed",
    createdAt: SEED_COLLECTED_AT
  },
  {
    id: "prop-P004-pay",
    problemId: "P-004",
    signalKey: "pay",
    value: 2,
    reason:
      "Family office reporting is a priced category in exactly the mid-band this thesis needs: Elara from $12,000/yr, Asora $15,600/yr plus $3,600 per 20 accounts, FundCount from $24,000/yr. Each page also names private-manager PDFs and key-person dependency as live problems.",
    sourceUrl: "https://fundcount.com/family-office-software-cost/",
    status: "proposed",
    createdAt: SEED_COLLECTED_AT
  }
];
