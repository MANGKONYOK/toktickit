import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RequesterDashboard from "../../src/components/RequesterDashboard.js";
import * as api from "../../src/api.js";
import type { RequesterDashboardResponse } from "../../src/api.js";

const mockDashboardData: RequesterDashboardResponse = {
  metrics: {
    totalOpen: 3,
    waitingForRequester: 1,
    recentlyUpdated: 2,
    recentlyResolved: 4,
  },
  recentTickets: [
    {
      id: 101,
      ticketNumber: "TKT-2026-000101",
      summary: "Cannot connect to office Wi-Fi",
      categoryName: "Network",
      requestedPriority: "HIGH",
      currentStatus: "WAITING_FOR_REQUESTER",
      resolvedByRequester: false,
      updatedAt: "2026-10-02T14:30:00.000Z",
    },
    {
      id: 102,
      ticketNumber: "TKT-2026-000102",
      summary: "Need access to PostgreSQL staging database",
      categoryName: "Database",
      requestedPriority: "MEDIUM",
      currentStatus: "IN_PROGRESS",
      resolvedByRequester: false,
      updatedAt: "2026-10-02T11:00:00.000Z",
    },
    {
      id: 103,
      ticketNumber: "TKT-2026-000103",
      summary: "VPN client certificate expired",
      categoryName: "Security",
      requestedPriority: "URGENT",
      currentStatus: "OPEN",
      resolvedByRequester: false,
      updatedAt: "2026-10-01T16:00:00.000Z",
    },
  ],
};

const mockEmptyDashboardData: RequesterDashboardResponse = {
  metrics: {
    totalOpen: 0,
    waitingForRequester: 0,
    recentlyUpdated: 0,
    recentlyResolved: 0,
  },
  recentTickets: [],
};

describe("RequesterDashboard Component (UI-03 / AC-13, AC-15, AC-16)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders 4 Zen Green metric cards with authoritative counts (AC-13, AC-16)", async () => {
    vi.spyOn(api, "fetchRequesterDashboard").mockResolvedValueOnce(mockDashboardData);

    render(<RequesterDashboard />);

    // Wait for data load
    await waitFor(() => {
      expect(screen.queryByTestId("dashboard-loading")).not.toBeInTheDocument();
    });

    expect(screen.getByTestId("requester-dashboard")).toBeInTheDocument();

    // Verify 4 metric card values
    expect(screen.getByTestId("metric-value-total-open")).toHaveTextContent("3");
    expect(screen.getByTestId("metric-value-waiting")).toHaveTextContent("1");
    expect(screen.getByTestId("metric-value-recently-updated")).toHaveTextContent("2");
    expect(screen.getByTestId("metric-value-recently-resolved")).toHaveTextContent("4");
  });

  it("renders recent requests table with ticket details, status, and priority badges (AC-16)", async () => {
    vi.spyOn(api, "fetchRequesterDashboard").mockResolvedValueOnce(mockDashboardData);

    render(<RequesterDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId("recent-tickets-table")).toBeInTheDocument();
    });

    // Check rows
    expect(screen.getByText("TKT-2026-000101")).toBeInTheDocument();
    expect(screen.getByText("Cannot connect to office Wi-Fi")).toBeInTheDocument();
    expect(screen.getByText("TKT-2026-000102")).toBeInTheDocument();
    expect(screen.getByText("TKT-2026-000103")).toBeInTheDocument();

    // Check status and priority badges
    expect(screen.getByTestId("status-badge-WAITING_FOR_REQUESTER")).toBeInTheDocument();
    expect(screen.getByTestId("priority-badge-HIGH")).toBeInTheDocument();
    expect(screen.getByTestId("priority-badge-URGENT")).toBeInTheDocument();
  });

  it("navigates to filtered queue when clicking metric cards (Drill-Down / AC-16)", async () => {
    vi.spyOn(api, "fetchRequesterDashboard").mockResolvedValueOnce(mockDashboardData);
    const user = userEvent.setup();
    const mockNavigate = vi.fn();

    render(<RequesterDashboard onNavigateToMyTickets={mockNavigate} />);

    await waitFor(() => {
      expect(screen.getByTestId("metric-card-total-open")).toBeInTheDocument();
    });

    // Click Total Open card
    await user.click(screen.getByTestId("metric-card-total-open"));
    expect(mockNavigate).toHaveBeenCalledWith({ tab: "open" });

    // Click Waiting card
    await user.click(screen.getByTestId("metric-card-waiting"));
    expect(mockNavigate).toHaveBeenCalledWith({ status: "WAITING_FOR_REQUESTER" });

    // Click Recently Updated card
    await user.click(screen.getByTestId("metric-card-recently-updated"));
    expect(mockNavigate).toHaveBeenCalledWith({ tab: "recent" });

    // Click Resolved card
    await user.click(screen.getByTestId("metric-card-recently-resolved"));
    expect(mockNavigate).toHaveBeenCalledWith({ status: "RESOLVED" });
  });

  it("triggers ticket selection callback when clicking ticket link or view button", async () => {
    vi.spyOn(api, "fetchRequesterDashboard").mockResolvedValueOnce(mockDashboardData);
    const user = userEvent.setup();
    const mockSelect = vi.fn();

    render(<RequesterDashboard onSelectTicket={mockSelect} />);

    await waitFor(() => {
      expect(screen.getByTestId("ticket-link-101")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("ticket-link-101"));
    expect(mockSelect).toHaveBeenCalledWith(101);

    await user.click(screen.getByTestId("view-ticket-102"));
    expect(mockSelect).toHaveBeenCalledWith(102);
  });

  it("triggers create ticket callback when clicking quick create button", async () => {
    vi.spyOn(api, "fetchRequesterDashboard").mockResolvedValueOnce(mockDashboardData);
    const user = userEvent.setup();
    const mockCreate = vi.fn();

    render(<RequesterDashboard onNavigateToCreateTicket={mockCreate} />);

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-create-ticket-btn")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("dashboard-create-ticket-btn"));
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it("renders empty state callout when requester has zero tickets (AC-15)", async () => {
    vi.spyOn(api, "fetchRequesterDashboard").mockResolvedValueOnce(mockEmptyDashboardData);
    const user = userEvent.setup();
    const mockCreate = vi.fn();

    render(<RequesterDashboard onNavigateToCreateTicket={mockCreate} />);

    await waitFor(() => {
      expect(screen.getByTestId("requester-dashboard-empty")).toBeInTheDocument();
    });

    expect(screen.getByText("No Support Requests Yet")).toBeInTheDocument();
    expect(screen.queryByTestId("recent-tickets-table")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("empty-create-ticket-btn"));
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it("renders amber alert highlight on waiting card when waitingForRequester > 0", async () => {
    vi.spyOn(api, "fetchRequesterDashboard").mockResolvedValueOnce(mockDashboardData);

    render(<RequesterDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId("metric-card-waiting")).toBeInTheDocument();
    });

    const waitingCard = screen.getByTestId("metric-card-waiting");
    expect(waitingCard.className).toContain("alert-amber");
    expect(screen.getByText("Action Needed")).toBeInTheDocument();
  });
});

