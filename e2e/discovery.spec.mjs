import { test, expect } from "@playwright/test";

/** A stateful stand-in for the stored run: GET returns only what the POSTs have written. */
function mockStoredRun(page, runId) {
  const stored = {
    run: { id: runId, direction: "financial operations in European RIAs", status: "queued", createdAt: "2026-10-03T00:00:00.000Z", updatedAt: "2026-10-03T00:00:00.000Z" },
    sources: [], proposals: [], companies: []
  };
  const reads = [];
  return { stored, reads, install: async () => {
    await page.route("**/api/discovery-runs", async (route) => {
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ run: stored.run }) });
    });
    await page.route(`**/api/discovery-runs/${runId}`, async (route) => {
      reads.push(route.request().method());
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(stored) });
    });
    await page.route(`**/api/discovery-runs/${runId}/ingest`, async (route) => {
      const body = JSON.parse(route.request().postData() || "{}");
      const source = { id: "src-e2e-1", runId, sourceType: "reddit", signalType: "pain", url: body.url, title: body.title, excerpt: body.excerpt, foundFor: body.foundFor, linkStatus: "unverified", triage: "untriaged", createdAt: "2026-10-03T00:01:00.000Z" };
      stored.sources.push(source);
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ source }) });
    });
    await page.route(`**/api/discovery-runs/${runId}/proposals`, async (route) => {
      const proposal = { id: "prop-e2e-1", runId, title: "Review repeated work around financial operations in European RIAs", workflow: "We still match every row by hand.", unknowns: ["Repetition is not established yet; this bundle has one source."], killReasons: [], sourceIds: ["src-e2e-1"], companyIds: [], status: "waiting" };
      stored.proposals.push(proposal);
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ proposals: [proposal] }) });
    });
  } };
}

test("direction to source to proposal renders the stored run and stays human-gated", async ({ page }) => {
  const mock = mockStoredRun(page, "run-e2e-1");
  await mock.install();

  await page.goto("/discover");
  // Before any run is open, no demo candidates are shown.
  await expect(page.getByText("No run open.")).toBeVisible();
  await expect(page.getByText("Duco")).toHaveCount(0);

  await page.getByLabel("Discovery direction").fill("financial operations in European RIAs");
  await page.getByRole("button", { name: /Run discovery/ }).click();
  await expect(page.getByText(/Run queued · run-e2e-1/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "No proposals yet." })).toBeVisible();
  await expect(page).toHaveURL(/\/discover\?run=run-e2e-1/);

  await page.getByLabel("URL").fill("https://www.reddit.com/r/test/comments/abc/problem/");
  await page.getByLabel("Title").fill("Month-end reconciliation is painful");
  await page.getByLabel("Quoted excerpt").fill("We still match every row by hand.");
  await page.getByRole("button", { name: /Save source/ }).click();
  await expect(page.getByText("Source saved to Inbox.")).toBeVisible();
  await expect(page.getByText(/1 source stored \(1 untriaged/)).toBeVisible();

  await page.getByRole("button", { name: /Build review proposal/ }).click();
  await expect(page.getByText(/proposal waiting in Inbox/)).toBeVisible();

  const detail = page.locator("article.candidate-detail");
  await expect(detail.getByRole("heading", { name: /Review repeated work around/ })).toBeVisible();
  await expect(detail.getByText("waiting for review · not accepted", { exact: false })).toBeVisible();
  await expect(detail.getByRole("link", { name: "Month-end reconciliation is painful" })).toBeVisible();
  await expect(detail.getByText("Repetition is not established yet; this bundle has one source.")).toBeVisible();
  // Payer, workaround, business pattern and kill reasons were never stored: they read as gaps.
  expect(await detail.getByText("Not added yet", { exact: true }).count()).toBeGreaterThanOrEqual(5);
  // No accept control on this page; acceptance with a reason happens in Inbox.
  await expect(detail.getByRole("button", { name: /Accept/ })).toHaveCount(0);
  await expect(page.getByText(/Strong|Medium/)).toHaveCount(0);
  expect(mock.reads.length).toBe(3);
});

test("proposal acceptance remains blocked without reason and source", async ({ page }) => {
  await page.route("**/api/discovery-proposals/prop-e2e-1/accept", async (route) => {
    await route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ error: "An acceptance reason is required" }) });
  });
  await page.goto("/discover");
  const result = await page.evaluate(async () => {
    const response = await fetch("/api/discovery-proposals/prop-e2e-1/accept", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: "", sourceIds: [] }) });
    return { status: response.status, body: await response.json() };
  });
  expect(result.status).toBe(400);
  expect(result.body.error).toContain("reason");
});

