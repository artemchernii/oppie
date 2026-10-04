const assert = require("assert");
const path = require("path");

const discovery = require(path.join(__dirname, "..", ".tmp-test", "discovery.js"));
const ingestion = require(path.join(__dirname, "..", ".tmp-test", "ingestion.js"));
const proposals = require(path.join(__dirname, "..", ".tmp-test", "proposals.js"));
const acceptance = require(path.join(__dirname, "..", ".tmp-test", "discoveryAcceptance.js"));
const view = require(path.join(__dirname, "..", ".tmp-test", "discoveryView.js"));
const inbox = require(path.join(__dirname, "..", ".tmp-test", "discoveryInbox.js"));
const trail = require(path.join(__dirname, "..", ".tmp-test", "problemTrail.js"));
const analysisLib = require(path.join(__dirname, "..", ".tmp-test", "analysis.js"));
const collectors = require(path.join(__dirname, "..", ".tmp-test", "collectors.js"));
const painSplit = require(path.join(__dirname, "..", ".tmp-test", "painSplit.js"));
const fixtures = require(path.join(__dirname, "..", ".tmp-test", "playwrightFixtures.js"));

let passed = 0;
let failed = 0;
// Collected, then run in order with await, so an async test's assertions actually run.
const tests = [];
const test = (name, fn) => tests.push([name, fn]);

test("a discovery direction is required", () => {
  assert.strictEqual(discovery.validateDiscoveryInput({ direction: "   " }), "A direction is required");
  assert.strictEqual(discovery.validateDiscoveryInput({ direction: "reconciliation" }), null);
});

test("a run starts queued and keeps the direction", () => {
  const run = discovery.newDiscoveryRun({ direction: " financial operations ", geography: "EU" }, "run-test", "2026-10-03T00:00:00.000Z");
  assert.deepStrictEqual(run, {
    id: "run-test",
    direction: "financial operations",
    geography: "EU",
    role: undefined,
    workflow: undefined,
    constraint: undefined,
    status: "queued",
    createdAt: "2026-10-03T00:00:00.000Z",
    updatedAt: "2026-10-03T00:00:00.000Z"
  });
});

test("proposal acceptance requires a reason and a source", () => {
  assert.strictEqual(discovery.validateProposalAcceptance("", ["src-1"]), "An acceptance reason is required");
  assert.strictEqual(discovery.validateProposalAcceptance("looks repeated", []), "At least one source is required");
  assert.strictEqual(discovery.validateProposalAcceptance("looks repeated", ["src-1"]), null);
});

test("source validation keeps the citation boundary explicit", () => {
  const base = { sourceType: "reddit", signalType: "pain", url: "https://reddit.com/r/test/post", title: "post", excerpt: "The workflow breaks every month.", foundFor: "reconciliation", linkStatus: "unverified" };
  assert.strictEqual(discovery.validateDiscoverySource({ ...base, excerpt: "" }), "A source excerpt is required");
  assert.strictEqual(discovery.validateDiscoverySource({ ...base, foundFor: "" }), "Source provenance is required");
  assert.strictEqual(discovery.validateDiscoverySource(base), null);
  assert.strictEqual(discovery.discoveryUrlKey("https://www.Reddit.com/r/test/post/?utm_source=x"), "reddit.com/r/test/post");
  assert.strictEqual(discovery.canonicalDiscoveryUrl("http://www.example.com/job/?utm_source=x&id=42"), "https://example.com/job?id=42");
  assert.notStrictEqual(discovery.discoveryUrlKey("https://indeed.com/viewjob?jk=one"), discovery.discoveryUrlKey("https://indeed.com/viewjob?jk=two"));
});

test("manual source URLs are classified without scraping", () => {
  assert.strictEqual(ingestion.sourceTypeForUrl("https://www.linkedin.com/jobs/view/1"), "job");
  assert.strictEqual(ingestion.sourceTypeForUrl("https://www.indeed.com/viewjob?jk=1"), "job");
  assert.strictEqual(ingestion.sourceTypeForUrl("https://www.upwork.com/jobs/~1"), "freelance");
  assert.strictEqual(ingestion.sourceTypeForUrl("https://www.fiverr.com/example/service"), "freelance");
  assert.strictEqual(ingestion.sourceTypeForUrl("https://vendor.example.com/pricing"), "vendor");
  const manual = ingestion.manualSourceInput({ url: "https://vendor.example.com/pricing", title: "Pricing", excerpt: "Starts at $100", foundFor: "reconciliation", citation: "Pricing section" });
  assert.strictEqual(manual.signalType, "price");
  assert.strictEqual(manual.citation, "Pricing section");
});

test("persisted source mapping keeps labels, citation and query provenance", () => {
  const source = discovery.discoverySourceFromRow({
    id: "src-1", run_id: "run-1", source_type: "vendor", signal_type: "price", url: "https://vendor.example/pricing",
    title: "Pricing", publisher: "Vendor", observed_at: "2026-10-03T00:00:00.000Z", excerpt: "Starts at $100",
    citation: "Pricing section", found_for: "financial operations in European RIAs", link_status: "checked",
    triage: "attached", created_at: "2026-10-03T01:00:00.000Z"
  });
  assert.deepStrictEqual(source, {
    id: "src-1", runId: "run-1", sourceType: "vendor", signalType: "price", url: "https://vendor.example/pricing",
    title: "Pricing", publisher: "Vendor", observedAt: "2026-10-03T00:00:00.000Z", excerpt: "Starts at $100",
    citation: "Pricing section", foundFor: "financial operations in European RIAs", linkStatus: "checked",
    triage: "attached", createdAt: "2026-10-03T01:00:00.000Z"
  });
});

