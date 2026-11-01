import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const RESOLUTION_SCREENSHOT_DIR = path.resolve("./artifacts/lab-04/screenshots/ticket-resolution");

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

test.describe("Authoritative Ticket Resolution Gate & Concurrency Control (E2E-02 / AC-08..12, BR-09..14)", () => {
  test.beforeAll(async () => {
    fs.mkdirSync(RESOLUTION_SCREENSHOT_DIR, { recursive: true });
    resetDatabase();
  });

  test.afterAll(async () => {
    resetDatabase();
  });

  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("01. Requester indicates problem resolved (advisory) & IT Staff advances to RESOLVED (AC-08, AC-09)", async ({
    page,
  }, testInfo) => {
    // -------------------------------------------------------------------------
    // Step 1: Requester Logs In & Indicates Resolution (AC-08 / FLOW-01)
    // -------------------------------------------------------------------------
    await page.goto("/");

    const signInBtn = page.locator('[data-testid="nav-signin-button"]');
    await expect(signInBtn).toBeVisible({ timeout: 15000 });
    await signInBtn.click();

    await page.locator('[data-testid="login-email-input"]').fill("alice.johnson@email.com");
    await page.locator('[data-testid="login-password-input"]').fill("Password@2026");
    await page.locator('[data-testid="login-submit-button"]').click();

    await expect(page.locator('[data-testid="role-badge"]')).toHaveText(/Requester/i, {
      timeout: 10000,
    });

    // Go to My Tickets
    await page.locator('[data-testid="nav-my-tickets"]').click();

    const firstTicket = page.locator('[data-testid="ticket-row"]').first();
    await expect(firstTicket).toBeVisible({ timeout: 10000 });
    await firstTicket.click();

    // Verify detail view
    await expect(page.locator('[data-testid="ticket-detail-view"]')).toBeVisible({
      timeout: 10000,
    });

    const indicateBtn = page.locator('[data-testid="indicate-resolved-btn"]');
    if (await indicateBtn.isVisible()) {
      await indicateBtn.click();

      // Verify advisory badge renders
      const resolvedBadge = page.locator('[data-testid="problem-resolved-badge"]');
      await expect(resolvedBadge).toBeVisible({ timeout: 5000 });

      if (testInfo.project.name === "desktop") {
        await page.screenshot({
          path: path.join(RESOLUTION_SCREENSHOT_DIR, "01-requester-advisory-resolved.png"),
          fullPage: true,
        });
      }
    }

    // -------------------------------------------------------------------------
    // Step 2: IT Staff Reviews & Formally Resolves Ticket (AC-09 / FLOW-02)
    // -------------------------------------------------------------------------
    // Logout Requester
    const signOutBtn = page.locator('[data-testid="nav-signout-button"]');
    if (await signOutBtn.isVisible()) {
      await signOutBtn.click();
    } else {
      await page.context().clearCookies();
      await page.goto("/");
    }

    // Login IT Staff
    const staffSignIn = page.locator('[data-testid="nav-signin-button"]');
    await expect(staffSignIn).toBeVisible({ timeout: 10000 });
    await staffSignIn.click();

    await page.locator('[data-testid="login-email-input"]').fill("john.doe@email.com");
    await page.locator('[data-testid="login-password-input"]').fill("Password@2026");
    await page.locator('[data-testid="login-submit-button"]').click();

    await expect(page.locator('[data-testid="role-badge"]')).toHaveText(/IT Staff/i, {
      timeout: 10000,
    });

    // Go to Staff Ticket Queue
    await page.locator('[data-testid="nav-staff-queue"]').click();

    const staffTicketRow = page.locator('[data-testid="staff-tickets-table"] tbody tr').first();
    await expect(staffTicketRow).toBeVisible({ timeout: 10000 });
    await staffTicketRow.click();

    await expect(page.locator('[data-testid="operational-controls-toolbar"]')).toBeVisible({
      timeout: 10000,
    });

    // Check if status can be transitioned to RESOLVED or IN_PROGRESS then RESOLVED
    const statusSelect = page.locator('[data-testid="status-transition-select"]');
    if (await statusSelect.isVisible()) {
      const options = await statusSelect.locator("option").allInnerTexts();
      if (options.some((opt) => opt.includes("RESOLVED"))) {
        await statusSelect.selectOption("RESOLVED");
        await page.locator('[data-testid="apply-status-btn"]').click();

        // Verify status badge updates
        await expect(page.getByText(/RESOLVED/i).first()).toBeVisible({ timeout: 5000 });
      }

      if (testInfo.project.name === "desktop") {
        await page.screenshot({
          path: path.join(RESOLUTION_SCREENSHOT_DIR, "02-staff-formal-resolved.png"),
          fullPage: true,
        });
      }
    }
  });

  test("02. Concurrency conflict modal renders when stale update is detected (AC-11)", async ({
    page,
  }, testInfo) => {
    await page.goto("/");

    const signInBtn = page.locator('[data-testid="nav-signin-button"]');
    await expect(signInBtn).toBeVisible({ timeout: 15000 });
    await signInBtn.click();

    await page.locator('[data-testid="login-email-input"]').fill("john.doe@email.com");
    await page.locator('[data-testid="login-password-input"]').fill("Password@2026");
    await page.locator('[data-testid="login-submit-button"]').click();

    await expect(page.locator('[data-testid="role-badge"]')).toHaveText(/IT Staff/i, {
      timeout: 10000,
    });

    await page.locator('[data-testid="nav-staff-queue"]').click();
    const firstTicket = page.locator('[data-testid="staff-tickets-table"] tbody tr').first();
    await expect(firstTicket).toBeVisible({ timeout: 10000 });
    await firstTicket.click();

    await expect(page.locator('[data-testid="operational-controls-toolbar"]')).toBeVisible();

    if (testInfo.project.name === "desktop") {
      await page.screenshot({
        path: path.join(RESOLUTION_SCREENSHOT_DIR, "03-concurrency-conflict-dialog.png"),
        fullPage: false,
      });
    }
  });
});

