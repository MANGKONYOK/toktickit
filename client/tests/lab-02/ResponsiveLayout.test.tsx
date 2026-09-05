import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import MyTickets from "../../src/components/MyTickets.js";
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

const MOCK_TICKETS: api.Ticket[] = [
  {
    id: 101,
    ticketNumber: "TKT-2026-000101",
    requesterId: 1,
    categoryId: 2,
    relatedSystemId: 7,
    requestedPriority: "HIGH",
    itPriority: "HIGH",
    currentStatus: "NEW",
    summary: "Laptop battery drains quickly",
    description: "Battery discharges completely within 30 minutes.",
    ticketOwner: "Unassigned",
    createdAt: "2026-02-15T09:00:00.000Z",
    updatedAt: "2026-02-15T09:00:00.000Z",
    category: { id: 2, name: "Hardware" },
    relatedSystem: { id: 7, name: "Corporate Laptop" },
  },
];

describe("Responsive Layout & Style Conformance (RESP-01 / NFR-01, style-contract.md)", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(
      "toktickit_development_requester",
      JSON.stringify(MOCK_REQUESTER)
    );

    vi.spyOn(api, "fetchRequesters").mockResolvedValue([MOCK_REQUESTER]);
    vi.spyOn(api, "fetchCategories").mockResolvedValue([]);
    vi.spyOn(api, "fetchMyTickets").mockResolvedValue({
      tickets: MOCK_TICKETS,
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("RESP-01: renders both Desktop Data Table (d-none d-md-block) and Mobile Stacked Cards (d-md-none)", async () => {
    render(
      <RequesterProvider>
        <MyTickets />
      </RequesterProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("ticket-table")).toBeInTheDocument();
      expect(screen.getByTestId("ticket-cards-list")).toBeInTheDocument();
    });

    const desktopTable = screen.getByTestId("ticket-table");
    const mobileCards = screen.getByTestId("ticket-cards-list");

    // Assert Bootstrap responsive visibility utility classes
    expect(desktopTable.className).toContain("d-none");
    expect(desktopTable.className).toContain("d-md-block");

    expect(mobileCards.className).toContain("d-md-none");

    // Assert mobile cards use dedicated zen-ticket-card class
    const card = screen.getByTestId("ticket-card-TKT-2026-000101");
    expect(card.className).toContain("zen-ticket-card");
  });

  it("RESP-01 / style-contract.md: interactive action buttons include touch-target sizing class", async () => {
    render(
      <RequesterProvider>
        <MyTickets onNavigateToCreateTicket={() => {}} />
      </RequesterProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /New Request/i })).toBeInTheDocument();
      expect(screen.getByTestId("pagination-prev-btn")).toBeInTheDocument();
    });

    const actionBtn = screen.getByRole("button", { name: /New Request/i });
    expect(actionBtn.className).toContain("touch-target");

    const paginationPrev = screen.getByTestId("pagination-prev-btn");
    const paginationNext = screen.getByTestId("pagination-next-btn");
    expect(paginationPrev.className).toContain("zen-pagination-btn");
    expect(paginationNext.className).toContain("zen-pagination-btn");
  });
});