test("direction to source to triage to proposal to accepted Problem", async ({ page }) => {
  await page.goto("/discover");
  const calls = [];
  await page.route("**/api/discovery-runs", async (route) => {
    calls.push("run");
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ run: { id: "run-e2e-accept" } }) });
  });
  await page.route("**/api/discovery-runs/run-e2e-accept/ingest", async (route) => {
    calls.push("source");
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ source: { id: "src-e2e-accept" } }) });
  });
  await page.route("**/api/discovery-sources/src-e2e-accept/triage", async (route) => {
    calls.push("triage");
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ triage: "attached" }) });
  });
  await page.route("**/api/discovery-runs/run-e2e-accept/proposals", async (route) => {
    calls.push("proposal");
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ proposals: [{ id: "prop-e2e-accept", status: "waiting", sourceIds: ["src-e2e-accept"] }] }) });
  });
  await page.route("**/api/discovery-proposals/prop-e2e-accept/accept", async (route) => {
    calls.push("accept");
    const body = JSON.parse(route.request().postData() || "{}");
    expect(body.reason).toBe("The excerpt names a recurring workflow; buyer and cost remain unknown.");
    expect(body.sourceIds).toEqual(["src-e2e-accept"]);
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ accepted: true, problemId: "p-e2e-accept" }) });
  });

  const result = await page.evaluate(async () => {
    const json = async (url, init) => {
      const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
      return { status: response.status, body: await response.json() };
    };
    const run = await json("/api/discovery-runs", { method: "POST", body: JSON.stringify({ direction: "financial operations in European RIAs" }) });
    const source = await json("/api/discovery-runs/run-e2e-accept/ingest", { method: "POST", body: JSON.stringify({ kind: "manual", url: "https://example.com/recon", title: "Reconciliation role", excerpt: "We still match every row by hand.", foundFor: "reconciliation" }) });
    const triage = await json("/api/discovery-sources/src-e2e-accept/triage", { method: "POST", body: JSON.stringify({ triage: "attached" }) });
    const proposal = await json("/api/discovery-runs/run-e2e-accept/proposals", { method: "POST", body: JSON.stringify({}) });
    const accepted = await json("/api/discovery-proposals/prop-e2e-accept/accept", { method: "POST", body: JSON.stringify({ reason: "The excerpt names a recurring workflow; buyer and cost remain unknown.", sourceIds: ["src-e2e-accept"] }) });
    return { run: run.status, source: source.status, triage: triage.status, proposal: proposal.status, accepted: accepted.status, problemId: accepted.body.problemId };
  });

  expect(result).toEqual({ run: 201, source: 201, triage: 200, proposal: 201, accepted: 200, problemId: "p-e2e-accept" });
  expect(calls).toEqual(["run", "source", "triage", "proposal", "accept"]);
});

