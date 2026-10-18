import { expect, test } from "@playwright/test";

// Start as a first-time visitor: nothing marked as seen.
test.use({ storageState: { cookies: [], origins: [] } });

test("a demo's intro opens on the first visit, not again once dismissed, and reopens from the info button", async ({ page }) => {
  await page.goto("/assistant");
  const intro = page.getByTestId("demo-intro");
  await expect(intro).toBeVisible();
  await intro.getByRole("button", { name: "Got it" }).click();
  await expect(intro).toBeHidden();

  await page.reload();
  await expect(page.getByTestId("demo-intro-open")).toBeVisible();
  await expect(intro).toBeHidden();

  await page.getByTestId("demo-intro-open").click();
  await expect(intro).toBeVisible();
});

test("each demo keeps its own seen state", async ({ page }) => {
  await page.goto("/assistant");
  await page.getByTestId("demo-intro").getByRole("button", { name: "Got it" }).click();
  await page.goto("/sql");
  await expect(page.getByTestId("demo-intro")).toBeVisible();
});
