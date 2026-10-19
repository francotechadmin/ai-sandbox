import { expect, test, type Locator } from "@playwright/test";

// A first-time visitor: the config marks every intro as seen by default.
const EMPTY = { cookies: [], origins: [] };

test.use({ viewport: { width: 375, height: 760 } });

// Anchored to the bottom edge once its slide-in settles, and short enough to
// leave the top bar (56px) and some of the page visible.
async function expectBottomDrawer(drawer: Locator) {
  await expect
    .poll(async () => {
      const b = await drawer.boundingBox();
      return b ? Math.round(b.y + b.height) : -1;
    })
    .toBe(760);
  const b = (await drawer.boundingBox())!;
  expect(b.y).toBeGreaterThanOrEqual(760 * 0.2 - 1);
}

for (const slug of ["assistant", "sql"]) {
  test(`${slug}: the top bar fits a phone and every action is reachable`, async ({ page }) => {
    await page.goto(`/${slug}`);
    const settings = page.getByRole("button", { name: "Settings" });
    await expect(settings).toBeVisible();
    await expect(page.getByTestId("demo-intro-open")).toBeVisible();
    const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    expect(noOverflow).toBe(true);
    const box = await page.getByTestId("demo-intro-open").boundingBox();
    expect(box!.x + box!.width).toBeLessThanOrEqual(375);
  });
}

test("settings opens as a bottom drawer on a phone and closes on Escape", async ({ page }) => {
  await page.goto("/sql");
  await page.getByRole("button", { name: "Settings" }).click();
  const drawer = page.getByTestId("settings");
  await expect(drawer).toBeVisible();
  await expectBottomDrawer(drawer);
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
});

test("the drawer handle stays visible while the drawer scrolls", async ({ page }) => {
  await page.goto("/sql");
  await page.getByRole("button", { name: "Settings" }).click();
  const drawer = page.getByTestId("settings");
  await expectBottomDrawer(drawer);
  const handle = page.getByTestId("drawer-handle");
  const top = (await drawer.boundingBox())!.y;
  await drawer.evaluate((el) => (el.scrollTop = el.scrollHeight));
  expect(await drawer.evaluate((el) => el.scrollTop)).toBeGreaterThan(100); // it really scrolled
  const h = (await handle.boundingBox())!;
  expect(Math.abs(h.y - top)).toBeLessThan(2);
  await expect(handle).toBeInViewport();
});

test("the database panel is a drawer on a phone", async ({ page }) => {
  await page.goto("/sql");
  await page.getByRole("button", { name: "Database" }).click();
  const drawer = page.getByTestId("database");
  await expect(drawer).toBeVisible();
  await expectBottomDrawer(drawer);
});

test("the intro is a drawer on a phone, and stays a centered dialog on desktop", async ({ browser, baseURL }) => {
  const fresh = await browser.newContext({ baseURL, storageState: EMPTY, viewport: { width: 375, height: 760 } });
  const phone = await fresh.newPage();
  await phone.goto("/sql");
  const intro = phone.getByTestId("demo-intro");
  await expect(intro).toBeVisible();
  await expectBottomDrawer(intro);
  await phone.getByRole("button", { name: "Start exploring" }).click();
  await expect(intro).toBeHidden();
  await fresh.close();

  const wide = await browser.newContext({ baseURL, storageState: EMPTY, viewport: { width: 1100, height: 760 } });
  const desktop = await wide.newPage();
  await desktop.goto("/sql");
  const dialog = desktop.getByTestId("demo-intro");
  await expect(dialog).toBeVisible();
  const d = await dialog.boundingBox();
  expect(d!.y).toBeGreaterThan(20);
  expect(d!.y + d!.height).toBeLessThan(740);
  await wide.close();
});