test("Reddit listing mapping preserves pain excerpts and links", () => {
  const sources = ingestion.redditSources({ data: { children: [{ data: { id: "abc", permalink: "/r/test/comments/abc/problem/", title: "Month-end is painful", selftext: "We still match every row by hand.", subreddit_name_prefixed: "r/test", created_utc: 1720000000 } }] } }, "reconciliation");
  assert.strictEqual(sources.length, 1);
  assert.strictEqual(sources[0].signalType, "pain");
  assert.strictEqual(sources[0].url, "https://www.reddit.com/r/test/comments/abc/problem/");
  assert.strictEqual(sources[0].excerpt, "We still match every row by hand.");
});

test("proposal generation keeps missing signals as unknowns", () => {
  const generated = proposals.generateDiscoveryProposals("run-1", [{
    id: "src-1", runId: "run-1", sourceType: "job", signalType: "workflow", url: "https://example.com/job",
    title: "Operations role", excerpt: "Match broker files every day.", foundFor: "reconciliation", linkStatus: "unverified", triage: "untriaged", createdAt: "2026-10-03T00:00:00.000Z"
  }]);
  assert.strictEqual(generated.length, 1);
  assert.strictEqual(generated[0].status, "waiting");
  assert.ok(generated[0].unknowns.some((item) => item.includes("Pain")));
  assert.deepStrictEqual(generated[0].sourceIds, ["src-1"]);
});

test("proposal links only exact existing company URLs and keeps unmatched prices unknown", () => {
  const sources = [
    { id: "src-vendor", runId: "run-1", sourceType: "vendor", signalType: "price", url: "https://www.duco.com/pricing/?utm_source=search", title: "Pricing", excerpt: "$80,000/yr", foundFor: "reconciliation", linkStatus: "checked", triage: "untriaged", createdAt: "2026-10-03T00:00:00.000Z" },
    { id: "src-other", runId: "run-1", sourceType: "vendor", signalType: "price", url: "https://unknown.example/pricing", title: "Unknown pricing", excerpt: "Contact sales", foundFor: "other workflow", linkStatus: "unverified", triage: "untriaged", createdAt: "2026-10-03T00:00:00.000Z" }
  ];
  const generated = proposals.generateDiscoveryProposals("run-1", sources, [{ id: "c-duco", url: "https://duco.com/pricing" }]);
  assert.deepStrictEqual(generated[0].companyIds, ["c-duco"]);
  assert.strictEqual(generated[0].unknowns.some((item) => item.includes("exact existing company record")), false);
  assert.deepStrictEqual(generated[1].companyIds, []);
  assert.strictEqual(generated[1].unknowns.some((item) => item.includes("exact existing company record")), true);
});

test("accepted proposal becomes a Problem with cited evidence and no invented ratings", () => {
  const source = {
    id: "src-1", runId: "run-1", sourceType: "job", signalType: "workflow", url: "https://example.com/job",
    title: "Operations role", excerpt: "Match broker files every day.", foundFor: "reconciliation", linkStatus: "unverified", triage: "untriaged", createdAt: "2026-10-03T00:00:00.000Z"
  };
  const proposal = {
    id: "prop-1", runId: "run-1", title: "Review repeated work around reconciliation", workflow: "Match broker files every day.",
    unknowns: ["Who pays is unknown."], killReasons: [], sourceIds: ["src-1"], companyIds: [], status: "waiting"
  };
  const problem = acceptance.problemFromDiscoveryProposal(proposal, [source], "p-new", "2026-10-03T01:00:00.000Z");
  assert.strictEqual(problem.id, "p-new");
  assert.strictEqual(problem.what, proposal.workflow);
  assert.strictEqual(problem.unknowns, "Who pays is unknown.");
  assert.strictEqual(problem.signals.every((signal) => signal.value === null), true);
  assert.deepStrictEqual(problem.evidence[0], {
    id: "ev-src-1", type: "job", observation: source.excerpt, url: source.url,
    date: "2026-10-03", confidence: "reported", linkStatus: "unverified"
  });
});

test("linking a proposal preserves existing Problem fields and deduplicates citations", () => {
  const source = {
    id: "src-1", runId: "run-1", sourceType: "reddit", signalType: "pain", url: "https://reddit.com/post",
    title: "Pain", excerpt: "We still do this by hand.", foundFor: "reconciliation", linkStatus: "checked", triage: "untriaged", createdAt: "2026-10-03T00:00:00.000Z"
  };
  const proposal = { id: "prop-1", runId: "run-1", title: "Review", workflow: "Manual work", unknowns: ["Buyer unknown."], killReasons: [], sourceIds: ["src-1"], companyIds: [], status: "waiting" };
  const existing = acceptance.problemFromDiscoveryProposal(proposal, [], "p-existing", "2026-10-02T00:00:00.000Z");
  const merged = acceptance.mergeDiscoveryEvidence({ ...existing, title: "Human title", evidence: [acceptance.discoverySourceToEvidence(source)] }, proposal, [source], "2026-10-03T01:00:00.000Z");
  assert.strictEqual(merged.title, "Human title");
  assert.strictEqual(merged.evidence.length, 1);
  assert.ok(merged.unknowns.includes("Buyer unknown."));
});