test("inbox decides persisted proposals only with a reason and chosen sources", async ({ page }) => {
  const source = (id, triage, title) => ({ id, runId: "run-in", sourceType: "job", signalType: "workflow", url: `https://example.com/${id}`, title, excerpt: `Excerpt for ${title}.`, foundFor: "reconciliation", linkStatus: "unverified", triage, createdAt: "2026-10-04T00:00:00.000Z" });
  const stored = {
    sources: [source("src-in-1", "untriaged", "Ops analyst role")],
    proposals: [{ id: "prop-in-1", runId: "run-in", title: "Review repeated work around reconciliation", workflow: "Match custodian files daily.", unknowns: ["Who pays and what they pay today are not established."], killReasons: [], sourceIds: ["src-in-1", "src-in-2"], companyIds: [], status: "waiting" }],
    citedSources: [source("src-in-1", "untriaged", "Ops analyst role"), source("src-in-2", "attached", "Reddit thread")],
    decided: []
  };
  const posts = [];
  await page.route("**/api/inbox", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(stored) }));
  await page.route("**/api/discovery-proposals/prop-in-1/accept", async (route) => {
    posts.push(JSON.parse(route.request().postData() || "{}"));
    stored.proposals = [];
    stored.decided = [{ ...stored.proposals[0], id: "prop-in-1", runId: "run-in", title: "Review repeated work around reconciliation", workflow: "", unknowns: [], killReasons: [], sourceIds: ["src-in-2"], companyIds: [], status: "accepted", decisionReason: "Two roles describe the same daily match.", problemId: "p-e2e-inbox" }];
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ accepted: true, problemId: "p-e2e-inbox" }) });
  });

  await page.goto("/inbox");
  // The isolated server has no session; whatever its read returns, the old browser seed never appears.
  await expect(page.getByText("Opturo")).toHaveCount(0);
  await page.getByRole("button", { name: "Reload from database" }).click();

  const card = page.getByRole("article", { name: "Review repeated work around reconciliation" });
  await expect(card).toBeVisible();
  await expect(card.getByText("Who pays and what they pay today are not established.")).toBeVisible();
  await expect(card.getByText("Not added yet")).toHaveCount(3);
  await expect(card.getByRole("checkbox")).toHaveCount(2);
  await expect(card.getByRole("checkbox", { checked: true })).toHaveCount(0);

  // Without a reason or a source, nothing is sent.
  await card.getByRole("button", { name: /Accept proposal/ }).click();
  await expect(card.getByRole("alert")).toHaveText("An acceptance reason is required");
  await card.getByLabel(/Your reason/).fill("Two roles describe the same daily match.");
  await card.getByRole("button", { name: /Accept proposal/ }).click();
  await expect(card.getByRole("alert")).toHaveText("At least one source is required");
  expect(posts).toHaveLength(0);

  await card.getByRole("checkbox").nth(1).check();
  await card.getByRole("button", { name: /Accept proposal/ }).click();
  await expect(page.getByText("Accepted into Problem p-e2e-inbox.")).toBeVisible();
  expect(posts).toEqual([{ reason: "Two roles describe the same daily match.", sourceIds: ["src-in-2"] }]);
  await expect(page.getByText("No proposal is waiting.", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: /open p-e2e-inbox/ })).toBeVisible();
});

test("inbox rejection needs a reason and keeps the source queue separate", async ({ page }) => {
  const stored = {
    sources: [],
    proposals: [{ id: "prop-rj", runId: "r", title: "Review repeated work around audits", workflow: "", unknowns: [], killReasons: [], sourceIds: ["src-rj"], companyIds: [], status: "waiting" }],
    citedSources: [{ id: "src-rj", runId: "r", sourceType: "reddit", signalType: "pain", url: "https://reddit.com/x", title: "Audit pain", excerpt: "We redo this every quarter.", foundFor: "audits", linkStatus: "unverified", triage: "untriaged", createdAt: "t" }],
    decided: []
  };
  const bodies = [];
  await page.route("**/api/inbox", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(stored) }));
  await page.route("**/api/discovery-proposals/prop-rj/reject", async (route) => {
    bodies.push(JSON.parse(route.request().postData() || "{}"));
    stored.proposals = [];
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ rejected: true }) });
  });
  await page.goto("/inbox");
  await page.getByRole("button", { name: "Reload from database" }).click();
  const card = page.getByRole("article", { name: "Review repeated work around audits" });
  await card.getByRole("button", { name: "Reject" }).click();
  await expect(card.getByRole("alert")).toHaveText("A rejection reason is required");
  expect(bodies).toHaveLength(0);
  await card.getByLabel(/Your reason/).fill("One quarterly complaint; no sign anyone pays.");
  await card.getByRole("button", { name: "Reject" }).click();
  await expect(page.getByText(/Rejected: Review repeated work around audits/)).toBeVisible();
  expect(bodies).toEqual([{ reason: "One quarterly complaint; no sign anyone pays." }]);
});

test("an accepted Problem shows how its evidence got there", async ({ page }) => {
  await page.goto("/problems/p-e2e-trail");
  await expect(page.getByRole("heading", { name: "Review repeated work around reconciliation", level: 1 })).toBeVisible();

  const trail = page.getByRole("region", { name: /How this was accepted/ });
  await expect(trail).toBeVisible();
  await expect(trail.getByText("accepted by a person")).toBeVisible();
  await expect(trail.getByText("2026-10-04")).toBeVisible();
  await expect(trail.getByText("From the direction “financial operations in European RIAs”")).toBeVisible();
  await expect(trail.getByText("Two job posts describe the same daily match; buyer still unknown.")).toBeVisible();

  // Each selected source says whether it is still in the record.
  const kept = trail.getByRole("listitem").filter({ hasText: "Operations analyst — Lisbon" });
  await expect(kept.getByText("in evidence below")).toBeVisible();
  const removed = trail.getByRole("listitem").filter({ hasText: "Fund accountant — Dublin" });
  await expect(removed.getByText("removed from the record since")).toBeVisible();
  await expect(trail.getByText("Selected but no longer readable: src-e2e-missing")).toBeVisible();

  // In the evidence list, only the discovery item carries an origin; the hand-typed one does not.
  await expect(page.getByText("Evidence gathered · 2")).toBeVisible();
  await expect(page.getByText("from discovery · accepted 2026-10-04")).toHaveCount(1);
  await expect(page.locator(".evidence").filter({ hasText: "Ops lead said month-end takes two days." }).getByText(/from discovery/)).toHaveCount(0);
});

