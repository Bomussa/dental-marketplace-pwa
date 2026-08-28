import { expect, test } from "@playwright/test";

test.describe("password reset", () => {
  test("exposes forgot-password link and sends a reset request", async ({ page }) => {
    let requestBody: Record<string, unknown> | null = null;

    await page.goto("/login");
    const forgotLink = page.getByRole("link", { name: "نسيت كلمة المرور؟" });
    await expect(forgotLink).toBeVisible();
    await forgotLink.click();

    await expect(page).toHaveURL(/\/auth\/forgot-password$/);
    await expect(page.getByRole("heading", { level: 1, name: "استعادة كلمة المرور" })).toBeVisible();

    await page.route("**/auth/v1/recover**", async (route) => {
      requestBody = JSON.parse(route.request().postData() ?? "{}");
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });

    await page.getByLabel("البريد الإلكتروني").fill("test@example.com");
    await page.getByRole("button", { name: "إرسال رابط الاستعادة" }).click();

    await expect(page.getByRole("status")).toContainText("تم إرسال تعليمات الاستعادة");
    expect(requestBody).not.toBeNull();
    expect(requestBody?.email).toBe("test@example.com");
    expect(String(requestBody?.redirect_to)).toContain("/auth/confirm");
    expect(String(requestBody?.redirect_to)).toContain("next=%2Fauth%2Fupdate-password");
  });

  test("validates and saves a new password after a recovery session", async ({ page }) => {
    await page.addInitScript(() => {
      const now = Math.floor(Date.now() / 1000);
      localStorage.setItem(
        "sb-bqvcukxfsnchvkgejolz-auth-token",
        JSON.stringify({
          access_token: "test-access-token",
          refresh_token: "test-refresh-token",
          expires_in: 3600,
          expires_at: now + 3600,
          token_type: "bearer",
          user: {
            id: "00000000-0000-4000-8000-000000000001",
            aud: "authenticated",
            role: "authenticated",
            email: "test@example.com",
          },
        }),
      );
    });

    let updateBody: Record<string, unknown> | null = null;
    await page.route("**/auth/v1/user**", async (route) => {
      if (route.request().method() !== "PUT") {
        await route.continue();
        return;
      }
      updateBody = JSON.parse(route.request().postData() ?? "{}");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "00000000-0000-4000-8000-000000000001",
          aud: "authenticated",
          role: "authenticated",
          email: "test@example.com",
          user_metadata: {},
          app_metadata: {},
        }),
      });
    });

    await page.goto("/auth/update-password");
    await expect(page.getByRole("heading", { level: 1, name: "إنشاء كلمة مرور جديدة" })).toBeVisible();
    await expect(page.getByLabel("كلمة المرور الجديدة")).toBeVisible();

    await page.getByLabel("كلمة المرور الجديدة").fill("TestPass123");
    await page.getByLabel("تأكيد كلمة المرور الجديدة").fill("Different123");
    await page.getByRole("button", { name: "حفظ كلمة المرور" }).click();
    await expect(page.getByRole("alert")).toContainText("كلمتا المرور غير متطابقتين");

    await page.getByLabel("تأكيد كلمة المرور الجديدة").fill("TestPass123");
    await page.getByRole("button", { name: "حفظ كلمة المرور" }).click();
    await expect(page.getByRole("status")).toContainText("تم حفظ كلمة المرور بنجاح");
    expect(updateBody?.password).toBe("TestPass123");
  });
});
