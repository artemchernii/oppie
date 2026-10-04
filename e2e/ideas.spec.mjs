import { test, expect } from "@playwright/test";

// The isolated server serves fixture numbers (lib/ideaRemote.ts, fixtureBoard / fixtureDetail).

test("the home page is the Ideas board: numbers first, decided ideas last, blanks never zero", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Which idea is worth your time?" })).toBeVisible();
  const cards = page.getByTestId("idea-card");
  await expect(cards).toHaveCount(11);
  await expect(page.getByTestId("ideas-summary")).toContainText("11 ideas · 1 decided · 10 waiting for you");

  // The parked idea sorts last and says who decided.
  await expect(cards.last()).toContainText("NIS2 security proof for small suppliers");
  await expect(cards.last()).toContainText("Parked by you");

  // A count the fixture could not read renders as "Not added yet", not as 0.
  const unread = page.getByTestId("idea-card").filter({ hasText: "Outsourced credit control outside the UK" });
  await expect(unread).toContainText("Not added yet");

  // Every card labels the one-line answer as the agent's, and quotes prices with the seller named.
  await expect(cards.first()).toContainText("Agent note");
  await expect(page.getByTestId("idea-card").filter({ hasText: "Chasing late invoices" })).toContainText("Trove");
});

// The menu is drawn only for a signed-in person, which the isolated server never has; its links
// are checked in source, and the page it points at here.
test("the old problem list lives at /problems as Tracked problems", async ({ page }) => {
  await page.goto("/problems");
  await expect(page.getByRole("heading", { name: "Tracked problems" })).toBeVisible();
});

test("an idea opens to four boxes, and a decision needs a reason", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("idea-card").filter({ hasText: "Contract renewals" }).click();
  await expect(page).toHaveURL(/\/ideas\/contract-renewals$/);
  for (const label of ["1 · The answer in one line", "2 · Who already sells it", "3 · Proof people complain", "4 · Still unknown"]) {
    await expect(page.getByText(label)).toBeVisible();
  }
  await page.getByText("Show all 4 sellers found").click();
  await expect(page.getByText("“$699/month”")).toBeVisible();

  await page.getByRole("button", { name: /Park/ }).click();
  await page.getByRole("button", { name: "Save: Park" }).click();
  await expect(page.locator(".idea-error")).toHaveText(/reason/);

  await page.getByLabel("Why? One sentence.").fill("Tools exist at every price.");
  await page.getByRole("button", { name: "Save: Park" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved: Parked by you.");
});

test("the decision endpoint refuses a missing reason and an unknown idea", async ({ request }) => {
  const noReason = await request.post("/api/ideas/contract-renewals/decision", { data: { status: "drop", reason: " " } });
  expect(noReason.status()).toBe(400);
  const unknown = await request.post("/api/ideas/not-an-idea/decision", { data: { status: "drop", reason: "x" } });
  expect(unknown.status()).toBe(404);
});

test("board and detail fit a phone and read in light and dark", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  for (const theme of ["light", "dark"]) {
    for (const path of ["/", "/ideas/aml-kyc-fintech"]) {
      await page.goto(path);
      await page.evaluate((t) => (t === "dark" ? localStorage.setItem("oppie.lab.theme", "dark") : localStorage.removeItem("oppie.lab.theme")), theme);
      await page.reload();
      expect(await page.evaluate(() => document.documentElement.scrollWidth), `${path} ${theme}`).toBeLessThanOrEqual(375);
      // Numbers keep a visible colour against the page in both themes.
      const colour = await page.locator(".idea-numbers b").first().evaluate((el) => getComputedStyle(el).color);
      expect(colour).not.toBe("rgba(0, 0, 0, 0)");
    }
  }
});
