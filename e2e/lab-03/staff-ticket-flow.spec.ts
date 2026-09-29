import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const QUEUE_SCREENSHOT_DIR = path.resolve("./artifacts/lab-03/screenshots/staff-queue");
const DETAIL_SCREENSHOT_DIR = path.resolve("./artifacts/lab-03/screenshots/staff-ticket-detail");

function seedDatabase() {
  try {
    const cmd = process.platform === "win32" ? "npm.cmd --prefix server run prisma:seed" : "npm --prefix server run prisma:seed";
    execSync(cmd, { stdio: "ignore" });
  } catch (err) {
    console.error("Failed to seed database:", err);
  }
}

test.describe("IT Staff Ticket Lifecycle & Cross-Role Operations (E2E-02 / AC-08..19)", () => {
  test.beforeAll(async () => {
    fs.mkdirSync(QUEUE_SCREENSHOT_DIR, { recursive: true });
    fs.mkdirSync(DETAIL_SCREENSHOT_DIR, { recursive: true });
    seedDatabase();
  });

  test.afterAll(async () => {
    seedDatabase();
  });

  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("01. Requester Creates Ticket, Staff Operations, Internal Notes & Public Comments, Resolution Indication", async ({
    page,
  }, testInfo) => {
    // -------------------------------------------------------------------------
    // Step 1: Requester Logs In & Creates Ticket (AC-08)
    // -------------------------------------------------------------------------
    await page.goto("/");

    const signInBtn = page.locator('[data-testid="nav-signin-button"]');
    await expect(signInBtn).toBeVisible({ timeout: 15000 });
    await signInBtn.click();

    await page.locator('[data-testid="login-email-input"]').fill("alice.johnson@email.com");
    await page.locator('[data-testid="login-password-input"]').fill("Password@2026");
    await page.locator('[data-testid="login-submit-button"]').click();

    await expect(page.locator('[data-testid="authenticated-user-section"]')).toBeVisible({
      timeout: 10000,
    });

    // Navigate to Create Ticket tab
    await page.locator('[data-testid="nav-create-ticket"]').click();
    await expect(page.locator("#ticket-category")).toBeVisible();

    // Fill Create Ticket form
    await page.locator("#ticket-category").selectOption({ label: "Software" });
    await page.locator("#ticket-related-system").selectOption({ label: "LEB2 App" });
    await page.locator("#ticket-priority").selectOption("MEDIUM");
    const testSummary = `E2E LEB2 issue on ${Date.now()}`;
    await page.locator("#ticket-summary").fill(testSummary);
    await page
      .locator("#ticket-description")
      .fill("Students cannot submit PDF assignments via LEB2 platform due to timeout errors.");

    // Submit ticket
    await page.locator('button[type="submit"]:has-text("Submit Ticket")').click();

    // Verify confirmation and capture created ticket number
    const createdNumberEl = page.locator('[data-testid="created-ticket-number"]');
    await expect(createdNumberEl).toBeVisible({ timeout: 10000 });
    const createdTicketNumber = (await createdNumberEl.textContent())?.trim() || "";
    expect(createdTicketNumber).toMatch(/^TKT-2026-\d{6}$/);

    // -------------------------------------------------------------------------
    // Step 2: Logout Requester -> Login as IT Staff (AC-07, AC-12..14)
    // -------------------------------------------------------------------------
    await page.locator('[data-testid="nav-logout-button"]').click();
    await expect(page.locator('[data-testid="nav-signin-button"]')).toBeVisible({ timeout: 10000 });

    await page.locator('[data-testid="nav-signin-button"]').click();
    await page.locator('[data-testid="login-email-input"]').fill("piti.srisongkram@email.com");
    await page.locator('[data-testid="login-password-input"]').fill("Password@2026");
    await page.locator('[data-testid="login-submit-button"]').click();

    await expect(page.locator('[data-testid="authenticated-user-section"]')).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator('[data-testid="role-badge"]')).toHaveText("IT Staff");

    // Navigate to Staff Ticket Queue
    const staffQueueTab = page.locator('[data-testid="nav-staff-queue"]');
    await expect(staffQueueTab).toBeVisible();
    await staffQueueTab.click();

    const queueTable = page.locator('[data-testid="staff-ticket-queue"]');
    await expect(queueTable).toBeVisible({ timeout: 10000 });

    // Capture screenshots for Queue
    if (testInfo.project.name === "desktop") {
      // Screenshot 01: Shared operational queue on Desktop
      await page.screenshot({
        path: path.join(QUEUE_SCREENSHOT_DIR, "01-queue-desktop.png"),
        fullPage: true,
      });

      // Filter by search keyword
      const searchInput = page.locator('[data-testid="staff-queue-search"]');
      await searchInput.fill(createdTicketNumber);
      await page.waitForTimeout(500); // debounce

      // Screenshot 02: Filtered queue on Desktop
      await page.screenshot({
        path: path.join(QUEUE_SCREENSHOT_DIR, "02-queue-filtered.png"),
        fullPage: true,
      });
      await searchInput.fill(""); // clear search
    } else if (testInfo.project.name === "mobile") {
      // Screenshot 03: Responsive mobile cards on Mobile
      await page.screenshot({
        path: path.join(QUEUE_SCREENSHOT_DIR, "03-queue-mobile-cards.png"),
        fullPage: true,
      });
    }

    // Locate and click on the newly created ticket row
    const ticketRow = testInfo.project.name === "mobile"
      ? page.locator(`[data-testid^="staff-ticket-card-"]:has-text("${createdTicketNumber}")`).first()
      : page.locator(`tr:has-text("${createdTicketNumber}")`).first();
    await expect(ticketRow).toBeVisible({ timeout: 10000 });
    await ticketRow.click();

    // -------------------------------------------------------------------------
    // Step 3: Staff Ticket Detail Operations (AC-15..19)
    // -------------------------------------------------------------------------
    const detailView = page.locator('[data-testid="staff-ticket-detail"]');
    await expect(detailView).toBeVisible({ timeout: 10000 });

    if (testInfo.project.name === "desktop") {
      // Screenshot 01: Operational Ticket Detail on Desktop
      await page.screenshot({
        path: path.join(DETAIL_SCREENSHOT_DIR, "01-detail-operational.png"),
        fullPage: true,
      });
    } else if (testInfo.project.name === "mobile") {
      // Screenshot 04: Mobile responsive detail view
      await page.screenshot({
        path: path.join(DETAIL_SCREENSHOT_DIR, "04-detail-mobile.png"),
        fullPage: true,
      });
    }

    // 1. Claim Ownership (AC-16)
    const claimBtn = page.locator('[data-testid="claim-ownership-btn"]');
    if (await claimBtn.isVisible()) {
      await claimBtn.click();
      await expect(page.locator('[data-testid="current-assignee-badge"]')).toContainText("Piti Srisongkram");
    }

    // 2. Override IT Priority (AC-17)
    const prioritySelect = page.locator('[data-testid="it-priority-select"]');
    await expect(prioritySelect).toBeVisible();
    await prioritySelect.selectOption("URGENT");
    await page.waitForTimeout(500);

    // 3. Post a Private Internal Note (AC-19, BR-15)
    const internalNoteInput = page.locator('[data-testid="internal-note-input"]');
    await expect(internalNoteInput).toBeVisible();
    const internalNoteText = "Internal Note: Database replica lag detected on LEB2 cluster. Investigating shard 4.";
    await internalNoteInput.fill(internalNoteText);
    await page.locator('[data-testid="submit-internal-note-btn"]').click();

    // Verify note is rendered in amber panel
    const internalPanel = page.locator('[data-testid="internal-notes-panel"]');
    await expect(internalPanel).toBeVisible();
    await expect(internalPanel).toContainText(internalNoteText);

    if (testInfo.project.name === "desktop") {
      // Screenshot 02: Amber private internal notes panel
      await page.screenshot({
        path: path.join(DETAIL_SCREENSHOT_DIR, "02-internal-note-amber.png"),
        fullPage: true,
      });
    }

    // 4. Post a Public Comment (AC-10, BR-08)
    const publicCommentInput = page.locator('[data-testid="public-comment-input"]');
    await expect(publicCommentInput).toBeVisible();
    const publicCommentText = "We have escalated this issue to the infrastructure team.";
    await publicCommentInput.fill(publicCommentText);
    await page.locator('[data-testid="submit-public-comment-btn"]').click();

    const publicPanel = page.locator('[data-testid="public-comments-panel"]');
    await expect(publicPanel).toContainText(publicCommentText);

    if (testInfo.project.name === "desktop") {
      // Screenshot 03: Public comments stream
      await page.screenshot({
        path: path.join(DETAIL_SCREENSHOT_DIR, "03-public-comment-stream.png"),
        fullPage: true,
      });
    }

    // -------------------------------------------------------------------------
    // Step 4: Requester Verification & Problem Resolved Indication (AC-10, AC-11, AC-19)
    // -------------------------------------------------------------------------
    await page.locator('[data-testid="nav-logout-button"]').click();
    await expect(page.locator('[data-testid="nav-signin-button"]')).toBeVisible({ timeout: 10000 });

    // Login as Requester Alice again
    await page.locator('[data-testid="nav-signin-button"]').click();
    await page.locator('[data-testid="login-email-input"]').fill("alice.johnson@email.com");
    await page.locator('[data-testid="login-password-input"]').fill("Password@2026");
    await page.locator('[data-testid="login-submit-button"]').click();

    await expect(page.locator('[data-testid="authenticated-user-section"]')).toBeVisible({
      timeout: 10000,
    });

    // Open ticket in Requester view (My Tickets)
    await page.locator('[data-testid="nav-my-tickets"]').click();
    const myTicketRow = testInfo.project.name === "mobile"
      ? page.locator(`[data-testid="ticket-card-${createdTicketNumber}"]`)
      : page.locator(`tr:has-text("${createdTicketNumber}")`).first();
    await expect(myTicketRow).toBeVisible({ timeout: 10000 });
    const viewBtn = myTicketRow.locator('button:has-text("View")');
    if (await viewBtn.count() > 0 && await viewBtn.first().isVisible()) {
      await viewBtn.first().click();
    } else {
      await myTicketRow.click();
    }

    // Verify Public Comment is visible to Requester
    await expect(page.locator('[data-testid="comments-section"]')).toContainText(publicCommentText);

    // CRITICAL SECURITY ASSERTION (AC-19 / BR-15):
    // Internal Notes panel and internal note text must be COMPLETELY ABSENT for the Requester!
    await expect(page.locator('[data-testid="internal-notes-panel"]')).not.toBeVisible();
    await expect(page.locator(`text="${internalNoteText}"`)).not.toBeVisible();

    // Requester indicates problem resolved (AC-11, BR-09)
    const resolveBtn = page.locator('[data-testid="indicate-resolved-btn"]');
    if (await resolveBtn.isVisible()) {
      await resolveBtn.click();
      await expect(page.locator('[data-testid="problem-resolved-badge"]')).toBeVisible({
        timeout: 10000,
      });
    }

    // -------------------------------------------------------------------------
    // Step 5: Governed Status Transitions by Staff (AC-18, BR-14)
    // -------------------------------------------------------------------------
    await page.locator('[data-testid="nav-logout-button"]').click();
    await page.locator('[data-testid="nav-signin-button"]').click();
    await page.locator('[data-testid="login-email-input"]').fill("piti.srisongkram@email.com");
    await page.locator('[data-testid="login-password-input"]').fill("Password@2026");
    await page.locator('[data-testid="login-submit-button"]').click();

    await page.locator('[data-testid="nav-staff-queue"]').click();
    const staffRow = testInfo.project.name === "mobile"
      ? page.locator(`[data-testid^="staff-ticket-card-"]:has-text("${createdTicketNumber}")`).first()
      : page.locator(`tr:has-text("${createdTicketNumber}")`).first();
    await expect(staffRow).toBeVisible({ timeout: 10000 });
    await staffRow.click();

    const statusSelect = page.locator('[data-testid="status-transition-select"]');
    const applyStatusBtn = page.locator('[data-testid="apply-status-btn"]');

    // 1. NEW -> OPEN
    await expect(statusSelect).toBeVisible();
    await statusSelect.selectOption("OPEN");
    await applyStatusBtn.click();
    await page.waitForTimeout(500);

    // 2. OPEN -> IN_PROGRESS
    await statusSelect.selectOption("IN_PROGRESS");
    await applyStatusBtn.click();
    await page.waitForTimeout(500);

    // 3. IN_PROGRESS -> RESOLVED
    await statusSelect.selectOption("RESOLVED");
    await applyStatusBtn.click();
    await page.waitForTimeout(500);

    // 4. RESOLVED -> CLOSED
    await statusSelect.selectOption("CLOSED");
    await applyStatusBtn.click();
    await page.waitForTimeout(500);

    // After reaching CLOSED (terminal state), no transitions remain
    await expect(statusSelect).not.toBeVisible();
  });
});
