import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const ADMIN_SCREENSHOT_DIR = path.resolve("./artifacts/lab-03/screenshots/user-management");

function seedDatabase() {
  try {
    const cmd = process.platform === "win32" ? "npm.cmd --prefix server run prisma:seed" : "npm --prefix server run prisma:seed";
    execSync(cmd, { stdio: "ignore" });
  } catch (err) {
    console.error("Failed to seed database:", err);
  }
}

test.describe("Administrator User Governance & Safety Guardrails (E2E-03 / AC-20..22)", () => {
  test.beforeAll(async () => {
    fs.mkdirSync(ADMIN_SCREENSHOT_DIR, { recursive: true });
    seedDatabase();
  });

  test.afterAll(async () => {
    seedDatabase();
  });

  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("01. Admin User Listing, User Creation, Safety Guardrail & Password Reset Flow", async ({
    page,
  }, testInfo) => {
    // -------------------------------------------------------------------------
    // Step 1: Admin Logs In & Navigates to User Administration
    // -------------------------------------------------------------------------
    await page.goto("/");

    const signInBtn = page.locator('[data-testid="nav-signin-button"]');
    await expect(signInBtn).toBeVisible({ timeout: 15000 });
    await signInBtn.click();

    await page.locator('[data-testid="login-email-input"]').fill("admin.toktickit@email.com");
    await page.locator('[data-testid="login-password-input"]').fill("Password@2026");
    await page.locator('[data-testid="login-submit-button"]').click();

    await expect(page.locator('[data-testid="authenticated-user-section"]')).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator('[data-testid="role-badge"]')).toHaveText("Admin");

    // Navigate to User Management
    const adminNavTab = page.locator('[data-testid="nav-admin-users"]');
    await expect(adminNavTab).toBeVisible();
    await adminNavTab.click();

    const adminTable = page.locator('[data-testid="admin-users-table"]');
    const mobileCards = page.locator('[data-testid="admin-users-mobile-cards"]');

    if (testInfo.project.name === "desktop") {
      await expect(adminTable).toBeVisible({ timeout: 10000 });
      // Screenshot 01: Admin user management table on Desktop
      await page.screenshot({
        path: path.join(ADMIN_SCREENSHOT_DIR, "01-admin-user-table.png"),
        fullPage: true,
      });
    } else if (testInfo.project.name === "mobile") {
      await expect(mobileCards).toBeVisible({ timeout: 10000 });
      // Screenshot 04: Admin responsive mobile cards
      await page.screenshot({
        path: path.join(ADMIN_SCREENSHOT_DIR, "04-admin-mobile-cards.png"),
        fullPage: true,
      });
    }

    // -------------------------------------------------------------------------
    // Step 2: Create User with Initial Password (AC-20, BR-16, BR-17)
    // -------------------------------------------------------------------------
    const openCreateBtn = page.locator('[data-testid="btn-open-create-user"]');
    await expect(openCreateBtn).toBeVisible();
    await openCreateBtn.click();

    const modalTitle = page.locator('h5:has-text("Create User Account")');
    await expect(modalTitle).toBeVisible();

    if (testInfo.project.name === "desktop") {
      // Screenshot 02: Create user modal
      await page.screenshot({
        path: path.join(ADMIN_SCREENSHOT_DIR, "02-create-user-modal.png"),
        fullPage: true,
      });
    }

    const uniqueTimestamp = Date.now();
    const newUserName = `E2E User ${uniqueTimestamp}`;
    const newUserEmail = `e2e.user.${uniqueTimestamp}@email.com`;
    const initialPassword = "InitialPass@2026";

    await page.locator('[data-testid="create-user-fullname"]').fill(newUserName);
    await page.locator('[data-testid="create-user-email"]').fill(newUserEmail);
    await page.locator('[data-testid="create-user-role"]').selectOption("REQUESTER");
    await page.locator('[data-testid="create-user-department"]').fill("Quality Assurance");
    await page.locator('[data-testid="create-user-password"]').fill(initialPassword);

    await page.locator('[data-testid="btn-submit-create-user"]').click();

    // Verify creation success banner
    await expect(page.locator('[data-testid="admin-success-alert"]')).toBeVisible({ timeout: 10000 });

    // -------------------------------------------------------------------------
    // Step 3: Safety Guardrail Notice on Self-Edit (AC-21, BR-18)
    // -------------------------------------------------------------------------
    // Find the row or card for admin.toktickit@email.com
    const adminRow = testInfo.project.name === "mobile"
      ? page.locator(`[data-testid^="user-card-"]:has-text("admin.toktickit@email.com")`).first()
      : page.locator(`tr:has-text("admin.toktickit@email.com")`).first();
    const editAdminBtn = adminRow.locator('button:has-text("Edit")');
    await editAdminBtn.click();

    const selfEditWarning = page.locator('[data-testid="self-edit-warning"]');
    await expect(selfEditWarning).toBeVisible();
    await expect(selfEditWarning).toContainText("Self-deactivation is prohibited");

    if (testInfo.project.name === "desktop") {
      // Screenshot 03: Self-deactivation safety warning
      await page.screenshot({
        path: path.join(ADMIN_SCREENSHOT_DIR, "03-guardrail-alert.png"),
        fullPage: true,
      });
    }

    // Cancel edit modal
    await page.locator('[data-testid="btn-cancel-edit-user"]').click();

    // -------------------------------------------------------------------------
    // Step 4: Admin Resets Password for New User (AC-20, BR-20)
    // -------------------------------------------------------------------------
    // Filter to find the newly created user
    const searchInput = page.locator('[data-testid="admin-search-input"]');
    await searchInput.fill(newUserEmail);
    await page.waitForTimeout(500);

    const newUserRow = testInfo.project.name === "mobile"
      ? page.locator(`[data-testid^="user-card-"]:has-text("${newUserEmail}")`).first()
      : page.locator(`tr:has-text("${newUserEmail}")`).first();
    await expect(newUserRow).toBeVisible({ timeout: 10000 });

    const resetBtn = newUserRow.locator('button:has-text("Reset Password")');
    await resetBtn.click();

    const resetInput = page.locator('[data-testid="reset-user-password"]');
    await expect(resetInput).toBeVisible();

    const newResetPassword = "ResetPass@2026";
    await resetInput.fill(newResetPassword);
    await page.locator('[data-testid="btn-submit-reset-password"]').click();

    await expect(page.locator('[data-testid="admin-success-alert"]')).toBeVisible({ timeout: 10000 });

    // -------------------------------------------------------------------------
    // Step 5: New User Logs In & Completes Mandatory Password Change (AC-04, BR-03)
    // -------------------------------------------------------------------------
    await page.locator('[data-testid="nav-logout-button"]').click();
    await expect(page.locator('[data-testid="nav-signin-button"]')).toBeVisible({ timeout: 10000 });

    await page.locator('[data-testid="nav-signin-button"]').click();
    await page.locator('[data-testid="login-email-input"]').fill(newUserEmail);
    await page.locator('[data-testid="login-password-input"]').fill(newResetPassword);
    await page.locator('[data-testid="login-submit-button"]').click();

    // Mandatory change password modal must intercept
    const checklist = page.locator('[data-testid="password-rules-checklist"]');
    await expect(checklist).toBeVisible({ timeout: 10000 });

    await page.locator('[data-testid="current-password-input"]').fill(newResetPassword);
    const finalPassword = "FinalUserPass@2026";
    await page.locator('[data-testid="new-password-input"]').fill(finalPassword);
    await page.locator('[data-testid="confirm-password-input"]').fill(finalPassword);

    await page.locator('[data-testid="update-password-button"]').click();

    // After updating password, user is active in the application
    await expect(checklist).not.toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="authenticated-user-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-fullname"]')).toHaveText(newUserName);
  });
});
