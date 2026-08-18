import { expect, test } from "@playwright/test";

const rootCanalMolarVariant = "d172470d-b8ec-43af-b668-e39ebf108956";

test("home loads the Arabic comparison search and reaches a valid empty-result state", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1, name: "اختر علاجك بثقة ووضوح، من أول مقارنة إلى الموعد." })).toBeVisible();
  await expect(page.getByRole("button", { name: "قارن الخيارات الآن" })).toBeVisible();
  await expect(page.getByRole("button", { name: "استخدم موقعي لترتيب الأقرب" })).toBeVisible();

  await page.getByRole("button", { name: "قارن الخيارات الآن" }).click();
  await expect(page).toHaveURL(/\/results\?/);
  await expect(page.getByRole("heading", { level: 1, name: "تبييض داخل العيادة" })).toBeVisible();
  await expect(page.getByText("لا توجد خيارات مطابقة الآن")).toBeVisible();
});

test("treatment selection refreshes exact variants instead of keeping a stale variant", async ({ page }) => {
  await page.goto("/");
  const form = page.getByRole("form", { name: "ابدأ مقارنة علاج الأسنان" });
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
  const form = page.getByRole("form", { name: "ابدأ مقارنة علاج الأسنان" });
  await form.locator('select[name="treatment"]').selectOption({ label: "علاج عصب" });
  await form.locator('select[name="variant"]').selectOption(rootCanalMolarVariant);
  await form.locator('select[name="when"]').selectOption("tomorrow");
  await page.getByRole("button", { name: "قارن الخيارات الآن" }).click();

  await expect(page).toHaveURL(new RegExp(`variant=${rootCanalMolarVariant}`));
  await expect(page).toHaveURL(/when=tomorrow/);
  await expect(page.getByRole("heading", { level: 1, name: "علاج عصب — ضرس" })).toBeVisible();
});

test("location unavailable degrades safely and keeps search usable", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, "geolocation", {
      configurable: true,
      get: () => undefined,
    });
  });
  await page.goto("/");

  const hasGeolocation = await page.evaluate(() => Boolean(navigator.geolocation));
  expect(hasGeolocation).toBe(false);

  await page.getByRole("button", { name: "استخدم موقعي لترتيب الأقرب" }).click();
  await expect(page.getByText("يمكنك المتابعة بدون الموقع؛ لن يظهر ترتيب المسافة.")).toBeVisible();
  await expect(page.getByRole("button", { name: "قارن الخيارات الآن" })).toBeEnabled();
});

test("language switch persists an English product experience", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "تغيير اللغة إلى الإنجليزية" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.getByRole("button", { name: "Compare options now" })).toBeVisible();
  await expect(page.getByText("Smarter dental decisions · Qatar")).toBeVisible();
});

test("language switch also localizes the empty results experience", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "قارن الخيارات الآن" }).click();
  await expect(page.getByText("لا توجد خيارات مطابقة الآن")).toBeVisible();

  await page.getByRole("button", { name: "تغيير اللغة إلى الإنجليزية" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1, name: "In-Office Whitening" })).toBeVisible();
  await expect(page.getByText("No matching options are available right now")).toBeVisible();
  await expect(page.getByText("لا توجد خيارات مطابقة الآن")).toHaveCount(0);
  await expect(page.getByText("تحديثات مباشرة")).toHaveCount(0);
  await expect(page.getByText("جارٍ الاتصال…")).toHaveCount(0);
});

test("clinic workspace redirects unauthenticated visitors to the safe login return path", async ({ page }) => {
  await page.goto("/clinic");
  await expect(page).toHaveURL(/\/login\?next=%2Fclinic|\/login\?next=\/clinic/);
  await expect(page.getByRole("heading", { level: 1, name: "سجّل الدخول إلى حسابك" })).toBeVisible();
});

test("account redirects unauthenticated visitors to login", async ({ page }) => {
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login\?next=%2Faccount|\/login\?next=\/account/);
  await expect(page.getByRole("heading", { level: 1, name: "سجّل الدخول إلى حسابك" })).toBeVisible();
});

test("admin never exposes an admin surface to an unauthenticated visitor", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1, name: "اختر علاجك بثقة ووضوح، من أول مقارنة إلى الموعد." })).toBeVisible();
  await expect(page.getByText("لوحة الإدارة")).toHaveCount(0);
});

test("password login page clearly requires a username and password", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { level: 1, name: "سجّل الدخول إلى حسابك" })).toBeVisible();
  await expect(page.getByRole("button", { name: "تسجيل الدخول" })).toBeVisible();
  await expect(page.locator('input[name="username"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toHaveCount(1);
});

test("language selection localizes the password login experience", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "تغيير اللغة إلى الإنجليزية" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.goto("/login");

  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1, name: "Sign in to your account" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  await expect(page.locator('input[name="username"]')).toBeVisible();
  await expect(page.getByText("سجّل الدخول إلى حسابك")).toHaveCount(0);
});

test("sensitive booking and support endpoints reject unauthenticated requests before any mutation", async ({ request }) => {
  const [bookingResponse, supportResponse, registrationResponse] = await Promise.all([
    request.post("/api/book", { data: {} }),
    request.post("/api/support", { data: {} }),
    request.post("/api/patient-booking-registration", { data: {} }),
  ]);

  expect(bookingResponse.status()).toBe(401);
  expect(supportResponse.status()).toBe(401);
  expect(registrationResponse.status()).toBe(400);
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
  expect(payload.treatments).toBe(48);
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

test("security headers include a first-party CSP without opening frames or objects", async ({ request }) => {
  const response = await request.get("/");
  expect(response.status()).toBe(200);
  const headers = response.headers();
  const csp = headers["content-security-policy"] ?? "";
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("connect-src 'self' https://bqvcukxfsnchvkgejolz.supabase.co wss://bqvcukxfsnchvkgejolz.supabase.co");
  expect(csp).toContain("object-src 'none'");
  expect(csp).toContain("frame-ancestors 'none'");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
});

test("production service worker never converts an offline API failure into cached HTML", async ({ page, context }) => {
  await page.goto("/");
  const serviceWorkerReady = await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) return false;
    await navigator.serviceWorker.ready;
    return true;
  });
  expect(serviceWorkerReady).toBe(true);
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);

  await context.setOffline(true);
  const offlineApiResult = await page.evaluate(async () => {
    try {
      const response = await fetch("/api/health");
      return { resolved: true, status: response.status, contentType: response.headers.get("content-type") };
    } catch {
      return { resolved: false, status: 0, contentType: null };
    }
  });
  await context.setOffline(false);

  expect(offlineApiResult.resolved).toBe(false);
  expect(offlineApiResult.status).toBe(0);
  expect(offlineApiResult.contentType).toBeNull();
});

test("production service worker provides only a static public document fallback offline", async ({ page, context }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) throw new Error("service worker unsupported");
    await navigator.serviceWorker.ready;
  });
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);

  await context.setOffline(true);
  await page.goto("/offline-public-shell-check");
  await expect(page.getByRole("heading", { level: 1, name: "لا يوجد اتصال بالإنترنت" })).toBeVisible();
  await expect(page.getByText("هذه صفحة ثابتة عامة فقط، ولا تحتوي على بيانات حساب أو حجز أو معلومات تشغيلية.")).toBeVisible();
  await expect(page.getByText("لوحة الإدارة")).toHaveCount(0);
  await context.setOffline(false);
});
