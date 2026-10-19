import { expect, test, type Page } from "@playwright/test";

// The scripted model answers "settlement price" with a get_market_snapshot call
// and "draft the resolution" with a draft_resolution call (api/tests/fake_model.py).
const button = (page: Page, name: string | RegExp) => page.getByRole("button", { name });
// The scripted model streams its (long) reply word by word; follow-ups appear once it ends.
const REPLY = { timeout: 30_000 };

test.beforeEach(async ({ page }) => {
  // The test server allows free text; show the locked, prompt-driven UI that production has.
  await page.route("**/api/assistant/config?agent=triage", async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, json: { ...(await response.json()), restrictPrompts: true } });
  });
  await page.goto("/triage");
  await expect(page.getByTestId("break-card")).toBeVisible();
});

test("a break is pre-loaded and the only way forward is the starter prompts", async ({ page }) => {
  await expect(page.getByTestId("break-card")).toContainText("BRK-1001");
  await expect(page.getByRole("textbox", { name: "Message input" })).toBeDisabled();
  for (const name of ["Investigate this break", "Check the settlement price", "Draft the resolution"]) {
    await expect(button(page, new RegExp(name))).toBeVisible();
  }
});

test("tool calls show their arguments, then follow-ups lead to an approvable draft", async ({ page }) => {
  await button(page, /Check the settlement price/).click();
  await expect(page.locator("[data-user-prompt], [data-slot='aui_user-message-root']").first()).toContainText("BRK-1001");

  const call = page.getByTestId("tool-call").first();
  await expect(call).toContainText('get_market_snapshot(product="WTI Crude", date="2025-09-10")');

  // Follow-ups after the reply; draft_resolution renders as a card, not raw JSON.
  await expect(button(page, "Draft the resolution")).toBeVisible(REPLY);
  await button(page, "Draft the resolution").click();
  const card = page.getByTestId("draft-card");
  await expect(card).toContainText("Draft resolution · BRK-1001");
  await expect(card).toContainText("Draft only — nothing is executed.");

  await card.getByRole("button", { name: "Edit" }).click();
  await card.getByLabel("Proposed action").fill("Amend the booked price and notify the team lead.");
  await card.getByRole("button", { name: "Done editing" }).click();
  await expect(card).toContainText("edited");
  await expect(card).toContainText("notify the team lead");

  await card.getByRole("button", { name: "Approve" }).click();
  await expect(card).toHaveAttribute("data-decision", "approved");
  await expect(card).toContainText("executes nothing");
  await expect(card.getByRole("button", { name: "Approve" })).toHaveCount(0);
});

test("a draft can be rejected", async ({ page }) => {
  await button(page, /Draft the resolution/).click();
  const card = page.getByTestId("draft-card");
  await card.getByRole("button", { name: "Reject" }).click();
  await expect(card).toHaveAttribute("data-decision", "rejected");
});

test("picking another break loads it and starts over", async ({ page }) => {
  await button(page, /Check the settlement price/).click();
  await expect(page.getByTestId("tool-call")).toHaveCount(1);
  await page.getByTestId("open-breaks").click();
  await page.getByRole("button", { name: /BRK-1004/ }).click();
  await expect(page.getByTestId("break-card")).toContainText("BRK-1004");
  await expect(page.getByTestId("break-card")).toContainText("RBOB Gasoline");
  await expect(page.getByTestId("tool-call")).toHaveCount(0);
  await expect(button(page, /Investigate this break/)).toBeVisible();
});
