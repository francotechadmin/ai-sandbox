import { expect, test } from "@playwright/test";

test("the demo name opens a menu that switches demos without the homepage", async ({ page }) => {
  await page.goto("/assistant");
  await page.getByTestId("demo-switcher").click();
  await expect(page.getByRole("menuitem", { name: /Assistant/ })).toBeVisible();
  await page.getByRole("menuitem", { name: "All demos" }).click();
  await expect(page).toHaveURL("/");
});
