import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StaffTicketDetail from "../../src/components/StaffTicketDetail.js";
import { AuthProvider } from "../../src/context/AuthContext.js";
import * as api from "../../src/api.js";

const mockTicketDetail: api.StaffTicketDetail = {
  id: 201,
  ticketNumber: "TKT-2026-000201",
  summary: "VPN connection drops on campus Wi-Fi",
  description: "User loses connection during video calls.",
  requestedPriority: "HIGH",
  itPriority: "HIGH",
  priority: "HIGH",
  status: "OPEN",
  currentStatus: "OPEN",
  resolvedByRequester: false,
  requester: {
    id: 1,
    fullName: "Sorawit Chaithong",
    email: "sorawit.chaithong@email.com",
    department: "Engineering",
    role: "REQUESTER",
  },
  category: {
    id: 1,
    name: "Network",
  },
  relatedSystem: {
    id: 1,
    name: "Campus Wi-Fi",
  },
  assignedStaff: null,
  ticketOwnerId: null,
  ticketOwner: "Unassigned",
  assignedOwnerName: null,
  assignedOwnerId: null,
  createdAt: "2026-10-01T09:00:00.000Z",
  updatedAt: "2026-10-01T09:15:00.000Z",
  attachments: [],
  comments: [],
  internalNotes: [],
  actionsTaken: [],
};

vi.mock("../../src/api.js", async (importOriginal) => {
  const actual = await importOriginal<typeof api>();
  return {
    ...actual,
    fetchStaffTicketDetail: vi.fn(),
    transitionTicketStatus: vi.fn(),
    fetchActiveStaffMembers: vi.fn().mockResolvedValue({ staff: [] }),
    fetchPublicComments: vi.fn().mockResolvedValue({ comments: [] }),
    fetchInternalNotes: vi.fn().mockResolvedValue({ notes: [] }),
    fetchActionsTaken: vi.fn().mockResolvedValue({ actions: [] }),
  };
});

describe("Workflow & Concurrency UI Component Tests (FR-08 / AC-11)", () => {
  const mockOnBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders status transition select with permitted next statuses for OPEN ticket", async () => {
    vi.mocked(api.fetchStaffTicketDetail).mockResolvedValue({
      ticket: { ...mockTicketDetail, currentStatus: "OPEN", status: "OPEN" },
    });

    render(
      <AuthProvider>
        <StaffTicketDetail ticketId={201} onBack={mockOnBack} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("status-transition-select")).toBeInTheDocument();
    });

    const select = screen.getByTestId("status-transition-select") as HTMLSelectElement;
    const options = Array.from(select.options).map((opt) => opt.value);

    // OPEN allows: IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, CANCELLED
    expect(options).toEqual([
      "IN_PROGRESS",
      "WAITING_FOR_REQUESTER",
      "RESOLVED",
      "CANCELLED",
    ]);
  });

  it("submits status transition with expectedUpdatedAt matching current ticket updatedAt", async () => {
    const user = userEvent.setup();
    vi.mocked(api.fetchStaffTicketDetail).mockResolvedValue({
      ticket: { ...mockTicketDetail, currentStatus: "OPEN", status: "OPEN", updatedAt: "2026-10-01T09:15:00.000Z" },
    });
    vi.mocked(api.transitionTicketStatus).mockResolvedValue({
      ticket: {
        id: 201,
        status: "IN_PROGRESS",
        currentStatus: "IN_PROGRESS",
        updatedAt: "2026-10-01T09:20:00.000Z",
      },
      message: "Status transitioned successfully.",
    });

    render(
      <AuthProvider>
        <StaffTicketDetail ticketId={201} onBack={mockOnBack} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("status-transition-select")).toBeInTheDocument();
    });

    const applyBtn = screen.getByTestId("apply-status-btn");
    await user.click(applyBtn);

    expect(api.transitionTicketStatus).toHaveBeenCalledWith(
      201,
      "IN_PROGRESS",
      "2026-10-01T09:15:00.000Z"
    );
  });

  it("displays Concurrency Conflict banner when API rejects with HTTP 409", async () => {
    const user = userEvent.setup();
    vi.mocked(api.fetchStaffTicketDetail).mockResolvedValue({
      ticket: { ...mockTicketDetail, currentStatus: "OPEN", status: "OPEN", updatedAt: "2026-10-01T09:15:00.000Z" },
    });

    const conflictError: any = new Error(
      "This ticket was modified by another user while you were viewing it. Please reload the latest ticket state before making changes."
    );
    conflictError.status = 409;
    conflictError.code = "CONCURRENCY_CONFLICT";
    conflictError.details = {
      currentUpdatedAt: "2026-10-01T09:18:00.000Z",
      currentStatus: "WAITING_FOR_REQUESTER",
    };
    vi.mocked(api.transitionTicketStatus).mockRejectedValue(conflictError);

    render(
      <AuthProvider>
        <StaffTicketDetail ticketId={201} onBack={mockOnBack} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("apply-status-btn")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("apply-status-btn"));

    // Banner must appear
    await waitFor(() => {
      expect(screen.getByTestId("concurrency-conflict-banner")).toBeInTheDocument();
    });

    expect(screen.getByText(/Concurrency Conflict: Ticket State Modified/i)).toBeInTheDocument();
    expect(screen.getByText(/WAITING_FOR_REQUESTER/i)).toBeInTheDocument();
    expect(screen.getByTestId("reload-ticket-btn")).toBeInTheDocument();
  });

  it("reloads latest ticket data and clears conflict banner when user clicks Reload", async () => {
    const user = userEvent.setup();
    vi.mocked(api.fetchStaffTicketDetail).mockResolvedValueOnce({
      ticket: { ...mockTicketDetail, currentStatus: "OPEN", status: "OPEN", updatedAt: "2026-10-01T09:15:00.000Z" },
    });

    const conflictError: any = new Error("Conflict");
    conflictError.status = 409;
    conflictError.code = "CONCURRENCY_CONFLICT";
    conflictError.details = {
      currentUpdatedAt: "2026-10-01T09:18:00.000Z",
      currentStatus: "WAITING_FOR_REQUESTER",
    };
    vi.mocked(api.transitionTicketStatus).mockRejectedValueOnce(conflictError);

    render(
      <AuthProvider>
        <StaffTicketDetail ticketId={201} onBack={mockOnBack} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("apply-status-btn")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("apply-status-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("concurrency-conflict-banner")).toBeInTheDocument();
    });

    // Setup fresh data for reload
    vi.mocked(api.fetchStaffTicketDetail).mockResolvedValueOnce({
      ticket: {
        ...mockTicketDetail,
        currentStatus: "WAITING_FOR_REQUESTER",
        status: "WAITING_FOR_REQUESTER",
        updatedAt: "2026-10-01T09:18:00.000Z",
      },
    });

    const reloadBtn = screen.getByTestId("reload-ticket-btn");
    await user.click(reloadBtn);

    // Conflict banner should disappear
    await waitFor(() => {
      expect(screen.queryByTestId("concurrency-conflict-banner")).not.toBeInTheDocument();
    });

    // Select options should now reflect transitions from WAITING_FOR_REQUESTER
    const select = screen.getByTestId("status-transition-select") as HTMLSelectElement;
    const options = Array.from(select.options).map((opt) => opt.value);
    expect(options).toEqual(["IN_PROGRESS", "RESOLVED", "CANCELLED"]);
  });
});

