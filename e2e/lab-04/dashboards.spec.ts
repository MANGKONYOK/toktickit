import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const DASHBOARDS_SCREENSHOT_DIR = path.resolve("./artifacts/lab-04/screenshots/dashboards");

function resetDatabase() {
  try {
    const cmd =
      process.platform === "win32"
        ? "npm.cmd --prefix server run prisma:seed"
        : "npm --prefix server run prisma:seed";
    execSync(cmd, { stdio: "ignore" });
  } catch (err) {
    console.error("Failed to seed database:", err);
  }
}

test.describe("Role Dashboards, Drill-Downs & Multi-Viewport Responsiveness (E2E-03, RESP-01..03 / AC-13..21)", () => {
  test.beforeAll(async () => {
    fs.mkdirSync(DASHBOARDS_SCREENSHOT_DIR, { recursive: true });
    resetDatabase();
  });

  test.afterAll(async () => {
    resetDatabase();
  });

  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("01. Requester Dashboard metrics & drill-down to filtered tickets (AC-13, AC-16)", async ({
    page,
  }, testInfo) => {
    await page.goto("/");

    // Login as Requester
    const signInBtn = page.locator('[data-testid="nav-signin-button"]');
    await expect(signInBtn).toBeVisible({ timeout: 15000 });
    await signInBtn.click();

    await page.locator('[data-testid="login-email-input"]').fill("alice.johnson@email.com");
    await page.locator('[data-testid="login-password-input"]').fill("Password@2026");
    await page.locator('[data-testid="login-submit-button"]').click();

    await expect(page.locator('[data-testid="role-badge"]')).toHaveText(/Requester/i, {
      timeout: 10000,
    });

    // Requester dashboard should be mounted
    const dashboard = page.locator('[data-testid="requester-dashboard"]');
    await expect(dashboard).toBeVisible({ timeout: 10000 });

    // Assert metric cards
    await expect(page.locator('[data-testid="metric-card-total-open"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-card-waiting"]')).toBeVisible();

    if (testInfo.project.name === "desktop") {
      await page.screenshot({
        path: path.join(DASHBOARDS_SCREENSHOT_DIR, "01-requester-dashboard-desktop.png"),
        fullPage: true,
      });
    }

    // Drill-down click on Total Open card (AC-16)
    await page.locator('[data-testid="metric-card-total-open"]').click();

    // Verify redirected to My Tickets view
    await expect(page.locator('[data-testid="my-tickets-heading"]')).toBeVisible({
      timeout: 5000,
    });
  });

  test("02. IT Staff Dashboard metrics & queue drill-down navigation (AC-14, AC-17, AC-18)", async ({
    page,
  }, testInfo) => {
    await page.goto("/");

    // Login as IT Staff
    const signInBtn = page.locator('[data-testid="nav-signin-button"]');
    await expect(signInBtn).toBeVisible({ timeout: 15000 });
    await signInBtn.click();

    await page.locator('[data-testid="login-email-input"]').fill("john.doe@email.com");
    await page.locator('[data-testid="login-password-input"]').fill("Password@2026");
    await page.locator('[data-testid="login-submit-button"]').click();

    await expect(page.locator('[data-testid="role-badge"]')).toHaveText(/IT Staff/i, {
      timeout: 10000,
    });

    // Navigate to Staff Dashboard
    await page.locator('[data-testid="nav-staff-dashboard"]').click();

    const staffDashboard = page.locator('[data-testid="staff-dashboard"]');
    await expect(staffDashboard).toBeVisible({ timeout: 10000 });

    // Assert operational cards
    await expect(page.locator('[data-testid="metric-card-unassigned"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-card-my-assigned"]')).toBeVisible();

    if (testInfo.project.name === "desktop") {
      await page.screenshot({
        path: path.join(DASHBOARDS_SCREENSHOT_DIR, "02-staff-dashboard-desktop.png"),
        fullPage: true,
      });
    }

    // Drill-down to Unassigned queue (AC-17)
    await page.locator('[data-testid="metric-card-unassigned"]').click();
    await expect(page.locator('[data-testid="staff-ticket-queue-heading"]')).toBeVisible({
      timeout: 5000,
    });
  });

  test("03. Multi-Viewport Zero Horizontal Overflow Verification (RESP-01..03, AC-19..20)", async ({
    page,
  }, testInfo) => {
    await page.goto("/");

    // Verify zero horizontal scrolling on landing/dashboard across all viewports
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalScroll).toBe(false);

    if (testInfo.project.name === "tablet") {
      await page.screenshot({
        path: path.join(DASHBOARDS_SCREENSHOT_DIR, "03-dashboards-tablet.png"),
        fullPage: true,
      });
    } else if (testInfo.project.name === "mobile") {
      await page.screenshot({
        path: path.join(DASHBOARDS_SCREENSHOT_DIR, "04-dashboards-mobile.png"),
        fullPage: true,
      });
    }
  });
});

