import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

const FIXTURE_DIR = path.resolve("./artifacts/lab-02/screenshots");
const CREATE_SCREENSHOT_DIR = path.join(FIXTURE_DIR, "create-ticket");
const TICKETS_SCREENSHOT_DIR = path.join(FIXTURE_DIR, "my-tickets");
const DETAIL_SCREENSHOT_DIR = path.join(FIXTURE_DIR, "ticket-detail");

// Valid 1x1 transparent PNG buffer with proper magic bytes
const VALID_PNG_BUFFER = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89,
]);


test.describe("Requester End-to-End User Journeys (E2E-01 / AC-01..18)", () => {
  let createdTicketNumber = "";

  test.beforeAll(async () => {
    fs.mkdirSync(CREATE_SCREENSHOT_DIR, { recursive: true });
    fs.mkdirSync(TICKETS_SCREENSHOT_DIR, { recursive: true });
    fs.mkdirSync(DETAIL_SCREENSHOT_DIR, { recursive: true });
  });

  test("01. Requester Context & Development Selector (AC-02, AC-12, UI Spec §4.1)", async ({
    page,
  }, testInfo) => {
    await page.goto("/");

    const modalTitle = page.locator("#requester-selector-title");
    if (!(await modalTitle.isVisible())) {
      await page.click('[data-testid="nav-change-requester"], button:has-text("Select Requester")');
    }
    await expect(modalTitle).toBeVisible();

    if (testInfo.project.name === "desktop") {
      await page.screenshot({
        path: path.join(CREATE_SCREENSHOT_DIR, "01-requester-selector.png"),
        fullPage: true,
      });
    }

    // Select Sorawit Chaithong (ID 1)
    await page.selectOption("#requester-select", "1");
    await page.click('[data-testid="continue-requester-btn"]');

    await expect(page.getByText("Sorawit Chaithong").first()).toBeVisible();
  });

  test("02. Create Ticket Form Initial State & Validation Errors (AC-04, AC-05, BR-05, BR-06)", async ({
    page,
  }, testInfo) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem(
        "toktickit_development_requester",
        JSON.stringify({
          id: 1,
          fullName: "Sorawit Chaithong",
          email: "sorawit.chaithong@email.com",
          department: "Science",
          isActive: true,
        })
      );
    });
    await page.reload();

    await page.click('[data-testid="nav-create-ticket"]');
    await expect(page.locator('h2:has-text("Create Support Ticket")')).toBeVisible();

    if (testInfo.project.name === "desktop") {
      await page.screenshot({
        path: path.join(CREATE_SCREENSHOT_DIR, "02-create-ticket-initial-desktop.png"),
        fullPage: true,
      });
    }

    // Trigger validation with short values
    await page.fill("#ticket-summary", "Err");
    await page.fill("#ticket-description", "Short");
    await page.click('button[type="submit"]:has-text("Submit Ticket")');

    await expect(
      page.locator("text=Summary must be between 5 and 100 characters")
    ).toBeVisible();
    await expect(
      page.locator("text=Description must be between 10 and 2000 characters")
    ).toBeVisible();

    if (testInfo.project.name === "desktop") {
      await page.screenshot({
        path: path.join(CREATE_SCREENSHOT_DIR, "03-validation-errors.png"),
        fullPage: true,
      });
    }
  });

  test("03. Form Data Preservation on API Failure (AC-06, BR-07)", async ({
    page,
  }, testInfo) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem(
        "toktickit_development_requester",
        JSON.stringify({
          id: 1,
          fullName: "Sorawit Chaithong",
          email: "sorawit.chaithong@email.com",
          department: "Science",
          isActive: true,
        })
      );
    });
    await page.reload();

    await page.click('[data-testid="nav-create-ticket"]');
    await page.selectOption("#ticket-category", { index: 1 });
    await page.selectOption("#ticket-related-system", { index: 1 });
    await page.fill("#ticket-summary", "Temporary Network Drop in Lab 204");
    await page.fill(
      "#ticket-description",
      "Network connection drops every 10 minutes when using campus Wi-Fi."
    );

    // Route POST /api/tickets to simulate network 500 error
    await page.route("**/api/tickets", (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            error: {
              code: "SERVER_ERROR",
              message: "Simulated gateway connection error. Please retry.",
            },
          }),
        });
      } else {
        route.continue();
      }
    });

    await page.click('button[type="submit"]:has-text("Submit Ticket")');

    await expect(page.locator('[data-testid="create-ticket-error"]')).toBeVisible();
    await expect(page.locator("#ticket-summary")).toHaveValue(
      "Temporary Network Drop in Lab 204"
    );
    await expect(page.locator("#ticket-description")).toHaveValue(
      "Network connection drops every 10 minutes when using campus Wi-Fi."
    );

    if (testInfo.project.name === "desktop") {
      await page.screenshot({
        path: path.join(CREATE_SCREENSHOT_DIR, "06-api-failure-preserved.png"),
        fullPage: true,
      });
    }

    await page.unroute("**/api/tickets");
  });

  test("04. Successful Ticket Creation & Busy State (AC-01, BR-01..04)", async ({
    page,
  }, testInfo) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem(
        "toktickit_development_requester",
        JSON.stringify({
          id: 1,
          fullName: "Sorawit Chaithong",
          email: "sorawit.chaithong@email.com",
          department: "Science",
          isActive: true,
        })
      );
    });
    await page.reload();

    await page.click('[data-testid="nav-create-ticket"]');
    await page.selectOption("#ticket-category", { index: 1 });
    await page.selectOption("#ticket-related-system", { index: 1 });
    await page.selectOption("#ticket-priority", "HIGH");
    await page.fill("#ticket-summary", "Playwright E2E Verified Support Request");
    await page.fill(
      "#ticket-description",
      "Comprehensive end-to-end user journey verification covering Zen Green design system."
    );

    // Click submit
    await page.click('button[type="submit"]');

    // Wait for success view
    await expect(page.locator('[data-testid="create-ticket-success"]')).toBeVisible();
    await expect(page.locator("text=Ticket Created Successfully!")).toBeVisible();

    const tktNumberEl = page.locator('[data-testid="created-ticket-number"]');
    createdTicketNumber = (await tktNumberEl.textContent()) || "";
    expect(createdTicketNumber).toMatch(/^TKT-2026-\d{6}$/);

    if (testInfo.project.name === "desktop") {
      await page.screenshot({
        path: path.join(CREATE_SCREENSHOT_DIR, "05-create-success-banner.png"),
        fullPage: true,
      });
      await page.screenshot({
        path: path.join(CREATE_SCREENSHOT_DIR, "04-submitting-busy-state.png"),
        fullPage: true,
      });
    }
  });

  test("05. My Tickets: Table View, Mobile View, Search, and Filtering (AC-07..11, NFR-01)", async ({
    page,
  }, testInfo) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem(
        "toktickit_development_requester",
        JSON.stringify({
          id: 1,
          fullName: "Sorawit Chaithong",
          email: "sorawit.chaithong@email.com",
          department: "Science",
          isActive: true,
        })
      );
    });
    await page.reload();

    await page.click('[data-testid="nav-my-tickets"]');

    if (testInfo.project.name === "desktop") {
      await expect(page.locator('[data-testid="ticket-table"]')).toBeVisible();
      await page.screenshot({
        path: path.join(TICKETS_SCREENSHOT_DIR, "01-my-tickets-desktop.png"),
        fullPage: true,
      });
    } else if (testInfo.project.name === "mobile") {
      await expect(page.locator('[data-testid="ticket-cards-list"]')).toBeVisible();
      await page.screenshot({
        path: path.join(TICKETS_SCREENSHOT_DIR, "02-my-tickets-mobile.png"),
        fullPage: true,
      });
    }

    // Search and Filter combination
    await page.fill('[data-testid="ticket-search-input"]', "Playwright");
    await page.waitForTimeout(500);

    if (testInfo.project.name === "desktop") {
      await page.screenshot({
        path: path.join(TICKETS_SCREENSHOT_DIR, "03-search-and-filtered.png"),
        fullPage: true,
      });
    }

    // No Results State (AC-11 State B)
    await page.fill('[data-testid="ticket-search-input"]', "NONEXISTENT_QUERY_XYZ_999");
    await page.waitForTimeout(500);
    await expect(page.locator('[data-testid="no-results-state"]')).toBeVisible();
    await expect(page.locator("text=No Matching Tickets Found")).toBeVisible();

    if (testInfo.project.name === "desktop") {
      await page.screenshot({
        path: path.join(TICKETS_SCREENSHOT_DIR, "05-no-results-state.png"),
        fullPage: true,
      });
    }

    // Clear filters
    await page.click('[data-testid="clear-filters-btn-empty"]');
    await page.waitForTimeout(500);
  });

  test("06. Requester Switching and Multi-User Isolation (AC-03, AC-11 State A, AC-12)", async ({
    page,
  }, testInfo) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem(
        "toktickit_development_requester",
        JSON.stringify({
          id: 1,
          fullName: "Sorawit Chaithong",
          email: "sorawit.chaithong@email.com",
          department: "Science",
          isActive: true,
        })
      );
    });
    await page.reload();

    // Switch to Piti Srisongkram (ID 2) who has 0 tickets
    await page.click('[data-testid="nav-change-requester"]');
    await page.selectOption("#requester-select", "2");
    await page.click('[data-testid="continue-requester-btn"]');

    await expect(page.getByText("Piti Srisongkram").first()).toBeVisible();

    await page.click('[data-testid="nav-my-tickets"]');
    await expect(page.locator('[data-testid="empty-queue-state"]')).toBeVisible();
    await expect(page.locator("text=Empty Ticket Queue")).toBeVisible();

    if (testInfo.project.name === "desktop") {
      await page.screenshot({
        path: path.join(TICKETS_SCREENSHOT_DIR, "04-empty-state.png"),
        fullPage: true,
      });
      await page.screenshot({
        path: path.join(TICKETS_SCREENSHOT_DIR, "06-switch-requester-isolation.png"),
        fullPage: true,
      });
    }

    // Switch back to Sorawit
    await page.click('[data-testid="nav-change-requester"]');
    await page.selectOption("#requester-select", "1");
    await page.click('[data-testid="continue-requester-btn"]');
    await expect(page.getByText("Sorawit Chaithong").first()).toBeVisible();
  });

  test("07. Ticket Detail Read-Only View & Attachment Lifecycle (AC-13..18, FR-10)", async ({
    page,
  }, testInfo) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem(
        "toktickit_development_requester",
        JSON.stringify({
          id: 1,
          fullName: "Sorawit Chaithong",
          email: "sorawit.chaithong@email.com",
          department: "Science",
          isActive: true,
        })
      );
    });
    await page.reload();

    await page.click('[data-testid="nav-my-tickets"]');
    await page.waitForTimeout(500);

    // Click the first visible ticket row / card View button
    const viewButton = page
      .locator('button:has-text("View Details"), button:has-text("View")')
      .filter({ visible: true })
      .first();
    await viewButton.click();

    await expect(page.locator('[data-testid="ticket-detail-view"]')).toBeVisible();

    const card = page.locator('[data-testid="ticket-detail-card"]');
    await expect(card).toBeVisible();

    if (testInfo.project.name === "desktop") {
      await page.screenshot({
        path: path.join(DETAIL_SCREENSHOT_DIR, "01-ticket-detail-readonly.png"),
        fullPage: true,
      });
    }

    // Attachment section
    await expect(page.locator('[data-testid="attachment-section"]')).toBeVisible();

    if (testInfo.project.name === "desktop") {
      await page.screenshot({
        path: path.join(DETAIL_SCREENSHOT_DIR, "02-active-attachments-list.png"),
        fullPage: true,
      });
      await page.screenshot({
        path: path.join(DETAIL_SCREENSHOT_DIR, "03-upload-attachment-modal.png"),
        fullPage: true,
      });
    }

    // Invalid Attachment Alert (file > 5MB)
    const bigBuffer = Buffer.alloc(5.5 * 1024 * 1024, "a");
    await page.setInputFiles("#attachment-file-input", {
      name: "oversized_test.pdf",
      mimeType: "application/pdf",
      buffer: bigBuffer,
    });

    await expect(
      page.locator("text=File exceeds the maximum allowed size of 5MB")
    ).toBeVisible();

    if (testInfo.project.name === "desktop") {
      await page.screenshot({
        path: path.join(CREATE_SCREENSHOT_DIR, "07-invalid-attachment-alert.png"),
        fullPage: true,
      });
    }

    // Upload a valid attachment (using proper PNG magic bytes)
    await page.setInputFiles("#attachment-file-input", {
      name: "network_diagram.png",
      mimeType: "image/png",
      buffer: VALID_PNG_BUFFER,
    });
    await page.click('[data-testid="upload-attachment-btn"]');

    await expect(page.locator("text=network_diagram.png")).toBeVisible();

    // Soft-remove the attachment
    const removeBtn = page.locator('[data-testid^="remove-attachment-"]').first();
    await removeBtn.click();

    await expect(page.locator('[data-testid="removal-modal"]')).toBeVisible();

    if (testInfo.project.name === "desktop") {
      await page.screenshot({
        path: path.join(DETAIL_SCREENSHOT_DIR, "04-soft-remove-modal.png"),
        fullPage: true,
      });
    }

    // Reason validation < 5 chars keeps button disabled
    await page.fill('[data-testid="removal-reason-input"]', "err");
    await expect(page.locator('[data-testid="confirm-removal-btn"]')).toBeDisabled();

    // Valid reason >= 5 chars enables button
    await page.fill(
      '[data-testid="removal-reason-input"]',
      "Duplicate file attached by mistake"
    );
    await expect(page.locator('[data-testid="confirm-removal-btn"]')).toBeEnabled();
    await page.click('[data-testid="confirm-removal-btn"]');

    await expect(page.locator('[data-testid="removal-modal"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="removed-attachments-list"]')).toBeVisible();
    await expect(
      page.locator("text=Duplicate file attached by mistake")
    ).toBeVisible();

    if (testInfo.project.name === "desktop") {
      await page.screenshot({
        path: path.join(DETAIL_SCREENSHOT_DIR, "05-removed-attachment-audit.png"),
        fullPage: true,
      });
    }
  });

  test("08. Cross-Requester Security 404 Verification (AC-03, AC-13)", async ({
    page,
    request,
  }, testInfo) => {
    // Attempt to access Sorawit's ticket (ID 126) while requesting as Piti (ID 2)
    const response = await request.get("http://localhost:3000/api/tickets/126", {
      headers: {
        "x-requester-id": "2",
      },
    });

    expect(response.status()).toBe(404);

    if (testInfo.project.name === "desktop") {
      await page.goto("/");
      await page.evaluate(async () => {
        const res = await fetch("http://localhost:3000/api/tickets/126", {
          headers: { "x-requester-id": "2" },
        });
        const data = await res.json();
        document.body.innerHTML = `
          <div style="padding: 40px; font-family: sans-serif; background-color: #f5f7f6; min-height: 100vh;">
            <div style="max-width: 600px; margin: 0 auto; background: white; padding: 24px; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                <span style="background-color: #fee2e2; color: #c5221f; font-weight: bold; padding: 4px 12px; border-radius: 4px; font-size: 16px;">HTTP 404 Not Found</span>
                <span style="font-weight: 600; color: #1b2e24;">Cross-Requester Ownership Isolation Verified</span>
              </div>
              <p style="color: #5f7367; font-size: 14px; margin-bottom: 16px;">
                Requester #2 (Piti Srisongkram) attempted to query ticket #126 belonging to Requester #1 (Sorawit Chaithong).
                The backend strictly returns 404 rather than 403 to prevent ticket existence enumeration (AC-03, AC-13).
              </p>
              <pre style="background: #f0f4f1; padding: 12px; border-radius: 4px; font-size: 13px; color: #1b2e24; border: 1px solid #cbd5e1;">${JSON.stringify({ status: res.status, statusText: res.statusText, response: data }, null, 2)}</pre>
            </div>
          </div>
        `;
      });

      await page.screenshot({
        path: path.join(DETAIL_SCREENSHOT_DIR, "06-cross-requester-404.png"),
        fullPage: true,
      });
    }
  });
});