// ---- 1.2: normalization of stored rows. Gaps stay gaps; bad values fall to the safe side.

test("a stored proposal keeps blank fields absent rather than inventing them", () => {
  const proposal = discovery.discoveryProposalFromRow({
    id: "prop-1", run_id: "run-1", title: "Review", workflow: null, actor: "", payer: "   ", workaround: null,
    business_pattern: undefined, unknowns: ["Buyer unknown.", ""], kill_reasons: null, source_ids: ["src-1"], company_ids: "nope", status: "waiting"
  });
  assert.strictEqual(proposal.workflow, "");
  assert.strictEqual(proposal.actor, undefined);
  assert.strictEqual(proposal.payer, undefined);
  assert.strictEqual(proposal.businessPattern, undefined);
  assert.deepStrictEqual(proposal.unknowns, ["Buyer unknown."]);
  assert.deepStrictEqual(proposal.killReasons, []);
  assert.deepStrictEqual(proposal.companyIds, []);
});

test("an unrecognised proposal status never reads as accepted", () => {
  assert.strictEqual(discovery.discoveryProposalFromRow({ id: "p", run_id: "r", title: "t", status: "approved" }).status, "waiting");
  assert.strictEqual(discovery.discoveryProposalFromRow({ id: "p", run_id: "r", title: "t", status: "accepted", decision_reason: "Repeated in 3 roles" }).decisionReason, "Repeated in 3 roles");
});

test("an unrecognised run status reads as failed, never ready", () => {
  const run = discovery.discoveryRunFromRow({ id: "run-1", direction: "ops", status: "done", geography: "", constraint_text: "EU only", created_at: "2026-10-03T00:00:00.000Z", updated_at: "2026-10-03T00:00:00.000Z" });
  assert.strictEqual(run.status, "failed");
  assert.strictEqual(run.geography, undefined);
  assert.strictEqual(run.constraint, "EU only");
});

test("a source row with unknown link status, signal or triage falls to the weakest reading", () => {
  const source = discovery.discoverySourceFromRow({ id: "s", run_id: "r", source_type: "blog", signal_type: "proof", url: "https://x.test", link_status: "ok", triage: "accepted", created_at: "t" });
  assert.strictEqual(source.sourceType, "manual");
  assert.strictEqual(source.signalType, "context");
  assert.strictEqual(source.linkStatus, "unverified");
  assert.strictEqual(source.triage, "untriaged");
  const kept = discovery.discoverySourceFromRow({ id: "s", run_id: "r", source_type: "job", signal_type: "budget", url: "https://x.test", link_status: "dead", triage: "discarded", created_at: "t" });
  assert.deepStrictEqual([kept.sourceType, kept.signalType, kept.linkStatus, kept.triage], ["job", "budget", "dead", "discarded"]);
});

// ---- 5.1: what /discover renders for a persisted run.

const runFixture = () => {
  const src = (id, signalType, triage = "untriaged") => ({
    id, runId: "run-1", sourceType: "reddit", signalType, url: `https://reddit.com/${id}`, title: id,
    excerpt: `excerpt ${id}`, foundFor: "reconciliation", linkStatus: "unverified", triage, createdAt: "2026-10-03T00:00:00.000Z"
  });
  return {
    run: { id: "run-1", direction: "financial operations", status: "queued", createdAt: "2026-10-03T00:00:00.000Z", updatedAt: "2026-10-03T00:00:00.000Z" },
    sources: [src("src-1", "pain"), src("src-2", "workflow", "attached"), src("src-3", "price", "discarded"), src("src-4", "demand")],
    proposals: [
      { id: "prop-a", runId: "run-1", title: "Accepted one", workflow: "w", unknowns: [], killReasons: [], sourceIds: ["src-2"], companyIds: [], status: "accepted" },
      { id: "prop-b", runId: "run-1", title: "Waiting one", workflow: "w", unknowns: ["Who pays is unknown."], killReasons: [], sourceIds: ["src-1", "src-2", "src-3", "src-gone"], companyIds: ["c-1", "c-gone"], status: "waiting" }
    ],
    companies: [{ id: "c-1", name: "Duco", role: "Reconciliation software", amount: "", location: "London" }]
  };
};

test("the run view counts rows and nothing else", () => {
  const result = view.runView(runFixture());
  assert.deepStrictEqual(result.counts, { sources: 4, untriaged: 2, attached: 1, discarded: 1, proposals: 2, waiting: 1 });
  assert.deepStrictEqual(Object.keys(result).sort(), ["candidates", "counts", "run"]);
});

test("waiting proposals are listed first, then stored order", () => {
  assert.deepStrictEqual(view.runView(runFixture()).candidates.map((c) => c.proposal.id), ["prop-b", "prop-a"]);
});

test("a candidate shows cited sources, and names discarded and missing ones instead of dropping them", () => {
  const candidate = view.runView(runFixture()).candidates[0];
  assert.deepStrictEqual(candidate.sources.map((s) => s.id), ["src-1", "src-2"]);
  assert.deepStrictEqual(candidate.discardedSourceIds, ["src-3"]);
  assert.deepStrictEqual(candidate.missingSourceIds, ["src-gone"]);
  assert.deepStrictEqual(candidate.missingCompanyIds, ["c-gone"]);
  assert.strictEqual(candidate.companies[0].amount, "", "an absent price stays absent; the page renders Not added yet");
});

