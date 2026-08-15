import { expect, test } from "@playwright/test";

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

test("clinic workspace redirects unauthenticated visitors to the safe login return path", async ({ page }) => {
  await page.goto("/clinic");
  await expect(page).toHaveURL(/\/login\?next=%2Fclinic|\/login\?next=\/clinic/);
  await expect(page.getByRole("heading", { level: 1, name: "أرسل رابط الدخول إلى بريدك" })).toBeVisible();
});


test("sensitive booking and support endpoints reject unauthenticated requests before any mutation", async ({ request }) => {
  const [bookingResponse, supportResponse] = await Promise.all([
    request.post("/api/book", { data: {} }),
    request.post("/api/support", { data: {} }),
  ]);

  expect(bookingResponse.status()).toBe(401);
  expect(supportResponse.status()).toBe(401);
});
