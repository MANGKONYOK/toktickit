import { test, expect, Page } from "@playwright/test";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const AUTH_SCREENSHOT_DIR = path.resolve("./artifacts/lab-03/screenshots/authentication");

function seedDatabase() {
  try {
    const cmd = process.platform === "win32" ? "npm.cmd --prefix server run reset:auth" : "npm --prefix server run reset:auth";
    execSync(cmd, { stdio: "ignore" });
  } catch (err) {
    console.error("Failed to reset auth state:", err);
  }
}

test.describe("Authentication & Session Lifecycle (E2E-01 / AC-01..06, BR-01..06)", () => {
  test.beforeAll(async () => {
    fs.mkdirSync(AUTH_SCREENSHOT_DIR, { recursive: true });
    seedDatabase();
  });

  test.afterAll(async () => {
    seedDatabase();
  });

  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("01. Valid User Login & Navbar Role Verification (AC-01, AC-07)", async ({
    page,
  }, testInfo) => {
    await page.goto("/");

    // Open sign in modal
    const signInBtn = page.locator('[data-testid="nav-signin-button"]');
    await expect(signInBtn).toBeVisible({ timeout: 15000 });

    if (testInfo.project.name === "desktop") {
      await signInBtn.click();
      const loginEmail = page.locator('[data-testid="login-email-input"]');
      await expect(loginEmail).toBeVisible();

      // Screenshot 01: Clean login form on Desktop
      await page.screenshot({
        path: path.join(AUTH_SCREENSHOT_DIR, "01-login-desktop.png"),
        fullPage: true,
      });

      await loginEmail.fill("alice.johnson@email.com");
      await page.locator('[data-testid="login-password-input"]').fill("Password@2026");
      await page.locator('[data-testid="login-submit-button"]').click();

      // Verify authenticated navbar
      const userSection = page.locator('[data-testid="authenticated-user-section"]');
      await expect(userSection).toBeVisible({ timeout: 10000 });
      await expect(page.locator('[data-testid="user-fullname"]')).toHaveText("Alice Johnson");
      await expect(page.locator('[data-testid="role-badge"]')).toHaveText("Requester");
    } else if (testInfo.project.name === "mobile") {
      await signInBtn.click();
      const loginEmail = page.locator('[data-testid="login-email-input"]');
      await expect(loginEmail).toBeVisible();

      // Screenshot 04: Mobile responsive login
      await page.screenshot({
        path: path.join(AUTH_SCREENSHOT_DIR, "04-login-mobile.png"),
        fullPage: true,
      });

      await loginEmail.fill("alice.johnson@email.com");
      await page.locator('[data-testid="login-password-input"]').fill("Password@2026");
      await page.locator('[data-testid="login-submit-button"]').click();

      await expect(page.locator('[data-testid="authenticated-user-section"]')).toBeVisible({
        timeout: 10000,
      });
    } else {
      await signInBtn.click();
      await page.locator('[data-testid="login-email-input"]').fill("alice.johnson@email.com");
      await page.locator('[data-testid="login-password-input"]').fill("Password@2026");
      await page.locator('[data-testid="login-submit-button"]').click();
      await expect(page.locator('[data-testid="authenticated-user-section"]')).toBeVisible({
        timeout: 10000,
      });
    }
  });

  test("02. Invalid Credentials Rejection & Anti-Enumeration (AC-02, BR-04)", async ({
    page,
  }, testInfo) => {
    await page.goto("/");
    await page.locator('[data-testid="nav-signin-button"]').click();

    await page.locator('[data-testid="login-email-input"]').fill("alice.johnson@email.com");
    await page.locator('[data-testid="login-password-input"]').fill("WrongPassword@999");
    await page.locator('[data-testid="login-submit-button"]').click();

    const errorAlert = page.locator('[data-testid="login-error-alert"]');
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText("Invalid email or password");

    if (testInfo.project.name === "desktop") {
      // Screenshot 02: Login error alert
      await page.screenshot({
        path: path.join(AUTH_SCREENSHOT_DIR, "02-login-error-alert.png"),
        fullPage: true,
      });
    }
  });

  test("03. Deactivated Account Login Blocking (AC-03, BR-04)", async ({ page }) => {
    await page.goto("/");
    await page.locator('[data-testid="nav-signin-button"]').click();

    await page.locator('[data-testid="login-email-input"]').fill("alexanders.inactive@email.com");
    await page.locator('[data-testid="login-password-input"]').fill("Password@2026");
    await page.locator('[data-testid="login-submit-button"]').click();

    const errorAlert = page.locator('[data-testid="login-error-alert"]');
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText("Your account is inactive");
  });

  test("04. Mandatory First-Login Password Change Gate & Complexity Checklist (AC-04, AC-05, BR-02, BR-03)", async ({
    page,
  }, testInfo) => {
    if (testInfo.project.name !== "desktop") {
      test.skip();
    }

    await page.goto("/");
    await page.locator('[data-testid="nav-signin-button"]').click();

    // Login with Bob Smith whose mustChangePassword flag is true
    await page.locator('[data-testid="login-email-input"]').fill("bob.smith@email.com");
    await page.locator('[data-testid="login-password-input"]').fill("Password@2026");
    await page.locator('[data-testid="login-submit-button"]').click();

    // Expect ChangePasswordModal to intercept navigation
    const checklist = page.locator('[data-testid="password-rules-checklist"]');
    await expect(checklist).toBeVisible({ timeout: 10000 });

    const currentPassInput = page.locator('[data-testid="current-password-input"]');
    const newPassInput = page.locator('[data-testid="new-password-input"]');
    const confirmPassInput = page.locator('[data-testid="confirm-password-input"]');
    const submitBtn = page.locator('[data-testid="update-password-button"]');

    // Fill current password
    await currentPassInput.fill("Password@2026");

    // Fill partial new password to check dynamic rule feedback
    await newPassInput.fill("abc");
    await confirmPassInput.fill("abc");
    await expect(submitBtn).toBeDisabled();

    if (testInfo.project.name === "desktop") {
      // Screenshot 03: Password change modal with checklist
      await page.screenshot({
        path: path.join(AUTH_SCREENSHOT_DIR, "03-password-change-modal.png"),
        fullPage: true,
      });
    }

    // Now fill a valid compliant password meeting all complexity rules
    const newValidPass = "BobSecurePass@2026";
    await newPassInput.fill(newValidPass);
    await confirmPassInput.fill(newValidPass);

    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // After success, modal disappears and user can navigate normally
    await expect(checklist).not.toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="authenticated-user-section"]')).toBeVisible();
  });

  test("05. Session Revocation on Logout (AC-06)", async ({ page }) => {
    await page.goto("/");
    await page.locator('[data-testid="nav-signin-button"]').click();

    await page.locator('[data-testid="login-email-input"]').fill("alice.johnson@email.com");
    await page.locator('[data-testid="login-password-input"]').fill("Password@2026");
    await page.locator('[data-testid="login-submit-button"]').click();

    const logoutBtn = page.locator('[data-testid="nav-logout-button"]');
    await expect(logoutBtn).toBeVisible({ timeout: 10000 });
    await logoutBtn.click();

    // Sign in button is visible again
    await expect(page.locator('[data-testid="nav-signin-button"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="authenticated-user-section"]')).not.toBeVisible();
  });
});