test("signal groups keep pain, money and context apart, and a discarded price is not money", () => {
  const groups = view.runView(runFixture()).candidates[0].signalGroups;
  const count = (label) => groups.find((g) => g.label === label).sources.length;
  assert.deepStrictEqual(groups.map((g) => g.label), ["Work", "Pain", "Money", "Demand and context"]);
  assert.strictEqual(count("Work"), 1);
  assert.strictEqual(count("Pain"), 1);
  assert.strictEqual(count("Money"), 0);
  assert.strictEqual(count("Demand and context"), 0, "an uncited source is not pulled into a proposal");
});

test("a run with no proposals has no candidates, and nothing is invented to fill the page", () => {
  const data = runFixture();
  const result = view.runView({ ...data, proposals: [] });
  assert.strictEqual(result.candidates.length, 0);
  assert.strictEqual(result.counts.sources, 4);
});

test("status labels never claim more than the stored decision", () => {
  assert.strictEqual(view.proposalStatusLabel({ status: "waiting" }), "waiting for review · not accepted");
  assert.strictEqual(view.proposalStatusLabel({ status: "accepted" }), "accepted by a person");
  assert.strictEqual(view.plural(1, "source"), "1 source");
  assert.strictEqual(view.plural(0, "source"), "0 sources");
});

// ---- 5.2: what /inbox shows and sends.

const inboxFixture = () => {
  const src = (id, triage) => ({ id, runId: "run-1", sourceType: "job", signalType: "workflow", url: `https://example.com/${id}`, title: id, excerpt: `excerpt ${id}`, foundFor: "recon", linkStatus: "unverified", triage, createdAt: "t" });
  const proposal = { id: "prop-1", runId: "run-1", title: "Review", workflow: "w", unknowns: [], killReasons: [], sourceIds: ["s-new", "s-kept", "s-gone-bin", "s-missing"], companyIds: [], status: "waiting" };
  return { proposal, cited: [src("s-new", "untriaged"), src("s-kept", "attached"), src("s-gone-bin", "discarded")] };
};

test("a proposal card can cite kept and untriaged sources, never discarded or missing ones", () => {
  const { proposal, cited } = inboxFixture();
  const card = inbox.proposalCardView(proposal, cited);
  assert.deepStrictEqual(card.selectable.map((s) => s.id), ["s-new", "s-kept"]);
  assert.deepStrictEqual(card.discarded.map((s) => s.id), ["s-gone-bin"]);
  assert.deepStrictEqual(card.missingIds, ["s-missing"]);
});

test("an acceptance draft needs a reason, a selected source, and only this proposal's live sources", () => {
  const { proposal, cited } = inboxFixture();
  const card = inbox.proposalCardView(proposal, cited);
  assert.strictEqual(inbox.acceptanceDraftError({ reason: " ", sourceIds: ["s-new"], target: "new" }, card), "An acceptance reason is required");
  assert.strictEqual(inbox.acceptanceDraftError({ reason: "repeated", sourceIds: [], target: "new" }, card), "At least one source is required");
  assert.match(inbox.acceptanceDraftError({ reason: "repeated", sourceIds: ["s-gone-bin"], target: "new" }, card), /undiscarded/);
  assert.match(inbox.acceptanceDraftError({ reason: "repeated", sourceIds: ["s-other-run"], target: "new" }, card), /own/);
  assert.strictEqual(inbox.acceptanceDraftError({ reason: "repeated", sourceIds: ["s-new", "s-kept"], target: "new" }, card), null);
});

test("the accept body sends a problem id only when linking to an existing Problem", () => {
  assert.deepStrictEqual(inbox.acceptanceBody({ reason: "  why  ", sourceIds: ["s-new"], target: "new" }), { reason: "why", sourceIds: ["s-new"] });
  assert.deepStrictEqual(inbox.acceptanceBody({ reason: "why", sourceIds: ["s-new"], target: "P-005" }), { reason: "why", sourceIds: ["s-new"], problemId: "P-005" });
});

test("a rejection needs a reason too", () => {
  assert.strictEqual(inbox.rejectionDraftError("   "), "A rejection reason is required");
  assert.strictEqual(inbox.rejectionDraftError("Same as P-002"), null);
});

test("inbox counts are row counts of the queue and the recent decisions", () => {
  const { proposal } = inboxFixture();
  const counts = inbox.inboxCounts({ sources: [{}, {}], proposals: [proposal], citedSources: [], decided: [{ status: "accepted" }, { status: "rejected" }, { status: "rejected" }] });
  assert.deepStrictEqual(counts, { untriaged: 2, waiting: 1, accepted: 1, rejected: 2 });
});

test("a stored proposal carries the Problem it was accepted into", () => {
  assert.strictEqual(discovery.discoveryProposalFromRow({ id: "p", run_id: "r", title: "t", status: "accepted", problem_id: "p-abc" }).problemId, "p-abc");
  assert.strictEqual(discovery.discoveryProposalFromRow({ id: "p", run_id: "r", title: "t", status: "waiting", problem_id: null }).problemId, undefined);
});

// ---- 5.3: the decision trail on /problems/[id].

const trailDecision = () => ({
  proposal: { id: "prop-1", runId: "run-1", title: "Review", workflow: "", unknowns: [], killReasons: [], sourceIds: ["src-a", "src-b", "src-gone"], companyIds: [], status: "accepted", decisionReason: "  Two roles, same match.  ", decidedAt: "2026-10-04T10:00:00.000Z", problemId: "p-1" },
  direction: "financial operations",
  sources: ["src-a", "src-b"].map((id) => ({ id, runId: "run-1", sourceType: "job", signalType: "workflow", url: `https://example.com/${id}`, title: id, excerpt: "x", foundFor: "f", linkStatus: "unverified", triage: "attached", createdAt: "t" })),
  missingSourceIds: ["src-gone"]
});

