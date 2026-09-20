import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StaffTicketQueue from "../../src/components/StaffTicketQueue.js";
import { AuthProvider } from "../../src/context/AuthContext.js";
import * as api from "../../src/api.js";

const mockCategories: api.Category[] = [
  { id: 1, name: "Account and Access" },
  { id: 2, name: "Hardware" },
  { id: 3, name: "Software" },
  { id: 4, name: "Network" },
];

const mockTickets: api.StaffTicketItem[] = [
  {
    id: 101,
    ticketNumber: "TKT-2026-000101",
    summary: "VPN connection drops repeatedly",
    categoryName: "Network",
    relatedSystemName: "VPN",
    priority: "HIGH",
    itPriority: "URGENT",
    status: "OPEN",
    requesterName: "Sorawit Chaithong",
    requesterId: 1,
    assignedOwnerName: "Piti Srisongkram",
    assignedOwnerId: 2,
    ticketOwner: "Piti Srisongkram",
    ticketOwnerId: 2,
    resolvedByRequester: false,
    createdAt: "2026-09-15T10:00:00.000Z",
    updatedAt: "2026-09-15T10:30:00.000Z",
  },
  {
    id: 102,
    ticketNumber: "TKT-2026-000102",
    summary: "External monitor flickers",
    categoryName: "Hardware",
    relatedSystemName: "Corporate Laptop",
    priority: "MEDIUM",
    itPriority: "HIGH",
    status: "IN_PROGRESS",
    requesterName: "Jane Doe",
    requesterId: 4,
    assignedOwnerName: null,
    assignedOwnerId: null,
    ticketOwner: "Unassigned",
    ticketOwnerId: null,
    resolvedByRequester: true,
    createdAt: "2026-09-16T11:00:00.000Z",
    updatedAt: "2026-09-16T11:45:00.000Z",
  },
];

const mockPaginatedResponse: api.PaginatedStaffTicketsResponse = {
  tickets: mockTickets,
  pagination: {
    page: 1,
    pageSize: 10,
    limit: 10,
    totalRecords: 2,
    total: 2,
    totalPages: 1,
  },
};

vi.mock("../../src/api.js", async (importOriginal) => {
  const actual = await importOriginal<typeof api>();
  return {
    ...actual,
    fetchCategories: vi.fn(),
    fetchStaffTickets: vi.fn(),
    getMeApi: vi.fn().mockResolvedValue({
      user: {
        id: 2,
        fullName: "Piti Srisongkram",
        email: "piti.srisongkram@email.com",
        role: "IT_STAFF",
        mustChangePassword: false,
      },
    }),
  };
});

