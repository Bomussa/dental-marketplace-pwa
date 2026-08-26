import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const wcagTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function expectNoAutomaticWcagViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(wcagTags).analyze();
  expect(results.violations).toEqual([]);
}

test("home has no automatically detectable WCAG A/AA violations", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "ابحث وقارن واحجز بثقة" })).toBeVisible();
  await expectNoAutomaticWcagViolations(page);
});

test("login has no automatically detectable WCAG A/AA violations", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { level: 1, name: "سجّل الدخول إلى حسابك" })).toBeVisible();
  await expectNoAutomaticWcagViolations(page);
});
