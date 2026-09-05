import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import fs from "fs";
import path from "path";
import CreateTicket from "../../src/components/CreateTicket.js";
import TicketDetail from "../../src/components/TicketDetail.js";
import { RequesterProvider } from "../../src/context/RequesterContext.js";
import * as api from "../../src/api.js";

vi.mock("../../src/api.js");

const MOCK_REQUESTER: api.RequesterUser = {
  id: 1,
  fullName: "Sorawit Chaithong",
  email: "sorawit.chaithong@email.com",
  department: "Science",
  isActive: true,
};

const MOCK_DETAIL: api.TicketDetailResponse = {
  id: 101,
  ticketNumber: "TKT-2026-000101",
  requesterId: 1,
  categoryId: 2,
  relatedSystemId: 7,
  requestedPriority: "MEDIUM",
  itPriority: "MEDIUM",
  currentStatus: "NEW",
  summary: "VPN access issue",
  description: "Cannot connect to company VPN from remote home network.",
  ticketOwner: "Unassigned",
  createdAt: "2026-02-15T09:00:00.000Z",
  updatedAt: "2026-02-15T09:00:00.000Z",
  requester: MOCK_REQUESTER,
  category: { id: 2, name: "Hardware" },
  relatedSystem: { id: 7, name: "Corporate Laptop" },
  attachments: [],
};

describe("Zen Green Design System Conformance (STYLE-01 / AC-13, NFR-02, UI Spec §3)", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("toktickit_development_requester", JSON.stringify(MOCK_REQUESTER));

    vi.spyOn(api, "fetchRequesters").mockResolvedValue([MOCK_REQUESTER]);
    vi.spyOn(api, "fetchCategories").mockResolvedValue([{ id: 1, name: "Account and Access" }, { id: 2, name: "Hardware" }]);
    vi.spyOn(api, "fetchRelatedSystems").mockResolvedValue([{ id: 7, name: "Corporate Laptop" }]);
    vi.spyOn(api, "fetchTicketDetail").mockResolvedValue(MOCK_DETAIL);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("STYLE-01.1: verifies exact Zen Green color palette tokens defined in index.css", () => {
    const cssPath = fs.existsSync("src/index.css")
      ? "src/index.css"
      : path.resolve(process.cwd(), "client/src/index.css");
    const cssContent = fs.readFileSync(cssPath, "utf-8");

    // Primary & Secondary brand greens
    expect(cssContent).toMatch(/--color-primary:\s*#006b3c/i);
    expect(cssContent).toMatch(/--color-secondary:\s*#0b7a46/i);

    // Pale green accent
    expect(cssContent).toMatch(/--color-pale-green:\s*#eaf6ef/i);

    // Read-only surface tint
    expect(cssContent).toMatch(/--color-readonly-bg:\s*#f0f4f1/i);

    // Error alert color
    expect(cssContent).toMatch(/--color-error:\s*#c5221f/i);

    // Page background canvas
    expect(cssContent).toMatch(/--color-bg-page:\s*#f5f7f6/i);
  });

  it("STYLE-01.2: asserts mandatory form inputs display visible red asterisks (*)", async () => {
    render(
      <RequesterProvider>
        <CreateTicket />
      </RequesterProvider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/Summary/i)).toBeInTheDocument();
    });

    // Check for asterisks on mandatory fields
    const asterisks = screen.getAllByText("*");
    expect(asterisks.length).toBeGreaterThanOrEqual(4); // Category, Related System, Summary, Description
    asterisks.forEach((ast) => {
      expect(ast.className).toContain("text-danger");
    });
  });

  it("STYLE-01.3: asserts Ticket Detail surface strictly uses read-only background and styling", async () => {
    render(
      <RequesterProvider>
        <TicketDetail ticketId={101} onBack={() => {}} />
      </RequesterProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("ticket-detail-view")).toBeInTheDocument();
    });

    // Assert read-only card and elements
    const card = screen.getByTestId("ticket-detail-card");
    expect(card).toBeInTheDocument();
    expect(card.className).toContain("zen-readonly-surface");
    expect(card.className).toContain("zen-card");

    expect(screen.getByTestId("ticket-number-display")).toBeInTheDocument();
    expect(screen.getByTestId("ticket-summary-display")).toBeInTheDocument();
    expect(screen.getByTestId("ticket-description-display")).toBeInTheDocument();
  });

  it("STYLE-01.4: asserts primary and secondary buttons follow Zen Green hierarchy with touch targets >= 44px", async () => {
    // Assert CSS specification rule enforces min-height >= 44px for touch targets
    const cssPath = fs.existsSync("src/index.css")
      ? "src/index.css"
      : path.resolve(process.cwd(), "client/src/index.css");
    const cssContent = fs.readFileSync(cssPath, "utf-8");
    expect(cssContent).toMatch(/\.touch-target\s*\{[^}]*min-height:\s*44px/i);

    render(
      <RequesterProvider>
        <CreateTicket />
      </RequesterProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Submit Ticket/i })).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole("button", { name: /Submit Ticket/i });
    expect(submitBtn.className).toContain("btn-zen-primary");
    expect(submitBtn.className).toContain("touch-target");

    const clearBtn = screen.getByRole("button", { name: /Clear/i });
    expect(clearBtn.className).toContain("touch-target");
  });
});
