import { test, expect } from "@playwright/test";

test("sign-in page shows the one action and names each failure", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  const button = page.getByRole("link", { name: /Continue with GitHub/ });
  await expect(button).toHaveAttribute("href", "/auth/signin");
  await expect(page.locator(".login-error")).toHaveCount(0);

  await page.goto("/login?error=exchange");
  await expect(page.locator(".login-error")).toHaveText(/session could not be exchanged/);
});

test("sign-in action stays above the fold on a phone, in light and dark", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  for (const theme of ["light", "dark"]) {
    await page.goto("/login");
    await page.evaluate((t) => (t === "dark" ? localStorage.setItem("oppie.lab.theme", "dark") : localStorage.removeItem("oppie.lab.theme")), theme);
    await page.reload();
    if (theme === "dark") await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    else await expect(page.locator("html")).not.toHaveAttribute("data-theme", "dark");
    const box = await page.getByRole("link", { name: /Continue with GitHub/ }).boundingBox();
    expect(box.y + box.height).toBeLessThanOrEqual(812);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  }
});

test("an OAuth code that lands outside the callback is handed to the callback", async ({ request }) => {
  const response = await request.get("/?code=abc-123", { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  const to = new URL(response.headers().location, "http://localhost");
  expect(to.pathname + to.search).toBe("/auth/callback?code=abc-123");

  const untouched = await request.get("/login", { maxRedirects: 0 });
  expect(untouched.status()).toBe(200);
});
