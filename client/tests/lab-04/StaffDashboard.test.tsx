import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StaffDashboard from "../../src/components/StaffDashboard.js";
import { AuthProvider } from "../../src/context/AuthContext.js";
import * as api from "../../src/api.js";
import type { StaffDashboardResponse, AdminDashboardResponse } from "../../src/api.js";

vi.mock("../../src/api.js", async (importOriginal) => {
  const actual = await importOriginal<typeof api>();
  return {
    ...actual,
    getMeApi: vi.fn(),
    fetchStaffDashboard: vi.fn(),
    fetchAdminDashboard: vi.fn(),
  };
});

const mockStaffData: StaffDashboardResponse = {
  metrics: {
    unassignedTickets: 4,
    myAssignedTickets: 6,
    waitingForRequester: 3,
    urgentTickets: 2,
    ticketsByStatus: {
      NEW: 2,
      OPEN: 3,
      IN_PROGRESS: 4,
      WAITING_FOR_REQUESTER: 3,
      RESOLVED: 5,
      CLOSED: 10,
      REOPENED: 1,
      CANCELLED: 1,
    },
    ticketsByPriority: {
      LOW: 5,
      MEDIUM: 12,
      HIGH: 8,
      URGENT: 2,
    },
  },
  recentActions: [
    {
      id: 201,
      ticketId: 15,
      ticketNumber: "TKT-2026-000015",
      actionDateTime: "2026-10-02T13:45:00.000Z",
      description: "Replaced faulty switch SFP module",
      result: "Link restored and verified at 10 Gbps full duplex",
      followUpRequired: true,
    },
    {
      id: 202,
      ticketId: 16,
      ticketNumber: "TKT-2026-000016",
      actionDateTime: "2026-10-02T11:15:00.000Z",
      description: "Provisioned new LDAP user profile",
      result: "Account provisioned and welcome email dispatched",
      followUpRequired: false,
    },
  ],
  urgentAttentionTickets: [
    {
      id: 18,
      ticketNumber: "TKT-2026-000018",
      summary: "Database failover synchronization stalled",
      itPriority: "URGENT",
      currentStatus: "OPEN",
      ticketOwner: "Unassigned",
      createdAt: "2026-10-02T08:00:00.000Z",
    },
  ],
};

const mockAdminData: AdminDashboardResponse = {
  staffDashboard: mockStaffData,
  userStats: {
    totalUsers: 25,
    activeUsers: 23,
    inactiveUsers: 2,
    byRole: {
      REQUESTER: 16,
      IT_STAFF: 7,
      ADMIN: 2,
    },
  },
};

