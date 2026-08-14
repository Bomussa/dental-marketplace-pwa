import { expect, test } from "@playwright/test";

test("home loads the dental comparison search", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /اعرف تكلفة العلاج/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "اعرض الخيارات" })).toBeVisible();
});