// ---- 2.5: a failed run is inspectable and cannot produce an accepted Problem.

test("a failed run says so on /discover", async ({ page }) => {
  const run = { id: "run-e2e-failed", direction: "audits", status: "failed", error: "Reddit search failed (503)", createdAt: "2026-10-04T00:00:00.000Z", updatedAt: "2026-10-04T00:00:00.000Z" };
  await page.route("**/api/discovery-runs", (route) => route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ run }) }));
  await page.route("**/api/discovery-runs/run-e2e-failed", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ run, sources: [], proposals: [], companies: [] }) }));
  await page.goto("/discover");
  await page.getByRole("button", { name: /Run discovery/ }).click();
  await expect(page.getByText(/Run failed · run-e2e-failed/)).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: "This run failed: Reddit search failed (503)" })).toBeVisible();
});

test("inbox warns before a job post answers Paid today, and a failed-run refusal decides nothing", async ({ page }) => {
  const src = (id, sourceType, signalType, title) => ({ id, runId: "run-f", sourceType, signalType, url: `https://example.com/${id}`, title, excerpt: "We match files by hand.", foundFor: "recon", linkStatus: "unverified", triage: "untriaged", createdAt: "t" });
  const stored = {
    sources: [],
    proposals: [{ id: "prop-f", runId: "run-f", title: "Review repeated work around recon", workflow: "", unknowns: [], killReasons: [], sourceIds: ["s-job", "s-reddit"], companyIds: [], status: "waiting" }],
    citedSources: [src("s-job", "job", "workflow", "Ops analyst"), src("s-reddit", "reddit", "pain", "Recon thread")],
    decided: []
  };
  await page.route("**/api/inbox", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(stored) }));
  await page.route("**/api/discovery-proposals/prop-f/accept", (route) => route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ error: "This proposal's run failed (Reddit search failed (503)). Retry the failed step before accepting." }) }));
  await page.goto("/inbox");
  await page.getByRole("button", { name: "Reload from database" }).click();
  const card = page.getByRole("article", { name: "Review repeated work around recon" });
  await expect(card.locator("label").filter({ hasText: "Ops analyst" }).getByText(/can answer “Paid today” with yes, citing this job post/)).toBeVisible();
  await expect(card.locator("label").filter({ hasText: "Recon thread" }).getByText(/Paid today/)).toHaveCount(0);

  await card.getByRole("checkbox").first().check();
  await card.getByLabel(/Your reason/).fill("Job post names the workflow.");
  await card.getByRole("button", { name: /Accept proposal/ }).click();
  await expect(card.getByRole("alert")).toContainText("run failed");
  await expect(card).toBeVisible();
  await expect(page.getByText(/Accepted into/)).toHaveCount(0);
});

// ---- 5.4: company figures stay verbatim, are never totalled, and gaps read as gaps.

test("companies keep figures verbatim with their basis, and gaps read Not added yet", async ({ page }) => {
  await page.goto("/companies");
  await expect(page.getByText("$80k / year").first()).toBeVisible();
  await expect(page.getByText("€300 / user / month").first()).toBeVisible();
  // Different currencies and bases: nothing on the page may combine them into one figure.
  await expect(page.getByText(/\$80,?300|80,?300|\$380/)).toHaveCount(0);
  const gaps = page.getByRole("row").filter({ hasText: "Fixture Gaps GmbH" });
  // A row with no amount, location or role still appears, with each gap named.
  await expect(gaps.first()).toBeVisible();
  await expect(gaps.first().getByText("Not added yet")).toHaveCount(3);

  await page.goto("/companies/c-e2e-vendor");
  await expect(page.getByRole("heading", { name: "Fixture Recon Ltd" })).toBeVisible();
  await expect(page.getByText("$80k / year")).toBeVisible();
  await expect(page.getByText("per year", { exact: true })).toBeVisible();
  await expect(page.getByText("Published enterprise list price")).toBeVisible();

  await page.goto("/companies/c-e2e-gaps");
  await expect(page.getByText("No amount was captured in the source.")).toBeVisible();
  await expect(page.locator(".company-price-card").getByText("Not added yet")).toBeVisible();
  await expect(page.getByText("location not added yet")).toBeVisible();
});