describe("StaffDashboard Component (UI-04 / AC-14, AC-17, AC-18, AC-21)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithAuth = (ui: React.ReactElement, role: "IT_STAFF" | "ADMIN" = "IT_STAFF") => {
    vi.mocked(api.getMeApi).mockResolvedValue({
      user: {
        id: role === "ADMIN" ? 1 : 2,
        fullName: role === "ADMIN" ? "Admin Boss" : "Piti Srisongkram",
        email: role === "ADMIN" ? "admin@toktickit.com" : "piti@toktickit.com",
        role,
        mustChangePassword: false,
      },
    });

    return render(<AuthProvider>{ui}</AuthProvider>);
  };

  it("renders 4 operational metric cards with authoritative counts (AC-14)", async () => {
    vi.mocked(api.fetchStaffDashboard).mockResolvedValueOnce(mockStaffData);

    renderWithAuth(<StaffDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId("staff-dashboard")).toBeInTheDocument();
    });

    // Check metric cards
    expect(screen.getByTestId("metric-value-unassigned")).toHaveTextContent("4");
    expect(screen.getByTestId("metric-value-my-assigned")).toHaveTextContent("6");
    expect(screen.getByTestId("metric-value-waiting-feedback")).toHaveTextContent("3");
    expect(screen.getByTestId("metric-value-urgent")).toHaveTextContent("2");
  });

  it("navigates to unassigned queue drill-down on card click (AC-17)", async () => {
    vi.mocked(api.fetchStaffDashboard).mockResolvedValueOnce(mockStaffData);
    const user = userEvent.setup();
    const mockNavigate = vi.fn();

    renderWithAuth(<StaffDashboard onNavigateToQueue={mockNavigate} />);

    await waitFor(() => {
      expect(screen.getByTestId("metric-card-unassigned")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("metric-card-unassigned"));
    expect(mockNavigate).toHaveBeenCalledWith({ assigned: "unassigned" });
  });

  it("navigates to my active queue drill-down on card click (AC-18)", async () => {
    vi.mocked(api.fetchStaffDashboard).mockResolvedValueOnce(mockStaffData);
    const user = userEvent.setup();
    const mockNavigate = vi.fn();

    renderWithAuth(<StaffDashboard onNavigateToQueue={mockNavigate} />);

    await waitFor(() => {
      expect(screen.getByTestId("metric-card-my-assigned")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("metric-card-my-assigned"));
    expect(mockNavigate).toHaveBeenCalledWith({ assigned: "me" });
  });

  it("navigates to waiting feedback and urgent queue drill-downs", async () => {
    vi.mocked(api.fetchStaffDashboard).mockResolvedValueOnce(mockStaffData);
    const user = userEvent.setup();
    const mockNavigate = vi.fn();

    renderWithAuth(<StaffDashboard onNavigateToQueue={mockNavigate} />);

    await waitFor(() => {
      expect(screen.getByTestId("metric-card-waiting-feedback")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("metric-card-waiting-feedback"));
    expect(mockNavigate).toHaveBeenCalledWith({ status: "WAITING_FOR_REQUESTER" });

    await user.click(screen.getByTestId("metric-card-urgent"));
    expect(mockNavigate).toHaveBeenCalledWith({ priority: "URGENT" });
  });

  it("renders status and priority distributions correctly", async () => {
    vi.mocked(api.fetchStaffDashboard).mockResolvedValueOnce(mockStaffData);

    renderWithAuth(<StaffDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId("status-distribution-section")).toBeInTheDocument();
    });

    // Check statuses
    expect(screen.getByTestId("status-count-NEW")).toHaveTextContent("2");
    expect(screen.getByTestId("status-count-OPEN")).toHaveTextContent("3");
    expect(screen.getByTestId("status-count-IN_PROGRESS")).toHaveTextContent("4");
    expect(screen.getByTestId("status-count-RESOLVED")).toHaveTextContent("5");

    // Check priorities
    expect(screen.getByTestId("priority-count-LOW")).toHaveTextContent("5");
    expect(screen.getByTestId("priority-count-MEDIUM")).toHaveTextContent("12");
    expect(screen.getByTestId("priority-count-HIGH")).toHaveTextContent("8");
    expect(screen.getByTestId("priority-count-URGENT")).toHaveTextContent("2");
  });

  it("renders urgent attention queue and recent actions log with ticket links", async () => {
    vi.mocked(api.fetchStaffDashboard).mockResolvedValueOnce(mockStaffData);
    const user = userEvent.setup();
    const mockSelect = vi.fn();

    renderWithAuth(<StaffDashboard onSelectTicket={mockSelect} />);

    await waitFor(() => {
      expect(screen.getByTestId("urgent-attention-section")).toBeInTheDocument();
    });

    // Urgent ticket
    expect(screen.getByText("TKT-2026-000018")).toBeInTheDocument();
    expect(screen.getByText("Database failover synchronization stalled")).toBeInTheDocument();

    await user.click(screen.getByTestId("urgent-ticket-link-18"));
    expect(mockSelect).toHaveBeenCalledWith(18);

    // Recent action item
    expect(screen.getByTestId("recent-action-item-201")).toBeInTheDocument();
    expect(screen.getByText("Replaced faulty switch SFP module")).toBeInTheDocument();
    expect(screen.getByTestId("action-followup-badge-201")).toHaveTextContent("Follow-Up Required");

    await user.click(screen.getByTestId("action-ticket-link-201"));
    expect(mockSelect).toHaveBeenCalledWith(15);
  });

  it("does NOT render admin user stats for non-admin IT_STAFF", async () => {
    vi.mocked(api.fetchStaffDashboard).mockResolvedValueOnce(mockStaffData);

    renderWithAuth(<StaffDashboard />, "IT_STAFF");

    await waitFor(() => {
      expect(screen.getByTestId("staff-dashboard")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("admin-user-stats-section")).not.toBeInTheDocument();
    expect(api.fetchAdminDashboard).not.toHaveBeenCalled();
    expect(api.fetchStaffDashboard).toHaveBeenCalledTimes(1);
  });

  it("augments dashboard with admin user management stats when user is ADMIN (AC-21)", async () => {
    vi.mocked(api.fetchAdminDashboard).mockResolvedValueOnce(mockAdminData);
    const user = userEvent.setup();
    const mockNavigateUsers = vi.fn();

    renderWithAuth(<StaffDashboard onNavigateToUsers={mockNavigateUsers} />, "ADMIN");

    await waitFor(() => {
      expect(screen.getByTestId("admin-user-stats-section")).toBeInTheDocument();
    });

    expect(api.fetchAdminDashboard).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("admin-stat-total-users")).toHaveTextContent("25");
    expect(screen.getByTestId("admin-stat-active-users")).toHaveTextContent("23");
    expect(screen.getByTestId("admin-stat-inactive-users")).toHaveTextContent("2");
    expect(screen.getByTestId("admin-stat-by-role")).toHaveTextContent("16 Req | 7 Staff | 2 Admin");

    // Click manage users
    await user.click(screen.getByTestId("admin-manage-users-btn"));
    expect(mockNavigateUsers).toHaveBeenCalledTimes(1);
  });
});

