import { expect, test } from "@playwright/test";

test.describe("password reset", () => {
  test("exposes forgot-password link and sends a reset request", async ({ page }) => {
    const requestBodies: Record<string, unknown>[] = [];
    const recoveryUrls: string[] = [];

    await page.goto("/login");
    const forgotLink = page.getByRole("link", { name: "نسيت كلمة المرور؟" });
    await expect(forgotLink).toBeVisible();
    await forgotLink.click();

    await expect(page).toHaveURL(/\/auth\/forgot-password$/);
    await expect(page.getByRole("heading", { level: 1, name: "استعادة كلمة المرور" })).toBeVisible();

    await page.route("**/auth/v1/recover**", async (route) => {
      recoveryUrls.push(route.request().url());
      requestBodies.push(JSON.parse(route.request().postData() ?? "{}") as Record<string, unknown>);
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });

    await page.getByLabel("البريد الإلكتروني").fill("test@example.com");
    await page.getByRole("button", { name: "إرسال رابط الاستعادة" }).click();

    await expect(page.getByRole("status")).toContainText("تم إرسال تعليمات الاستعادة");
    expect(requestBodies).toHaveLength(1);
    expect(recoveryUrls).toHaveLength(1);
    const requestBody = requestBodies.at(-1)!;
    expect(requestBody["email"]).toBe("test@example.com");

    // Supabase sends redirect_to as a query parameter on the recovery request URL.
    const redirectTo = new URL(recoveryUrls.at(-1)!).searchParams.get("redirect_to");
    expect(redirectTo).toContain("/auth/confirm");
    expect(redirectTo).toContain("next=%2Fauth%2Fupdate-password");
  });

  test("validates and saves a new password after a recovery session", async ({ page }) => {
    const session = {
      access_token: "test-access-token",
      refresh_token: "test-refresh-token",
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: "bearer",
      user: {
        id: "00000000-0000-4000-8000-000000000001",
        aud: "authenticated",
        role: "authenticated",
        email: "test@example.com",
      },
    };

    // @supabase/ssr's browser client persists the session in cookies, not localStorage.
    await page.addInitScript((value) => {
      document.cookie = `sb-bqvcukxfsnchvkgejolz-auth-token=${encodeURIComponent(JSON.stringify(value))}; Path=/; SameSite=Lax`;
    }, session);

    const updateBodies: Record<string, unknown>[] = [];
    await page.route("**/auth/v1/user**", async (route) => {
      if (route.request().method() !== "PUT") {
        await route.continue();
        return;
      }
      updateBodies.push(JSON.parse(route.request().postData() ?? "{}") as Record<string, unknown>);
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
    expect(updateBodies).toHaveLength(1);
    const updateBody = updateBodies.at(-1)!;
    expect(updateBody["password"]).toBe("TestPass123");
  });
});