test("the trail marks which selected sources are still in the record", () => {
  const [entry] = trail.problemTrail([{ id: "ev-src-a" }, { id: "p-1-e1" }], [trailDecision()]);
  assert.deepStrictEqual(entry.sources.map((s) => [s.source.id, s.inRecord]), [["src-a", true], ["src-b", false]]);
  assert.deepStrictEqual(entry.missingSourceIds, ["src-gone"]);
  assert.strictEqual(entry.reason, "Two roles, same match.");
  assert.strictEqual(entry.decidedOn, "2026-10-04");
});

test("the trail's evidence id matches what acceptance writes", () => {
  const source = trailDecision().sources[0];
  assert.strictEqual(trail.evidenceIdForSource(source.id), acceptance.discoverySourceToEvidence(source).id);
});

test("blank reason, date or direction stay blank rather than invented", () => {
  const decision = trailDecision();
  const [entry] = trail.problemTrail([], [{ ...decision, direction: " ", proposal: { ...decision.proposal, decisionReason: undefined, decidedAt: undefined } }]);
  assert.strictEqual(entry.reason, undefined);
  assert.strictEqual(entry.decidedOn, undefined);
  assert.strictEqual(entry.direction, undefined);
});

test("only discovery evidence gets an origin; hand-typed evidence gets none", () => {
  const origins = trail.evidenceOrigins(trail.problemTrail([{ id: "ev-src-a" }, { id: "p-1-e1" }], [trailDecision()]));
  assert.deepStrictEqual(origins.get("ev-src-a"), { proposalId: "prop-1", decidedOn: "2026-10-04" });
  assert.strictEqual(origins.has("p-1-e1"), false);
});

test("Playwright fixtures can never switch on in a production build", () => {
  assert.strictEqual(fixtures.playwrightFixturesActive({ PLAYWRIGHT_TEST: "1", NODE_ENV: "production" }), false);
  assert.strictEqual(fixtures.playwrightFixturesActive({ NODE_ENV: "development" }), false);
  assert.strictEqual(fixtures.playwrightFixturesActive({ PLAYWRIGHT_TEST: "1", NODE_ENV: "development" }), true);
});

// ---- (a): Inbox warns before a source answers "Paid today".

test("the Paid-today warning matches what acceptance writes and what the rubric reads", () => {
  const base = { id: "s", runId: "r", url: "https://x.test", title: "t", excerpt: "e", foundFor: "f", linkStatus: "unverified", triage: "untriaged", createdAt: "2026-10-04" };
  const job = { ...base, sourceType: "job", signalType: "workflow" };
  const vendor = { ...base, sourceType: "vendor", signalType: "context" };
  const priceSignal = { ...base, sourceType: "manual", signalType: "price" };
  const reddit = { ...base, sourceType: "reddit", signalType: "pain" };
  assert.deepStrictEqual([job, vendor, priceSignal, reddit].map(inbox.answersPaidToday), [true, true, true, false]);
  // Whatever the warning says must be what the rubric then does.
  for (const source of [job, vendor, priceSignal, reddit]) {
    const problem = acceptance.problemFromDiscoveryProposal({ id: "p", runId: "r", title: "t", workflow: "", unknowns: [], killReasons: [], sourceIds: ["s"], companyIds: [], status: "waiting" }, [source], "p-x", "2026-10-04T00:00:00.000Z");
    const paid = analysisLib.analyse(problem).dimensions.find((d) => d.key === "paid");
    assert.strictEqual(paid.verdict === "yes", inbox.answersPaidToday(source), `${source.sourceType}/${source.signalType}`);
  }
});

// ---- 2.5: failed runs, and acceptance with no partial outcome.

test("run status follows events, and a later success clears a failure", () => {
  assert.strictEqual(discovery.runStatusAfter("failed"), "failed");
  assert.strictEqual(discovery.runStatusAfter("source-saved"), "collecting");
  assert.strictEqual(discovery.runStatusAfter("proposals-built"), "ready");
});

test("a failed run blocks acceptance and says why", () => {
  assert.match(discovery.acceptanceBlockedByRun({ status: "failed", error: "Reddit search failed (503)" }), /run failed \(Reddit search failed \(503\)\)/);
  assert.strictEqual(discovery.acceptanceBlockedByRun({ status: "ready" }), null);
  assert.strictEqual(discovery.acceptanceBlockedByRun({ status: "collecting" }), null);
  assert.match(discovery.acceptanceBlockedByRun(null), /could not be read/);
});

const steps = (overrides = {}) => {
  const calls = [];
  const ok = (name) => async () => { calls.push(name); return { ok: true }; };
  return { calls, steps: {
    claim: async () => { calls.push("claim"); return { ok: true, claimed: true }; },
    writeProblem: ok("writeProblem"), release: ok("release"), link: ok("link"), attachSources: ok("attachSources"),
    ...Object.fromEntries(Object.entries(overrides).map(([k, fn]) => [k, async () => { calls.push(k); return fn(); }]))
  } };
};

