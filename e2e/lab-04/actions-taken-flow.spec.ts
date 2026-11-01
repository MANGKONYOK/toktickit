import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const ACTIONS_SCREENSHOT_DIR = path.resolve("./artifacts/lab-04/screenshots/actions-taken");

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

test.describe("IT Staff Actions Taken & Requester Read-Only Seam (E2E-01 / AC-01..02, BR-01..08)", () => {
  test.beforeAll(async () => {
    fs.mkdirSync(ACTIONS_SCREENSHOT_DIR, { recursive: true });
    resetDatabase();
  });

  test.afterAll(async () => {
    resetDatabase();
  });

  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("01. IT Staff records Action Taken with follow-up requirement & Requester read-only audit (AC-01, AC-02)", async ({
    page,
  }, testInfo) => {
    // -------------------------------------------------------------------------
    // Step 1: IT Staff Logs In
    // -------------------------------------------------------------------------
    await page.goto("/");

    const signInBtn = page.locator('[data-testid="nav-signin-button"]');
    await expect(signInBtn).toBeVisible({ timeout: 15000 });
    await signInBtn.click();

    await page.locator('[data-testid="login-email-input"]').fill("john.doe@email.com");
    await page.locator('[data-testid="login-password-input"]').fill("Password@2026");
    await page.locator('[data-testid="login-submit-button"]').click();

    // Verify Staff authenticated header
    await expect(page.locator('[data-testid="role-badge"]')).toHaveText(/IT Staff/i, {
      timeout: 10000,
    });

    // Navigate to Staff Ticket Queue
    await page.locator('[data-testid="nav-staff-queue"]').click();

    // Select the first ticket in the queue
    const firstTicket = page.locator('[data-testid="staff-tickets-table"] tbody tr').first();
    await expect(firstTicket).toBeVisible({ timeout: 10000 });
    await firstTicket.click();

    // Wait for Staff Ticket Detail view
    await expect(page.locator('[data-testid="operational-controls-toolbar"]')).toBeVisible({
      timeout: 10000,
    });

    // -------------------------------------------------------------------------
    // Step 2: Open Record Action Modal & Submit Action Taken (AC-01)
    // -------------------------------------------------------------------------
    const recordActionBtn = page.locator('[data-testid="record-action-button"]');
    await expect(recordActionBtn).toBeVisible();

    await recordActionBtn.click();

    const actionModal = page.locator('[role="dialog"]');
    await expect(actionModal).toBeVisible();

    if (testInfo.project.name === "desktop") {
      await page.screenshot({
        path: path.join(ACTIONS_SCREENSHOT_DIR, "02-record-action-modal.png"),
        fullPage: false,
      });
    }

    // Fill Action details
    await page
      .locator('[data-testid="action-description-input"]')
      .fill("Replaced faulty CAT6 patch cable and performed loopback continuity test");
    await page
      .locator('[data-testid="action-result-input"]')
      .fill("Zero packet drops observed across 1,000 ICMP ping frames");

    // Toggle follow-up required checkbox
    const followUpCheckbox = page.locator('[data-testid="followup-required-checkbox"]');
    await followUpCheckbox.check();

    // Mandatory follow-up note input must appear dynamically
    const followUpNoteInput = page.locator('[data-testid="followup-note-input"]');
    await expect(followUpNoteInput).toBeVisible();
    await followUpNoteInput.fill("Verify link performance with network operations team tomorrow");

    // Submit Action Taken
    await page.locator('[data-testid="submit-action-button"]').click();

    // Modal should close and action card should appear in timeline
    await expect(actionModal).not.toBeVisible({ timeout: 5000 });

    const newActionDesc = page.getByText(
      "Replaced faulty CAT6 patch cable and performed loopback continuity test"
    );
    await expect(newActionDesc).toBeVisible({ timeout: 10000 });

    if (testInfo.project.name === "desktop") {
      await page.screenshot({
        path: path.join(ACTIONS_SCREENSHOT_DIR, "01-staff-actions-timeline.png"),
        fullPage: true,
      });
    }

    // -------------------------------------------------------------------------
    // Step 3: Requester Read-Only Seam Verification (AC-02)
    // -------------------------------------------------------------------------
    // Sign out from Staff
    const signOutBtn = page.locator('[data-testid="nav-signout-button"]');
    if (await signOutBtn.isVisible()) {
      await signOutBtn.click();
    } else {
      await page.context().clearCookies();
      await page.goto("/");
    }

    // Sign in as Requester
    const requesterSignIn = page.locator('[data-testid="nav-signin-button"]');
    await expect(requesterSignIn).toBeVisible({ timeout: 10000 });
    await requesterSignIn.click();

    await page.locator('[data-testid="login-email-input"]').fill("alice.johnson@email.com");
    await page.locator('[data-testid="login-password-input"]').fill("Password@2026");
    await page.locator('[data-testid="login-submit-button"]').click();

    // Verify Requester role
    await expect(page.locator('[data-testid="role-badge"]')).toHaveText(/Requester/i, {
      timeout: 10000,
    });

    // Navigate to My Tickets tab
    await page.locator('[data-testid="nav-my-tickets"]').click();

    // Open first ticket detail
    const requesterFirstTicket = page.locator('[data-testid="ticket-row"]').first();
    if (await requesterFirstTicket.isVisible()) {
      await requesterFirstTicket.click();

      // Verify Ticket Detail view is rendered
      await expect(page.locator('[data-testid="ticket-detail-view"]')).toBeVisible({
        timeout: 10000,
      });

      // Actions section should be present, but '+ Record Action' button must NOT exist
      await expect(page.locator('[data-testid="record-action-button"]')).not.toBeVisible();

      if (testInfo.project.name === "desktop") {
        await page.screenshot({
          path: path.join(ACTIONS_SCREENSHOT_DIR, "03-requester-readonly-actions.png"),
          fullPage: true,
        });
      }
    }
  });
});

