import { expect, test, type Page } from "@playwright/test";

async function openAssistant(page: Page) {
  await page.goto("/assistant");
  await expect(page.getByTestId("settings")).toBeVisible();
}

// The chat is assistant-ui's own thread; these are its accessible names and data-slot hooks.
const composer = (page: Page) => page.getByRole("textbox", { name: "Message input" });
const sendButton = (page: Page) => page.getByRole("button", { name: "Send message" });
const slot = (page: Page, name: string) => page.locator(`[data-slot="${name}"]`);
const replies = (page: Page) => slot(page, "aui_assistant-message-root");
const userMessages = (page: Page) => slot(page, "aui_user-message-root");

async function send(page: Page, text: string) {
  await composer(page).fill(text);
  await sendButton(page).click();
}

// Back to idle: the send button returns once the run has finished.
const idle = (page: Page) => expect(sendButton(page)).toBeVisible();

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
  await composer(page).fill("tell me something");
  await sendButton(page).click();

  const snapshots = new Set<string>();
  await expect
    .poll(async () => {
      if ((await replies(page).count()) > 0) snapshots.add((await replies(page).first().innerText()).trim());
      return (await sendButton(page).count()) > 0 && snapshots.size;
    }, { intervals: [15] })
    .toBeGreaterThanOrEqual(4);
  await expect(slot(page, "reasoning-root")).toHaveCount(1);
});

test("tool calls render with their input and result, and can be switched off", async ({ page }) => {
  await send(page, "please calc 12*(3+4)");
  await idle(page);
  await slot(page, "tool-group-trigger").click();
  await replies(page).last().getByText("Used tool: calculator").click();
  await expect(replies(page).last()).toContainText("12*(3+4)");
  await expect(replies(page).last()).toContainText("84");
  await expect(slot(page, "reasoning-root")).toHaveCount(2);

  await page.getByLabel("calculator").uncheck();
  await send(page, "please calc 1+1");
  await idle(page);
  await expect(slot(page, "tool-group-root")).toHaveCount(1);
});

test("markdown is rendered", async ({ page }) => {
  await send(page, "markdown");
  const reply = replies(page).first();
  await expect(reply.locator("h2")).toHaveText("Markdown check");
  await expect(reply.locator("strong")).toHaveText("bold");
  await expect(reply.locator("pre code")).toContainText("def add");
  await expect(reply.getByRole("button", { name: "Copy" }).first()).toBeVisible();
  await expect(reply.locator("table")).toContainText("GPT-6 Luna");
});

test("a model failure is shown on the message", async ({ page }) => {
  await send(page, "boom");
  await expect(page.locator(".aui-message-error-root")).toContainText("scripted failure");
});

test("a failed request shows its error and keeps what the user typed", async ({ page }) => {
  await page.route("**/api/assistant/chat", (route) => route.abort());
  await send(page, "this will fail");
  await expect(page.locator(".aui-message-error-root")).toBeVisible();
  await expect(userMessages(page)).toHaveCount(1);
});

test("the system prompt persists across reloads; new chat and reset work", async ({ page }) => {
  await page.locator("#system-prompt").fill("Be terse.");
  await send(page, "hi");
  await idle(page);

  await page.reload();
  await expect(page.locator("#system-prompt")).toHaveValue("Be terse.");
  await page.getByTestId("new-chat").click();
  await expect(userMessages(page)).toHaveCount(0);
  await page.getByRole("button", { name: "Reset" }).click();
  await expect(page.locator("#system-prompt")).toHaveValue(/helpful assistant/);
});

test("when restricted, the input bar is locked and conversations walk down the prompt trees", async ({ page }) => {
  await page.route("**/api/assistant/config", async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, json: { ...(await response.json()), restrictPrompts: true } });
  });
  await page.reload();
  await expect(composer(page)).toBeDisabled();
  await expect(composer(page)).toHaveAttribute("placeholder", /token shortage/);
  // the system prompt is locked too: readable, not editable, no reset
  await expect(page.locator("#system-prompt")).toHaveAttribute("readonly", "");
  await expect(page.getByRole("button", { name: "Reset" })).toHaveCount(0);

  const chip = (name: string | RegExp) => page.getByRole("button", { name });
  await chip(/Do some math/).click();
  await expect(userMessages(page).first()).toContainText("18% tip");
  await idle(page);

  // Only the follow-ups of the last prompt are offered; the input stays locked.
  await expect(chip("Try 20% instead")).toBeVisible();
  await expect(chip(/Check the weather/)).toHaveCount(0);
  await chip("Add a fourth person").click();
  await expect(userMessages(page).nth(1)).toContainText("fourth person");
  await idle(page);
  await chip("Time for dinner?").click();
  await idle(page);
  await expect(composer(page)).toBeDisabled();

  // The conversation has ended: a note and a way to start over.
  await expect(page.getByText("And that's a wrap.")).toBeVisible();
  await chip("Start a new chat").click();
  await expect(userMessages(page)).toHaveCount(0);
  await expect(chip(/Check the weather/)).toBeVisible();
});

test("the landing page links to the assistant", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.getByRole("link", { name: "Open the assistant" }).click();
  await expect(page).toHaveURL(/\/assistant$/);
});
