// oppie.lab — records for the isolated Playwright server, and nothing else.
//
// The test server has no session, so every Supabase read is refused, and a server-rendered page
// cannot be mocked from the browser. This supplies one Problem and its decision trail instead.
//
// Active only when PLAYWRIGHT_TEST=1 AND the build is not production — the same gate the
// middleware uses for its OAuth bypass. A production build never returns anything from here.

import { emptyProblem, type Company, type Problem } from "./problems";
import type { AcceptedDecision } from "./problemTrail";

export const playwrightFixturesActive = (env: Record<string, string | undefined> = process.env) =>
  env.PLAYWRIGHT_TEST === "1" && env.NODE_ENV !== "production";

export const FIXTURE_PROBLEM_ID = "p-e2e-trail";

const source = (id: string, title: string, excerpt: string, signalType: "workflow" | "pain") => ({
  id, runId: "run-e2e-trail", sourceType: "job" as const, signalType, url: `https://example.com/${id}`, title, excerpt,
  foundFor: "reconciliation", linkStatus: "unverified" as const, triage: "attached" as const, createdAt: "2026-10-04T09:00:00.000Z"
});

export function playwrightProblems(): Problem[] {
  const problem = emptyProblem(FIXTURE_PROBLEM_ID);
  return [{
    ...problem,
    title: "Review repeated work around reconciliation",
    action: "researching",
    what: "Match custodian files daily.",
    unknowns: "Who pays and what they pay today are not established.",
    evidence: [
      // Brought in by the accepted proposal below.
      { id: "ev-src-e2e-kept", type: "job", observation: "Reconcile custodian files daily.", url: "https://example.com/src-e2e-kept", date: "2026-10-04", confidence: "reported", linkStatus: "unverified" },
      // Typed in by hand; it has no discovery trail.
      { id: `${FIXTURE_PROBLEM_ID}-e1`, type: "personal", observation: "Ops lead said month-end takes two days.", url: "", date: "2026-10-04", confidence: "reported" }
    ],
    companyIds: ["c-e2e-vendor"],
    createdAt: "2026-10-04T10:00:00.000Z",
    updatedAt: "2026-10-04T10:00:00.000Z"
  }];
}

/** Two priced rows in different currencies and bases (never to be summed), and one with gaps. */
export function playwrightCompanies(): Company[] {
  const base = { confidence: "reported" as const, linkStatus: "unverified" as const, amountNote: "", url: "" };
  return [
    { ...base, id: "c-e2e-vendor", name: "Fixture Recon Ltd", kind: "vendor", location: "London", country: "GB", role: "Reconciliation software", amount: "$80k / year", amountNote: "Published enterprise list price", currency: "USD", basis: "per_year", url: "https://example.com/vendor", linkStatus: "checked" },
    { ...base, id: "c-e2e-seat", name: "Fixture Seats Inc", kind: "vendor", location: "Austin", country: "US", role: "Matching tool", amount: "€300 / user / month", currency: "EUR", basis: "per_user_month" },
    { ...base, id: "c-e2e-gaps", name: "Fixture Gaps GmbH", kind: "bespoke", location: "", country: "", role: "", amount: "", currency: "", basis: "" }
  ];
}

export function playwrightTrail(problemId: string): AcceptedDecision[] {
  if (problemId !== FIXTURE_PROBLEM_ID) return [];
  return [{
    proposal: {
      id: "prop-e2e-trail", runId: "run-e2e-trail", title: "Review repeated work around reconciliation",
      workflow: "Match custodian files daily.", unknowns: [], killReasons: [],
      sourceIds: ["src-e2e-kept", "src-e2e-removed", "src-e2e-missing"], companyIds: [], status: "accepted",
      decisionReason: "Two job posts describe the same daily match; buyer still unknown.",
      decidedAt: "2026-10-04T10:00:00.000Z", problemId: FIXTURE_PROBLEM_ID
    },
    direction: "financial operations in European RIAs",
    sources: [
      source("src-e2e-kept", "Operations analyst — Lisbon", "Reconcile custodian files daily.", "workflow"),
      // Selected at acceptance, later deleted from the Problem's evidence by a person.
      source("src-e2e-removed", "Fund accountant — Dublin", "Investigate breaks every morning.", "pain")
    ],
    missingSourceIds: ["src-e2e-missing"]
  }];
}