test("acceptance runs claim, write, link, attach in that order", async () => {
  const { calls, steps: s } = steps();
  assert.deepStrictEqual(await acceptance.runAcceptance("p-1", s), { ok: true, problemId: "p-1" });
  assert.deepStrictEqual(calls, ["claim", "writeProblem", "link", "attachSources"]);
});

test("a proposal already decided elsewhere writes no Problem", async () => {
  const { calls, steps: s } = steps({ claim: () => ({ ok: true, claimed: false }) });
  const out = await acceptance.runAcceptance("p-1", s);
  assert.strictEqual(out.ok, false);
  assert.deepStrictEqual(calls, ["claim"]);
});

test("a failed Problem write releases the claim, so nothing is accepted", async () => {
  const { calls, steps: s } = steps({ writeProblem: () => ({ ok: false, error: "42501" }) });
  const out = await acceptance.runAcceptance("p-1", s);
  assert.strictEqual(out.ok, false);
  assert.match(out.error, /nothing was accepted: 42501/);
  assert.deepStrictEqual(calls, ["claim", "writeProblem", "release"]);
});

test("if the release also fails, the stuck state is named, not hidden", async () => {
  const { steps: s } = steps({ writeProblem: () => ({ ok: false, error: "w" }), release: () => ({ ok: false, error: "r" }) });
  const out = await acceptance.runAcceptance("p-1", s);
  assert.strictEqual(out.ok, false);
  assert.match(out.error, /could not be put back to waiting \(r\)/);
});

test("after the Problem exists, later failures are warnings, never a silent success", async () => {
  const { calls, steps: s } = steps({ link: () => ({ ok: false, error: "l" }), attachSources: () => ({ ok: false, error: "a" }) });
  const out = await acceptance.runAcceptance("p-1", s);
  assert.strictEqual(out.ok, true);
  assert.match(out.warning, /Accepted into p-1, but the Problem id was not recorded on the proposal \(l\) and the selected sources were not marked kept \(a\)/);
  assert.ok(!calls.includes("release"));
});

// ---- Automatic collection: real providers, honest labels.

const Q = (lane, provider, query = "q") => ({ lane, provider, query });

test("pain is earned by the words, not by the lane", () => {
  assert.strictEqual(collectors.describesPain("We still match every row by hand"), true);
  assert.strictEqual(collectors.describesPain("Overdue invoice follow up is a nightmare"), true);
  assert.strictEqual(collectors.describesPain("it takes 12 hours a week"), true);
  assert.strictEqual(collectors.describesPain("2,000 passengers per hour in each direction"), false);
  assert.strictEqual(collectors.describesPain("Invoicing software for agencies"), false);
});

test("a price is earned by a figure, not by a pricing page title", () => {
  assert.strictEqual(collectors.showsPrice("starting around $100/month"), true);
  assert.strictEqual(collectors.showsPrice("between $150 and $279 per user per month"), true);
  assert.strictEqual(collectors.showsPrice("The best invoicing tools for agencies"), false);
});

test("results must mention the direction; jobs must mention two of its words", () => {
  const terms = collectors.directionTerms("invoice chasing for small agencies");
  assert.deepStrictEqual(terms, ["invoice", "chasing", "small", "agencie"]);
  assert.strictEqual(collectors.mentionsDirection("Agencies chase invoices by hand", terms), true);
  assert.strictEqual(collectors.mentionsDirection("We can mine asteroids", terms), false);
  assert.strictEqual(collectors.mentionsDirection("Small team", terms, 2), false);
  assert.strictEqual(collectors.mentionsDirection("Invoice ops for small agencies", terms, 2), true);
});

test("Brave results map to sources with verbatim snippets and honest labels", () => {
  const payload = { web: { results: [
    { url: "https://www.reddit.com/r/x/1", title: "Invoice chasing", description: "Chasing each invoice by hand is a <strong>nightmare</strong>" },
    { url: "https://vendor.test/pricing", title: "Invoice tool", description: "Plans start at $100/month for agencies" },
    { url: "https://vendor.test/about", title: "Invoice tool", description: "We help agencies with invoices" },
    { url: "https://off.test", title: "Asteroids", description: "Mining asteroids is hard" },
    { url: "notaurl", title: "x", description: "invoice" }
  ] } };
  const pain = collectors.braveSources(payload, "invoice chasing for small agencies", Q("pain", "brave"));
  assert.deepStrictEqual(pain.map((s) => [s.sourceType, s.signalType]), [["reddit", "pain"], ["manual", "context"], ["manual", "context"]]);
  assert.strictEqual(pain[0].excerpt, "Chasing each invoice by hand is a nightmare");
  assert.strictEqual(pain[0].linkStatus, "unverified");
  assert.strictEqual(pain[0].foundFor, "invoice chasing for small agencies · pain: q");
  const business = collectors.braveSources(payload, "invoice chasing for small agencies", Q("business", "brave"));
  assert.deepStrictEqual(business.map((s) => [s.sourceType, s.signalType]), [["reddit", "context"], ["vendor", "price"], ["vendor", "context"]]);
});

test("Hacker News keeps only on-topic comments that describe pain", () => {
  const payload = { hits: [
    { objectID: "1", comment_text: "Reconciling invoices by hand every month is tedious", story_title: "Ask HN" },
    { objectID: "2", comment_text: "Invoices are interesting", story_title: "Ask HN" },
    { objectID: "3", comment_text: "Mining asteroids by hand is tedious" }
  ] };
  const out = collectors.hnSources(payload, "invoice chasing", Q("pain", "hn"));
  assert.deepStrictEqual(out.map((s) => s.url), ["https://news.ycombinator.com/item?id=1"]);
  assert.strictEqual(out[0].signalType, "pain");
});

