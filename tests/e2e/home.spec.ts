import { expect, test } from "@playwright/test";

const rootCanalMolarVariant = "d172470d-b8ec-43af-b668-e39ebf108956";

test("home loads the Arabic comparison search and reaches a valid empty-result state", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1, name: "علاج الأسنان المناسب، بسعر واضح وموعد حقيقي." })).toBeVisible();
  await expect(page.getByRole("button", { name: "عرض النتائج" })).toBeVisible();
  await expect(page.getByRole("button", { name: "استخدم موقعي لترتيب الأقرب" })).toBeVisible();

  await page.getByRole("button", { name: "عرض النتائج" }).click();
  await expect(page).toHaveURL(/\/results\?/);
  await expect(page.getByRole("heading", { level: 1, name: "تبييض داخل العيادة" })).toBeVisible();
  await expect(page.getByText("لا توجد عروض مؤهلة الآن")).toBeVisible();
});

test("treatment selection refreshes exact variants instead of keeping a stale variant", async ({ page }) => {
  await page.goto("/");
  const form = page.getByRole("form", { name: "البحث عن علاج أسنان" });
  const treatment = form.locator('select[name="treatment"]');
  const variant = form.locator('select[name="variant"]');

  await treatment.selectOption({ label: "علاج عصب" });
  await expect(variant).toHaveValue("ae31a746-ee5a-4cb9-9eb8-0ba1ea804993");
  await expect(variant.locator("option")).toHaveCount(3);
  await variant.selectOption(rootCanalMolarVariant);
  await expect(variant).toHaveValue(rootCanalMolarVariant);
});

test("appointment preference survives into the results URL", async ({ page }) => {
  await page.goto("/");
  const form = page.getByRole("form", { name: "البحث عن علاج أسنان" });
  await form.locator('select[name="treatment"]').selectOption({ label: "علاج عصب" });
  await form.locator('select[name="variant"]').selectOption(rootCanalMolarVariant);
  await form.locator('select[name="when"]').selectOption("tomorrow");
  await page.getByRole("button", { name: "عرض النتائج" }).click();

  await expect(page).toHaveURL(new RegExp(`variant=${rootCanalMolarVariant}`));
  await expect(page).toHaveURL(/when=tomorrow/);
  await expect(page.getByRole("heading", { level: 1, name: "علاج عصب — ضرس" })).toBeVisible();
});

test("location denial degrades safely and keeps search usable", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (_success: PositionCallback, error?: PositionErrorCallback) => {
          error?.({
            code: 1,
            message: "permission denied by deterministic E2E fixture",
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
          } as GeolocationPositionError);
        },
        watchPosition: () => 0,
        clearWatch: () => undefined,
      },
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "استخدم موقعي لترتيب الأقرب" }).click();
  await expect(page.getByText("يمكنك المتابعة بدون موقع؛ لن يظهر ترتيب المسافة.")).toBeVisible();
  await expect(page.getByRole("button", { name: "عرض النتائج" })).toBeEnabled();
});

test("language switch persists an English product experience", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "تغيير اللغة إلى الإنجليزية" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.getByRole("button", { name: "View results" })).toBeVisible();
  await expect(page.getByText("Dental price intelligence · Qatar")).toBeVisible();
});

test("clinic workspace redirects unauthenticated visitors to the safe login return path", async ({ page }) => {
  await page.goto("/clinic");
  await expect(page).toHaveURL(/\/login\?next=%2Fclinic|\/login\?next=\/clinic/);
  await expect(page.getByRole("heading", { level: 1, name: "أرسل رابط الدخول إلى بريدك" })).toBeVisible();
});

test("account redirects unauthenticated visitors to login", async ({ page }) => {
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login\?next=%2Faccount|\/login\?next=\/account/);
  await expect(page.getByRole("heading", { level: 1, name: "أرسل رابط الدخول إلى بريدك" })).toBeVisible();
});

test("admin never exposes an admin surface to an unauthenticated visitor", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1, name: "علاج الأسنان المناسب، بسعر واضح وموعد حقيقي." })).toBeVisible();
  await expect(page.getByText("لوحة الإدارة")).toHaveCount(0);
});

test("passwordless login page clearly frames Magic Link authentication", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { level: 1, name: "أرسل رابط الدخول إلى بريدك" })).toBeVisible();
  await expect(page.getByRole("button", { name: "إرسال رابط الدخول" })).toBeVisible();
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
});

test("sensitive booking and support endpoints reject unauthenticated requests before any mutation", async ({ request }) => {
  const [bookingResponse, supportResponse] = await Promise.all([
    request.post("/api/book", { data: {} }),
    request.post("/api/support", { data: {} }),
  ]);

  expect(bookingResponse.status()).toBe(401);
  expect(supportResponse.status()).toBe(401);
});

test("operation failures render a safe public message without database internals", async ({ page }) => {
  await page.goto("/operation-error?area=clinic&action=createOffer&code=forbidden");
  await expect(page.getByRole("heading", { level: 1, name: "هذه العملية غير مسموحة" })).toBeVisible();
  await expect(page.getByText("42501")).toHaveCount(0);
  await expect(page.getByText(/stack trace/i)).toHaveCount(0);
});

test("health endpoint reports the public database catalogue", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  const payload = await response.json();
  expect(payload.ok).toBe(true);
  expect(payload.database).toBe(true);
  expect(payload.treatments).toBe(25);
});

test("public search API never leaks synthetic DEV offers", async ({ request }) => {
  const response = await request.get(`/api/search?variant=${rootCanalMolarVariant}&when=earliest&radius=10`);
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-store");
  const payload = await response.json();
  expect(payload.variant.name_en).toBe("Root Canal — Molar");
  expect(payload.offers).toEqual([]);
  expect(payload.count).toBe(0);
});

test("customer-choice ingestion is POST-only", async ({ request }) => {
  const response = await request.get("/api/choices");
  expect(response.status()).toBe(405);
});

test("PWA manifest remains available with the production brand", async ({ request }) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.status()).toBe(200);
  const manifest = await response.json();
  expect(manifest.name).toContain("أسناني قطر");
  expect(manifest.display).toBe("standalone");
});