describe("Staff Ticket Queue Component (UI-05 / AC-12..14)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchCategories).mockResolvedValue(mockCategories);
    vi.mocked(api.fetchStaffTickets).mockResolvedValue(mockPaginatedResponse);
  });

  const renderComponent = (props: { onSelectTicket?: (id: number) => void } = {}) => {
    return render(
      <AuthProvider>
        <StaffTicketQueue {...props} />
      </AuthProvider>
    );
  };

  it("UI-05: renders queue toolbar, table columns, and pagination controls", async () => {
    renderComponent();

    // Check loading indicator or wait for load
    await waitFor(() => {
      expect(screen.getByTestId("staff-ticket-queue")).toBeInTheDocument();
    });

    // Check Filter Toolbar controls
    expect(screen.getByTestId("staff-queue-search")).toBeInTheDocument();
    expect(screen.getByTestId("staff-queue-category")).toBeInTheDocument();
    expect(screen.getByTestId("staff-queue-priority")).toBeInTheDocument();
    expect(screen.getByTestId("staff-queue-status")).toBeInTheDocument();
    expect(screen.getByTestId("staff-queue-assigned")).toBeInTheDocument();

    // Check Table Headers and Rows
    await waitFor(() => {
      expect(screen.getByTestId("staff-tickets-table")).toBeInTheDocument();
      expect(screen.getByTestId("staff-ticket-row-101")).toBeInTheDocument();
      expect(screen.getByTestId("staff-ticket-row-102")).toBeInTheDocument();
    });

    // Verify row details within table
    const table = screen.getByTestId("staff-tickets-table");
    expect(table).toHaveTextContent("TKT-2026-000101");
    expect(table).toHaveTextContent("VPN connection drops repeatedly");
    expect(table).toHaveTextContent("Sorawit Chaithong");
    expect(table).toHaveTextContent("URGENT");

    // Verify unassigned and assigned badges
    expect(table).toHaveTextContent(/👤 Piti Srisongkram/);
    expect(table).toHaveTextContent("Unassigned");

    // Verify requester problem resolved indicator badge
    expect(table).toHaveTextContent("✓ Requester OK");

    // Verify Pagination controls
    expect(screen.getByTestId("pagination-summary")).toHaveTextContent("Showing 1 to 2 of 2 tickets");
    expect(screen.getByTestId("pagination-prev")).toBeDisabled();
    expect(screen.getByTestId("pagination-next")).toBeDisabled();
    expect(screen.getByTestId("page-size-select")).toHaveValue("10");
  });

  it("UI-05: searches by keyword when user types in search input (AC-12)", async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("staff-queue-search")).toBeInTheDocument();
    });

    const searchInput = screen.getByTestId("staff-queue-search");
    await user.type(searchInput, "VPN");

    await waitFor(() => {
      expect(api.fetchStaffTickets).toHaveBeenCalledWith(
        expect.objectContaining({ search: "VPN" })
      );
    });
  });

  it("UI-05: filters by category, priority, and status dropdowns (AC-13)", async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("staff-queue-category")).toBeInTheDocument();
    });

    // Select category "Network" (id: 4)
    const categorySelect = screen.getByTestId("staff-queue-category");
    await user.selectOptions(categorySelect, "4");

    await waitFor(() => {
      expect(api.fetchStaffTickets).toHaveBeenCalledWith(
        expect.objectContaining({ categoryId: 4 })
      );
    });

    // Select priority "URGENT"
    const prioritySelect = screen.getByTestId("staff-queue-priority");
    await user.selectOptions(prioritySelect, "URGENT");

    await waitFor(() => {
      expect(api.fetchStaffTickets).toHaveBeenCalledWith(
        expect.objectContaining({ priority: "URGENT" })
      );
    });

    // Select status "OPEN"
    const statusSelect = screen.getByTestId("staff-queue-status");
    await user.selectOptions(statusSelect, "OPEN");

    await waitFor(() => {
      expect(api.fetchStaffTickets).toHaveBeenCalledWith(
        expect.objectContaining({ status: "OPEN" })
      );
    });
  });

  it("UI-05: filters by assignment options (AC-14)", async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("staff-queue-assigned")).toBeInTheDocument();
    });

    const assignedSelect = screen.getByTestId("staff-queue-assigned");

    // Filter by Unassigned
    await user.selectOptions(assignedSelect, "unassigned");
    await waitFor(() => {
      expect(api.fetchStaffTickets).toHaveBeenCalledWith(
        expect.objectContaining({ assigned: "unassigned" })
      );
    });

    // Filter by Assigned to Me
    await user.selectOptions(assignedSelect, "me");
    await waitFor(() => {
      expect(api.fetchStaffTickets).toHaveBeenCalledWith(
        expect.objectContaining({ assigned: "me" })
      );
    });
  });

  it("UI-05: clear filters button resets all active filters", async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("staff-queue-search")).toBeInTheDocument();
    });

    // Apply a search filter
    await user.type(screen.getByTestId("staff-queue-search"), "monitor");

    await waitFor(() => {
      expect(screen.getByTestId("clear-filters-btn")).toBeInTheDocument();
    });

    // Click Clear all filters
    await user.click(screen.getByTestId("clear-filters-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("staff-queue-search")).toHaveValue("");
      expect(api.fetchStaffTickets).toHaveBeenCalledWith(
        expect.objectContaining({ search: undefined, assigned: "all" })
      );
    });
  });

  it("UI-05: toggles column sorting when clicking sortable headers (BR-11)", async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("sort-ticketNumber")).toBeInTheDocument();
    });

    // Click on Ticket # header to sort by ticketNumber desc
    await user.click(screen.getByTestId("sort-ticketNumber"));

    await waitFor(() => {
      expect(api.fetchStaffTickets).toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: "ticketNumber", sortOrder: "desc" })
      );
    });

    // Click again to toggle to asc
    await user.click(screen.getByTestId("sort-ticketNumber"));

    await waitFor(() => {
      expect(api.fetchStaffTickets).toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: "ticketNumber", sortOrder: "asc" })
      );
    });
  });

  it("UI-05: navigates pages when pagination buttons are clicked", async () => {
    const user = userEvent.setup();
    vi.mocked(api.fetchStaffTickets).mockResolvedValue({
      tickets: mockTickets,
      pagination: {
        page: 1,
        pageSize: 10,
        limit: 10,
        totalRecords: 25,
        total: 25,
        totalPages: 3,
      },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("pagination-next")).not.toBeDisabled();
    });

    await user.click(screen.getByTestId("pagination-next"));

    await waitFor(() => {
      expect(api.fetchStaffTickets).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2 })
      );
    });
  });

  it("UI-05: renders empty queue state when zero tickets exist in the system", async () => {
    vi.mocked(api.fetchStaffTickets).mockResolvedValue({
      tickets: [],
      pagination: {
        page: 1,
        pageSize: 10,
        limit: 10,
        totalRecords: 0,
        total: 0,
        totalPages: 1,
      },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("empty-queue-state")).toBeInTheDocument();
      expect(screen.getByText("No tickets in the queue")).toBeInTheDocument();
    });
  });

  it("UI-05: renders filtered no-results state with reset CTA when filter matches nothing", async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("staff-queue-search")).toBeInTheDocument();
    });

    // Mock empty response for filtered search
    vi.mocked(api.fetchStaffTickets).mockResolvedValue({
      tickets: [],
      pagination: {
        page: 1,
        pageSize: 10,
        limit: 10,
        totalRecords: 0,
        total: 0,
        totalPages: 1,
      },
    });

    await user.type(screen.getByTestId("staff-queue-search"), "NON_MATCHING");

    await waitFor(() => {
      expect(screen.getByTestId("no-results-state")).toBeInTheDocument();
      expect(screen.getByTestId("reset-filters-cta")).toBeInTheDocument();
    });

    // Restore mock to return tickets upon reset
    vi.mocked(api.fetchStaffTickets).mockResolvedValue(mockPaginatedResponse);

    // Click Reset Filters CTA
    await user.click(screen.getByTestId("reset-filters-cta"));

    await waitFor(() => {
      expect(screen.getByTestId("staff-queue-search")).toHaveValue("");
    });
  });

  it("UI-05: invokes onSelectTicket callback when clicking a ticket row or View Details button", async () => {
    const user = userEvent.setup();
    const handleSelect = vi.fn();
    renderComponent({ onSelectTicket: handleSelect });

    await waitFor(() => {
      expect(screen.getByTestId("view-ticket-101")).toBeInTheDocument();
    });

    // Click View Details button
    await user.click(screen.getByTestId("view-ticket-101"));
    expect(handleSelect).toHaveBeenCalledWith(101);

    // Click ticket row
    await user.click(screen.getByTestId("staff-ticket-row-102"));
    expect(handleSelect).toHaveBeenCalledWith(102);
  });
});