test("a job is budget only when it states a salary", () => {
  const payload = { jobs: [
    { url: "https://j.test/1", title: "Invoice chasing specialist", company_name: "Acme", salary: "$50k", description: "Chase small agency invoices" },
    { url: "https://j.test/2", title: "Invoice chasing assistant", company_name: "Beta", salary: "", description: "Chase invoices for small agencies" },
    { url: "https://j.test/3", title: "Rails engineer", company_name: "Gamma", salary: "$120k", description: "Build invoices UI" }
  ] };
  const out = collectors.remotiveSources(payload, "invoice chasing for small agencies", Q("money", "remotive"));
  assert.deepStrictEqual(out.map((s) => [s.publisher, s.signalType]), [["Acme", "budget"], ["Beta", "workflow"]]);
  assert.match(out[0].excerpt, /^Salary: \$50k\./);
});

test("one failing provider never hides what the others returned", async () => {
  const fake = async (url) => {
    if (url.includes("brave")) return { ok: false, status: 429, json: async () => ({}) };
    if (url.includes("algolia")) return { ok: true, status: 200, json: async () => ({ hits: [{ objectID: "9", comment_text: "Invoice chasing by hand is painful" }] }) };
    throw new Error("network down");
  };
  const lanes = await collectors.collect("invoice chasing", fake, { BRAVE_API_KEY: "k" });
  assert.strictEqual(lanes.length, collectors.collectorPlan("invoice chasing").length);
  assert.deepStrictEqual(lanes.filter((l) => l.provider === "brave").map((l) => l.error), Array(4).fill("brave answered 429"));
  assert.strictEqual(lanes.find((l) => l.provider === "hn").sources.length, 1);
  assert.strictEqual(lanes.find((l) => l.provider === "remotive").error, "network down");
});

test("without a Brave key, Brave lanes say so instead of silently returning nothing", async () => {
  const lanes = await collectors.collect("invoice chasing", async () => ({ ok: true, status: 200, json: async () => ({}) }), {});
  assert.ok(lanes.filter((l) => l.provider === "brave").every((l) => l.error === "BRAVE_API_KEY is not set"));
});

test("collected sources from one run group into one proposal across lanes", () => {
  const src = (id, foundFor, signalType) => ({ id, runId: "r", sourceType: "reddit", signalType, url: `https://x.test/${id}`, title: id, excerpt: `e ${id}`, foundFor, linkStatus: "unverified", triage: "untriaged", createdAt: "t" });
  const out = proposals.generateDiscoveryProposals("r", [
    src("a", "invoice chasing · pain: q1", "pain"), src("b", "invoice chasing · business: q2", "price"), src("c", "manual direction", "workflow")
  ]);
  assert.deepStrictEqual(out.map((p) => p.sourceIds), [["a", "b"], ["c"]]);
  assert.strictEqual(out[0].title, "Review repeated work around invoice chasing");
});

// ---- Splitting a run into distinct pains: the model suggests, the stored sources decide.

const splitSources = () => {
  const src = (id, lane, sourceType, excerpt) => ({ id, runId: "r", sourceType, signalType: lane === "business" ? "price" : "pain", url: `https://x.test/${id}`, title: `title ${id}`, excerpt, foundFor: `invoice chasing · ${lane}: q`, linkStatus: "unverified", triage: "untriaged", createdAt: "t" });
  return [
    src("p1", "pain", "reddit", "Overdue invoice follow up is a nightmare. It kills cash flow."),
    src("p2", "pain", "reddit", "We chase every late payment by hand, 40 hours a month."),
    src("b1", "business", "vendor", "Invoice chasing software. Plans start at $29/month for agencies."),
    src("b2", "business", "vendor", "Outsourced receivables for small firms.")
  ];
};
const pain = (overrides = {}) => ({
  name: "Agencies chase late invoices by hand", who: "agency owners", description: "They chase by hand.",
  evidence: [{ sourceId: "p1", quote: "Overdue invoice follow up is a nightmare" }, { sourceId: "p2", quote: "We chase every late payment by hand" }],
  businesses: [{ sourceId: "b1", name: "ChaseCo", offer: "chasing software", priceQuote: "Plans start at $29/month" }],
  unknowns: ["Who approves the purchase."], ...overrides
});

test("a quote must appear word for word in its source", () => {
  assert.strictEqual(painSplit.quotedVerbatim("overdue INVOICE follow up", "Overdue invoice follow up is a nightmare."), true);
  assert.strictEqual(painSplit.quotedVerbatim("Overdue invoices are always a nightmare", "Overdue invoice follow up is a nightmare."), false);
  assert.strictEqual(painSplit.quotedVerbatim("a", "a b c"), false, "a quote too short to mean anything is refused");
});

test("a correct split is kept whole", () => {
  const report = painSplit.checkSplit({ pains: [pain()] }, splitSources());
  assert.deepStrictEqual(report.dropped, { quotes: 0, businesses: 0, prices: 0, pains: 0 });
  assert.deepStrictEqual(report.pains[0].painSourceIds, ["p1", "p2"]);
  assert.deepStrictEqual(report.pains[0].businessSourceIds, ["b1"]);
});