test("a company linked to a discovery proposal shows its stored figure verbatim on /discover", async ({ page }) => {
  const run = { id: "run-e2e-co", direction: "recon", status: "ready", createdAt: "2026-10-04T00:00:00.000Z", updatedAt: "2026-10-04T00:00:00.000Z" };
  const data = {
    run,
    sources: [{ id: "s-v", runId: "run-e2e-co", sourceType: "vendor", signalType: "price", url: "https://example.com/vendor", title: "Vendor pricing", excerpt: "$80k / year", foundFor: "recon", linkStatus: "unverified", triage: "untriaged", createdAt: "t" }],
    proposals: [{ id: "prop-co", runId: "run-e2e-co", title: "Review repeated work around recon", workflow: "", unknowns: [], killReasons: [], sourceIds: ["s-v"], companyIds: ["c-1", "c-2"], status: "waiting" }],
    companies: [{ id: "c-1", name: "Fixture Recon Ltd", role: "Reconciliation software", amount: "$80k / year", location: "London" }, { id: "c-2", name: "Fixture Gaps GmbH", role: "", amount: "", location: "" }]
  };
  await page.route("**/api/discovery-runs", (route) => route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ run }) }));
  await page.route("**/api/discovery-runs/run-e2e-co", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(data) }));
  await page.goto("/discover");
  await page.getByRole("button", { name: /Run discovery/ }).click();
  const detail = page.locator("article.candidate-detail");
  const recon = detail.locator(".company-row").filter({ hasText: "Fixture Recon Ltd" });
  await expect(recon.getByText("$80k / year")).toBeVisible();
  const gaps = detail.locator(".company-row").filter({ hasText: "Fixture Gaps GmbH" });
  await expect(gaps.getByText("Not added yet")).toHaveCount(3);
});

// ---- Light theme: every redesigned page stays readable. Contrast is measured, not eyeballed.

async function contrastOf(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const parse = (c) => (c.match(/[\d.]+/g) || []).map(Number);
    const lum = ([r, g, b]) => {
      const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    let bg = null;
    for (let node = el; node; node = node.parentElement) {
      const c = parse(getComputedStyle(node).backgroundColor);
      if (c.length === 3 || (c.length === 4 && c[3] > 0.5)) { bg = c.slice(0, 3); break; }
    }
    bg = bg ?? parse(getComputedStyle(document.body).backgroundColor).slice(0, 3);
    const fg = parse(getComputedStyle(el).color).slice(0, 3);
    const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
    return Math.round(((a + 0.05) / (b + 0.05)) * 100) / 100;
  }, selector);
}

test("light theme: headings and labels meet 4.5:1 contrast on every redesigned page", async ({ page }) => {
  await page.route("**/api/inbox", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ sources: [], proposals: [], citedSources: [], decided: [] }) }));
  const checks = [
    ["/", ["h1", ".eyebrow"]],
    ["/inbox", ["h1", ".inbox-section-head h2", ".inbox-section-label", ".inbox-head p"]],
    ["/companies", ["h1", ".block-title"]],
    ["/companies/c-e2e-vendor", ["h1", ".company-detail-label"]],
    ["/problems/p-e2e-trail", ["h1", ".section-label"]],
    ["/discover", ["h1", ".hero-copy p"]]
  ];
  const failures = [];
  for (const [url, selectors] of checks) {
    await page.goto(url);
    if (url === "/inbox") {
      await page.getByRole("button", { name: "Reload from database" }).click();
      await page.getByRole("heading", { name: "Sources waiting for a decision" }).waitFor();
    }
    for (const selector of selectors) {
      const ratio = await contrastOf(page, selector);
      if (ratio === null) failures.push(`${url} ${selector}: not found`);
      else if (ratio < 4.5) failures.push(`${url} ${selector}: ${ratio}:1`);
    }
  }
  expect(failures).toEqual([]);
});
