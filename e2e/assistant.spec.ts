import { expect, test, type Page } from "@playwright/test";

async function openAssistant(page: Page) {
  await page.goto("/assistant");
  await expect(page.getByTestId("settings")).toBeVisible();
}

async function send(page: Page, text: string) {
  await page.getByTestId("composer-input").fill(text);
  await page.getByTestId("send").click();
}

const idle = (page: Page) => expect(page.getByTestId("send")).toBeVisible();
const replies = (page: Page) => page.getByTestId("assistant-message");

test.beforeEach(async ({ page }) => {
  await openAssistant(page);
});

test("settings start from the server: first available model, prompt seeded, keyless models disabled", async ({ page }) => {
  await expect(page.locator("#model")).toHaveValue("demo-fake");
  await expect(page.locator("#model option[value=claude-haiku-4-5]")).toBeDisabled();
  await expect(page.locator("#system-prompt")).toHaveValue(/helpful assistant/);
});

test("the system prompt is sent, and edits apply to the next message", async ({ page }) => {
  await send(page, "hello");
  await expect(replies(page).first()).toContainText("[system: You are a helpful assistant");
  await idle(page);

  await page.locator("#system-prompt").fill("Be terse.");
  await send(page, "hi");
  await expect(replies(page).nth(1)).toContainText("[system: Be terse.]");
});

test("reasoning is on by default and replies stream in incrementally", async ({ page }) => {
  await expect(page.getByRole("switch")).toHaveCount(0);
  await page.getByTestId("composer-input").fill("tell me something");
  await page.getByTestId("send").click();

  const snapshots = new Set<string>();
  await expect
    .poll(async () => {
      if ((await replies(page).count()) > 0) snapshots.add((await replies(page).first().innerText()).trim());
      return (await page.getByTestId("send").count()) > 0 && snapshots.size;
    }, { intervals: [15] })
    .toBeGreaterThanOrEqual(4);
  await expect(replies(page).last().getByTestId("reasoning")).toHaveCount(1);
});

test("tool calls render with their input and result, and can be switched off", async ({ page }) => {
  await send(page, "please calc 12*(3+4)");
  await expect(page.getByTestId("tool-result").first()).toHaveText("84");
  await expect(page.getByTestId("tool-call").first()).toContainText("12*(3+4)");
  await idle(page);
  await expect(replies(page).last()).toContainText("84");
  await expect(replies(page).last().getByTestId("reasoning")).toHaveCount(2);

  await page.getByLabel("calculator").uncheck();
  await send(page, "please calc 1+1");
  await idle(page);
  await expect(page.getByTestId("tool-call")).toHaveCount(1);
});

test("markdown is rendered", async ({ page }) => {
  await send(page, "markdown");
  const reply = replies(page).first();
  await expect(reply.locator("h2")).toHaveText("Markdown check");
  await expect(reply.locator("strong")).toHaveText("bold");
  await expect(reply.locator("pre code")).toContainText("def add");
  await expect(reply.getByRole("button", { name: "Copy code" })).toBeVisible();
  await expect(reply.locator("table")).toContainText("GPT-5 mini");
});

test("a model failure is shown on the message", async ({ page }) => {
  await send(page, "boom");
  await expect(page.getByTestId("message-error")).toContainText("scripted failure");
});

test("a failed request shows its error and keeps what the user typed", async ({ page }) => {
  await page.route("**/api/assistant/chat", (route) => route.abort());
  await send(page, "this will fail");
  await expect(page.getByTestId("message-error")).toBeVisible();
  await expect(page.getByTestId("user-message")).toHaveCount(1);
});

test("the system prompt persists across reloads; new chat and reset work", async ({ page }) => {
  await page.locator("#system-prompt").fill("Be terse.");
  await send(page, "hi");
  await idle(page);

  await page.reload();
  await expect(page.locator("#system-prompt")).toHaveValue("Be terse.");
  await page.getByTestId("new-chat").click();
  await expect(page.getByTestId("user-message")).toHaveCount(0);
  await page.getByRole("button", { name: "Reset" }).click();
  await expect(page.locator("#system-prompt")).toHaveValue(/helpful assistant/);
});

test("the landing page links to the assistant", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.getByRole("link", { name: "Open the assistant" }).click();
  await expect(page).toHaveURL(/\/assistant$/);
});
