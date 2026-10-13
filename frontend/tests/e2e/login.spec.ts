import { test, expect } from "@playwright/test";

test("login page loads with accessible sign-in fields", async ({ page }) => {
  await page.goto("/login");

  await expect(
    page.getByRole("heading", { name: "Staff Portal" }),
  ).toBeVisible();

  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();

  await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
});

test("invalid login displays an authentication error", async ({ page }) => {
  await page.route("**/api/auth/login", async (route) => {
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({
        detail: "Invalid email or password.",
      }),
    });
  });

  await page.goto("/login");

  await page.getByLabel("Email").fill("invalid@example.com");
  await page.getByLabel("Password").fill("WrongPassword123!");
  await page.getByRole("button", { name: /sign in/i }).click();

  await expect(page.getByRole("alert")).toContainText(
    "Invalid email or password.",
  );

  await expect(page).toHaveURL(/\/login$/);
});
