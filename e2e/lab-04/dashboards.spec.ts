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

async function openLoginModal(page: any) {
  const logoutBtn = page.locator('[data-testid="nav-logout-button"]');
  if (await logoutBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await logoutBtn.click();
    await page.waitForTimeout(500);
  }

  const selectorBtn = page.locator('[data-testid="selector-signin-btn"]');
  if (await selectorBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
    await selectorBtn.click();
  } else {
    const navBtn = page.locator('[data-testid="nav-signin-button"]');
    await expect(navBtn).toBeVisible({ timeout: 10000 });
    await navBtn.click({ force: true });
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
    await openLoginModal(page);

    await page.locator('[data-testid="login-email-input"]').fill("alice.johnson@email.com");
    await page.locator('[data-testid="login-password-input"]').fill("Password@2026");
    await page.locator('[data-testid="login-submit-button"]').click();

    await expect(page.locator('[data-testid="role-badge"]')).toHaveText(/Requester/i, {
      timeout: 10000,
    });

    // Navigate to Requester Dashboard
    await page.locator('[data-testid="nav-dashboard"]').click();

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
    await expect(page.locator('[data-testid="my-tickets-container"]')).toBeVisible({
      timeout: 5000,
    });
  });

  test("02. IT Staff Dashboard metrics & queue drill-down navigation (AC-14, AC-17, AC-18)", async ({
    page,
  }, testInfo) => {
    await page.goto("/");

    // Login as IT Staff
    await openLoginModal(page);

    await page.locator('[data-testid="login-email-input"]').fill("somchai.it@email.com");
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
    await expect(page.locator('[data-testid="staff-ticket-queue"]')).toBeVisible({
      timeout: 5000,
    });
  });

  test("03. Multi-Viewport Responsiveness & Grid Layout (RESP-01..03, AC-19..20)", async ({
    page,
  }, testInfo) => {
    await page.goto("/");

    // Login as Requester to mount the responsive dashboard
    await openLoginModal(page);

    await page.locator('[data-testid="login-email-input"]').fill("alice.johnson@email.com");
    await page.locator('[data-testid="login-password-input"]').fill("Password@2026");
    await page.locator('[data-testid="login-submit-button"]').click();

    await expect(page.locator('[data-testid="role-badge"]')).toHaveText(/Requester/i, {
      timeout: 10000,
    });

    // Navigate to Requester Dashboard
    await page.locator('[data-testid="nav-dashboard"]').click();

    const dashboard = page.locator('[data-testid="requester-dashboard"]');
    await expect(dashboard).toBeVisible({ timeout: 10000 });

    // Verify zero horizontal scrolling across all viewports
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalScroll).toBe(false);

    // Verify metric card grid layout per viewport (RESP-01..03)
    const card1 = page.locator('[data-testid="metric-card-total-open"]');
    const card2 = page.locator('[data-testid="metric-card-waiting"]');
    const card3 = page.locator('[data-testid="metric-card-recently-updated"]');
    const card4 = page.locator('[data-testid="metric-card-recently-resolved"]');

    await expect(card1).toBeVisible();
    await expect(card2).toBeVisible();
    await expect(card3).toBeVisible();
    await expect(card4).toBeVisible();

    const box1 = await card1.boundingBox();
    const box2 = await card2.boundingBox();
    const box3 = await card3.boundingBox();
    const box4 = await card4.boundingBox();

    expect(box1).toBeTruthy();
    expect(box2).toBeTruthy();
    expect(box3).toBeTruthy();
    expect(box4).toBeTruthy();

    if (testInfo.project.name === "desktop") {
      // RESP-01: 4 cards in single horizontal row
      expect(Math.abs(box1!.y - box2!.y)).toBeLessThan(5);
      expect(Math.abs(box1!.y - box3!.y)).toBeLessThan(5);
      expect(Math.abs(box1!.y - box4!.y)).toBeLessThan(5);
    } else if (testInfo.project.name === "tablet") {
      // RESP-02: 2x2 metric grid
      expect(Math.abs(box1!.y - box2!.y)).toBeLessThan(5);
      expect(box3!.y).toBeGreaterThan(box1!.y + 30);
      expect(Math.abs(box3!.y - box4!.y)).toBeLessThan(5);

      await page.screenshot({
        path: path.join(DASHBOARDS_SCREENSHOT_DIR, "03-dashboards-tablet.png"),
        fullPage: true,
      });
    } else if (testInfo.project.name === "mobile") {
      // RESP-03: 1-column stacked cards
      expect(box2!.y).toBeGreaterThan(box1!.y + 30);
      expect(box3!.y).toBeGreaterThan(box2!.y + 30);
      expect(box4!.y).toBeGreaterThan(box3!.y + 30);

      await page.screenshot({
        path: path.join(DASHBOARDS_SCREENSHOT_DIR, "04-dashboards-mobile.png"),
        fullPage: true,
      });
    }
  });
});