test("invented quotes, unknown ids and business sources cited as pain are dropped and counted", () => {
  const report = painSplit.checkSplit({ pains: [pain({ evidence: [
    { sourceId: "p1", quote: "Overdue invoice follow up is a nightmare" },
    { sourceId: "p2", quote: "Agencies lose 30% of revenue to late payment" },
    { sourceId: "p9", quote: "Overdue invoice follow up is a nightmare" },
    { sourceId: "b1", quote: "Invoice chasing software" }
  ] })] }, splitSources());
  assert.deepStrictEqual(report.pains[0].painSourceIds, ["p1"]);
  assert.strictEqual(report.dropped.quotes, 3);
});

test("a pain with no supported evidence is dropped entirely", () => {
  const report = painSplit.checkSplit({ pains: [pain({ evidence: [{ sourceId: "p1", quote: "a quote that is not there at all" }] })] }, splitSources());
  assert.strictEqual(report.pains.length, 0);
  assert.strictEqual(report.dropped.pains, 1);
});

test("a business must come from the business lane, and an unquoted price is stripped, not kept", () => {
  const report = painSplit.checkSplit({ pains: [pain({ businesses: [
    { sourceId: "p2", name: "Not a business", offer: "x", priceQuote: "" },
    { sourceId: "b1", name: "ChaseCo", offer: "chasing", priceQuote: "$19/month" },
    { sourceId: "b2", name: "AR Outsourcing", offer: "people chasing", priceQuote: "" }
  ] })] }, splitSources());
  assert.deepStrictEqual(report.pains[0].businessSourceIds, ["b1", "b2"]);
  assert.strictEqual(report.pains[0].businesses[0].priceQuote, "", "a price the source does not state is removed");
  assert.deepStrictEqual([report.dropped.businesses, report.dropped.prices], [1, 1]);
});

test("each kept pain becomes one waiting proposal, with repetition stated from the evidence", () => {
  const report = painSplit.checkSplit({ pains: [pain(), pain({ name: "Second pain", evidence: [{ sourceId: "p2", quote: "We chase every late payment by hand" }], businesses: [] })] }, splitSources());
  let n = 0;
  const out = painSplit.proposalsFromSplit("r", report, () => `prop-${++n}`);
  assert.deepStrictEqual(out.map((p) => [p.id, p.title, p.status]), [["prop-1", "Agencies chase late invoices by hand", "waiting"], ["prop-2", "Second pain", "waiting"]]);
  assert.deepStrictEqual(out[0].sourceIds, ["p1", "p2", "b1"]);
  assert.match(out[0].unknowns[0], /Described in 2 sources/);
  assert.match(out[1].unknowns[0], /Repetition is not established yet/);
  assert.match(out[1].unknowns[1], /No business selling a fix/);
  assert.strictEqual(out[0].businessPattern, "Already sold by: ChaseCo — chasing software (“Plans start at $29/month”)");
  assert.strictEqual(out[1].businessPattern, undefined);
});

test("the gateway call sends the schema and surfaces a refusal such as a missing card", async () => {
  let sent = null;
  const ok = await painSplit.requestSplit("invoice chasing", splitSources(), "tok", async (url, init) => {
    sent = { url, body: JSON.parse(init.body), auth: init.headers.Authorization };
    return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: JSON.stringify({ pains: [pain()] }) } }] }), text: async () => "" };
  });
  assert.strictEqual(ok.ok, true);
  assert.strictEqual(sent.url, "https://ai-gateway.vercel.sh/v1/chat/completions");
  assert.strictEqual(sent.auth, "Bearer tok");
  assert.strictEqual(sent.body.response_format.json_schema.name, "pain_split");
  assert.match(sent.body.messages[1].content, /\[S1\] lane=pain/);
  assert.match(sent.body.messages[1].content, /\[S3\] lane=business/);
  assert.ok(!sent.body.messages[1].content.includes("[p1]"), "real ids are not shown to the model");
  const refused = await painSplit.requestSplit("x", splitSources(), "tok", async () => ({ ok: false, status: 403, json: async () => ({}), text: async () => "AI Gateway requires a valid credit card on file" }));
  assert.match(refused.error, /^AI Gateway answered 403: AI Gateway requires a valid credit card/);
});

test("the model cites short labels, and they map back to the real source ids", () => {
  const sources = splitSources();
  const resolved = painSplit.resolveLabels({ pains: [pain({
    evidence: [{ sourceId: "S1", quote: "Overdue invoice follow up is a nightmare" }, { sourceId: "[s2]", quote: "We chase every late payment by hand" }, { sourceId: "S99", quote: "Overdue invoice follow up is a nightmare" }],
    businesses: [{ sourceId: "S3", name: "ChaseCo", offer: "chasing", priceQuote: "Plans start at $29/month" }]
  })] }, sources);
  assert.deepStrictEqual(resolved.pains[0].evidence.map((e) => e.sourceId), ["p1", "p2", "S99"]);
  assert.strictEqual(resolved.pains[0].businesses[0].sourceId, "b1");
  const report = painSplit.checkSplit(resolved, sources);
  assert.deepStrictEqual(report.pains[0].painSourceIds, ["p1", "p2"]);
  assert.strictEqual(report.dropped.quotes, 1, "an unknown label is dropped, never guessed");
});

(async () => {
  for (const [name, fn] of tests) {
    try {
      await fn();
      passed += 1;
      console.log("PASS  " + name);
    } catch (error) {
      failed += 1;
      console.log("FAIL  " + name + "\n      " + error.message);
    }
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
})();
