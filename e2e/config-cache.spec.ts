import { expect, test } from "@playwright/test";

const slowConfig = async (page: import("@playwright/test").Page) =>
  page.route("**/api/assistant/config*", async (route) => {
    await new Promise((r) => setTimeout(r, 3000));
    await route.continue();
  });

test("the landing page warms the config, so the demo opens without waiting", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => Object.keys(localStorage).some((k) => k.startsWith("assistant-config-v1:")));
  await slowConfig(page);
  await page.getByRole("link", { name: /Assistant/ }).first().click();
  await expect(page.getByRole("textbox", { name: "Message input" })).toBeVisible({ timeout: 1500 });
  await expect(page.getByText("Loading…")).toHaveCount(0);
});

test("a cold first visit shows a skeleton, then the chat", async ({ page }) => {
  await slowConfig(page);
  await page.goto("/assistant");
  await expect(page.getByText("Loading…")).toHaveCount(0);
  await expect(page.locator('[data-slot="skeleton"]').first()).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Message input" })).toBeVisible({ timeout: 6000 });
});
