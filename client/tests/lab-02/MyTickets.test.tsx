import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import MyTickets from "../../src/components/MyTickets.js";
import { RequesterProvider } from "../../src/context/RequesterContext.js";
import * as api from "../../src/api.js";

vi.mock("../../src/api.js");

const MOCK_REQUESTER_A: api.RequesterUser = {
  id: 1,
  fullName: "Sorawit Chaithong",
  email: "sorawit.chaithong@email.com",
  department: "Science",
  isActive: true,
};

const MOCK_CATEGORIES: api.Category[] = [
  { id: 1, name: "Account and Access", isActive: true },
  { id: 2, name: "Hardware", isActive: true },
];

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
  {
    id: 102,
    ticketNumber: "TKT-2026-000102",
    requesterId: 1,
    categoryId: 1,
    relatedSystemId: 1,
    requestedPriority: "LOW",
    itPriority: "LOW",
    currentStatus: "RESOLVED",
    summary: "Password reset request for webmail",
    description: "Need temporary password link for corporate webmail.",
    ticketOwner: "IT Support Staff",
    createdAt: "2026-02-14T08:00:00.000Z",
    updatedAt: "2026-02-14T11:00:00.000Z",
    category: { id: 1, name: "Account and Access" },
    relatedSystem: { id: 1, name: "Email" },
  },
];

describe("MyTickets Component (UI-05 / AC-07, AC-08, AC-09, AC-10, AC-11, FR-07, FR-08, FR-09)", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(
      "toktickit_development_requester",
      JSON.stringify(MOCK_REQUESTER_A)
    );

    vi.spyOn(api, "fetchRequesters").mockResolvedValue([MOCK_REQUESTER_A]);
    vi.spyOn(api, "fetchCategories").mockResolvedValue(MOCK_CATEGORIES);
    vi.spyOn(api, "fetchMyTickets").mockResolvedValue({
      tickets: MOCK_TICKETS,
      pagination: {
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function renderWithRequester(props = {}) {
    return render(
      <RequesterProvider>
        <MyTickets {...props} />
      </RequesterProvider>
    );
  }

  // -------------------------------------------------------------------------
  // UI-05: Dual Empty States (AC-11 / FR-09)
  // -------------------------------------------------------------------------
  it("UI-05 / AC-11: renders 'Empty Ticket Queue' callout with primary action when requester has 0 tickets", async () => {
    vi.spyOn(api, "fetchMyTickets").mockResolvedValue({
      tickets: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 1,
      },
    });

    const onNavigateMock = vi.fn();
    renderWithRequester({ onNavigateToCreateTicket: onNavigateMock });

    await waitFor(() => {
      expect(screen.getByTestId("empty-queue-state")).toBeInTheDocument();
    });

    expect(screen.getByText(/Empty Ticket Queue/i)).toBeInTheDocument();
    expect(
      screen.getByText(/You have not submitted any support tickets yet/i)
    ).toBeInTheDocument();

    const ctaButton = screen.getByTestId("create-ticket-cta-btn");
    expect(ctaButton).toBeInTheDocument();
    fireEvent.click(ctaButton);
    expect(onNavigateMock).toHaveBeenCalledTimes(1);
  });

  it("UI-05 / AC-11: renders 'No Matching Tickets Found' callout with Clear Filters action when filter yields 0 results", async () => {
    vi.spyOn(api, "fetchMyTickets").mockResolvedValue({
      tickets: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 1,
      },
    });

    renderWithRequester();

    await waitFor(() => {
      expect(screen.getByTestId("ticket-search-input")).toBeInTheDocument();
    });

    // Enter a search query that activates filters
    const searchInput = screen.getByTestId("ticket-search-input");
    fireEvent.change(searchInput, { target: { value: "nonexistent" } });

    await waitFor(() => {
      expect(screen.getByTestId("no-results-state")).toBeInTheDocument();
    });

    expect(screen.getByText(/No Matching Tickets Found/i)).toBeInTheDocument();
    expect(
      screen.getByText(/No tickets match your search or filter criteria/i)
    ).toBeInTheDocument();

    const clearBtn = screen.getByTestId("clear-filters-btn-empty");
    expect(clearBtn).toBeInTheDocument();
    fireEvent.click(clearBtn);

    // Search input should be reset
    expect((searchInput as HTMLInputElement).value).toBe("");
  });

  // -------------------------------------------------------------------------
  // Data Table & Badges (AC-07, AC-08)
  // -------------------------------------------------------------------------
  it("renders ticket list table with status badges, priority badges, and formatted dates", async () => {
    renderWithRequester();

    await waitFor(() => {
      expect(screen.getAllByText("TKT-2026-000101").length).toBeGreaterThan(0);
      expect(screen.getAllByText("TKT-2026-000102").length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText("Laptop battery drains quickly").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Password reset request for webmail").length).toBeGreaterThan(0);
    expect(screen.getAllByText("NEW").length).toBeGreaterThan(0);
    expect(screen.getAllByText("RESOLVED").length).toBeGreaterThan(0);
    expect(screen.getAllByText("HIGH").length).toBeGreaterThan(0);
    expect(screen.getAllByText("LOW").length).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // Multi-Filter & Search Input Interactions (AC-07, AC-08)
  // -------------------------------------------------------------------------
  it("dispatches API requests with active search and filter parameters", async () => {
    const fetchSpy = vi.spyOn(api, "fetchMyTickets");
    renderWithRequester();

    await waitFor(() => {
      expect(screen.getByTestId("category-filter-select")).toBeInTheDocument();
    });

    // Change category filter
    const catSelect = screen.getByTestId("category-filter-select");
    fireEvent.change(catSelect, { target: { value: "2" } });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          categoryId: 2,
        })
      );
    });

    // Change priority filter
    const prioritySelect = screen.getByTestId("priority-filter-select");
    fireEvent.change(prioritySelect, { target: { value: "HIGH" } });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          requestedPriority: "HIGH",
        })
      );
    });

    // Change status filter
    const statusSelect = screen.getByTestId("status-filter-select");
    fireEvent.change(statusSelect, { target: { value: "NEW" } });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "NEW",
        })
      );
    });
  });

  // -------------------------------------------------------------------------
  // Custom Sorting & Pagination (AC-09, AC-10)
  // -------------------------------------------------------------------------
  it("toggles sort order and navigates pages with proper boundary disabling", async () => {
    const fetchSpy = vi.spyOn(api, "fetchMyTickets").mockResolvedValue({
      tickets: MOCK_TICKETS,
      pagination: {
        page: 1,
        limit: 10,
        total: 25,
        totalPages: 3,
      },
    });

    renderWithRequester();

    await waitFor(() => {
      expect(screen.getByTestId("pagination-info")).toBeInTheDocument();
    });

    expect(screen.getByTestId("pagination-info").textContent).toContain("Showing 1 to 10 of 25 tickets");

    const prevBtn = screen.getByTestId("pagination-prev-btn");
    const nextBtn = screen.getByTestId("pagination-next-btn");

    // Previous is disabled on page 1
    expect(prevBtn).toBeDisabled();
    expect(nextBtn).not.toBeDisabled();

    // Click Next
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
        })
      );
    });

    // Toggle sort order button
    const sortOrderBtn = screen.getByTestId("sort-order-btn");
    fireEvent.click(sortOrderBtn);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          sortOrder: "asc",
        })
      );
    });
  });
});
