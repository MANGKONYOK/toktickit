import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StaffTicketDetail from "../../src/components/StaffTicketDetail.js";
import { AuthProvider } from "../../src/context/AuthContext.js";
import * as api from "../../src/api.js";

const mockTicketDetail: api.StaffTicketDetail = {
  id: 101,
  ticketNumber: "TKT-2026-000101",
  summary: "VPN connection drops repeatedly",
  description: "User cannot maintain stable connection to campus network.",
  requestedPriority: "MEDIUM",
  itPriority: "HIGH",
  priority: "HIGH",
  status: "NEW",
  currentStatus: "NEW",
  resolvedByRequester: false,
  requester: {
    id: 1,
    fullName: "Sorawit Chaithong",
    email: "sorawit.chaithong@email.com",
    department: "Science",
    role: "REQUESTER",
  },
  category: {
    id: 4,
    name: "Network",
  },
  relatedSystem: {
    id: 3,
    name: "VPN",
  },
  assignedStaff: null,
  ticketOwnerId: null,
  ticketOwner: "Unassigned",
  assignedOwnerName: null,
  assignedOwnerId: null,
  createdAt: "2026-09-15T10:00:00.000Z",
  updatedAt: "2026-09-15T10:30:00.000Z",
  attachments: [],
  comments: [
    {
      id: 1,
      ticketId: 101,
      authorId: 1,
      authorName: "Sorawit Chaithong",
      authorRole: "REQUESTER",
      content: "This is happening every 10 minutes.",
      createdAt: "2026-09-15T10:05:00.000Z",
    },
  ],
  internalNotes: [
    {
      id: 1,
      ticketId: 101,
      authorId: 2,
      authorName: "Piti Srisongkram",
      authorRole: "IT_STAFF",
      content: "Initial trace indicates DHCP lease expiration mismatch.",
      createdAt: "2026-09-15T10:20:00.000Z",
    },
  ],
};

vi.mock("../../src/api.js", async (importOriginal) => {
  const actual = await importOriginal<typeof api>();
  return {
    ...actual,
    fetchStaffTicketDetail: vi.fn(),
    assignTicketOwner: vi.fn(),
    updateTicketPriority: vi.fn(),
    transitionTicketStatus: vi.fn(),
    createInternalNote: vi.fn(),
    addComment: vi.fn(),
    fetchAttachments: vi.fn().mockResolvedValue([]),
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

describe("Staff Ticket Detail Component (UI-06 / AC-15..19)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchStaffTicketDetail).mockResolvedValue({ ticket: { ...mockTicketDetail } });
    vi.mocked(api.fetchAttachments).mockResolvedValue([]);
  });

  const renderComponent = (props: { ticketId?: number; onBack?: () => void } = {}) => {
    return render(
      <AuthProvider>
        <StaffTicketDetail ticketId={props.ticketId || 101} onBack={props.onBack || vi.fn()} />
      </AuthProvider>
    );
  };

  it("UI-06 / AC-15: renders operational controls, ticket metadata, and badges", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("staff-ticket-detail")).toBeInTheDocument();
    });

    expect(screen.getByText("TKT-2026-000101")).toBeInTheDocument();
    expect(screen.getByText("VPN connection drops repeatedly")).toBeInTheDocument();
    expect(screen.getAllByText("Sorawit Chaithong").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Network")).toBeInTheDocument();
    expect(screen.getByText("VPN")).toBeInTheDocument();
    expect(screen.getByTestId("operational-controls-toolbar")).toBeInTheDocument();
    expect(screen.getByTestId("current-assignee-badge")).toHaveTextContent("Unassigned");
  });

  it("UI-06 / AC-16: claims ownership for active staff member", async () => {
    vi.mocked(api.assignTicketOwner).mockResolvedValue({
      ticket: { id: 101, ticketOwnerId: 2, assignedOwnerName: "Piti Srisongkram" },
      message: "Ownership updated successfully.",
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("claim-ownership-btn")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("claim-ownership-btn"));

    await waitFor(() => {
      expect(api.assignTicketOwner).toHaveBeenCalledWith(101, 2);
      expect(screen.getByTestId("current-assignee-badge")).toHaveTextContent("Piti Srisongkram");
    });
  });

  it("UI-06 / AC-17: modifies operational IT priority independently", async () => {
    vi.mocked(api.updateTicketPriority).mockResolvedValue({
      ticket: { id: 101, itPriority: "URGENT" },
      message: "IT Priority updated.",
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("it-priority-select")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId("it-priority-select"), { target: { value: "URGENT" } });

    await waitFor(() => {
      expect(api.updateTicketPriority).toHaveBeenCalledWith(101, "URGENT");
    });
  });

  it("UI-06 / AC-18: dropdown presents only valid transitions from NEW (OPEN, CANCELLED) and applies transition", async () => {
    vi.mocked(api.transitionTicketStatus).mockResolvedValue({
      ticket: { id: 101, status: "OPEN", currentStatus: "OPEN" },
      message: "Status transitioned successfully.",
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("status-transition-select")).toBeInTheDocument();
    });

    const select = screen.getByTestId("status-transition-select") as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => o.value);
    expect(options).toEqual(["OPEN", "CANCELLED"]);

    fireEvent.change(select, { target: { value: "OPEN" } });
    fireEvent.click(screen.getByTestId("apply-status-btn"));

    await waitFor(() => {
      expect(api.transitionTicketStatus).toHaveBeenCalledWith(101, "OPEN");
    });
  });

  it("UI-06 / AC-18: renders terminal state notice when ticket is CLOSED", async () => {
    vi.mocked(api.fetchStaffTicketDetail).mockResolvedValue({
      ticket: {
        ...mockTicketDetail,
        status: "CLOSED",
        currentStatus: "CLOSED",
      },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("terminal-status-notice")).toBeInTheDocument();
    });

    expect(screen.getByTestId("terminal-status-notice")).toHaveTextContent("Terminal State (CLOSED)");
    expect(screen.queryByTestId("status-transition-select")).not.toBeInTheDocument();
  });

  it("UI-06 / AC-19: renders shaded amber internal notes panel and posts new note", async () => {
    vi.mocked(api.createInternalNote).mockResolvedValue({
      note: {
        id: 2,
        ticketId: 101,
        authorId: 2,
        authorName: "Piti Srisongkram",
        authorRole: "IT_STAFF",
        content: "Verified Radius server logs: authentication successful.",
        createdAt: "2026-09-15T10:45:00.000Z",
      },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("internal-notes-panel")).toBeInTheDocument();
    });

    // Check existing note
    expect(screen.getByText("Initial trace indicates DHCP lease expiration mismatch.")).toBeInTheDocument();

    // Type and submit new internal note
    const input = screen.getByTestId("internal-note-input");
    fireEvent.change(input, {
      target: { value: "Verified Radius server logs: authentication successful." },
    });

    fireEvent.click(screen.getByTestId("submit-internal-note-btn"));

    await waitFor(() => {
      expect(api.createInternalNote).toHaveBeenCalledWith(
        101,
        "Verified Radius server logs: authentication successful."
      );
      expect(
        screen.getByText("Verified Radius server logs: authentication successful.")
      ).toBeInTheDocument();
    });
  });

  it("UI-06 / AC-10: submits public comment and updates stream", async () => {
    vi.mocked(api.addComment).mockResolvedValue({
      comment: {
        id: 2,
        ticketId: 101,
        authorId: 2,
        authorName: "Piti Srisongkram",
        authorRole: "IT_STAFF",
        content: "We have updated the DHCP lease configuration.",
        createdAt: "2026-09-15T10:50:00.000Z",
      },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("public-comments-panel")).toBeInTheDocument();
    });

    const commentInput = screen.getByTestId("public-comment-input");
    fireEvent.change(commentInput, {
      target: { value: "We have updated the DHCP lease configuration." },
    });

    fireEvent.click(screen.getByTestId("submit-public-comment-btn"));

    await waitFor(() => {
      expect(api.addComment).toHaveBeenCalledWith(
        101,
        "We have updated the DHCP lease configuration."
      );
      expect(
        screen.getByText("We have updated the DHCP lease configuration.")
      ).toBeInTheDocument();
    });
  });

  it("UI-06: clicking back button triggers onBack callback", async () => {
    const handleBack = vi.fn();
    renderComponent({ onBack: handleBack });

    await waitFor(() => {
      expect(screen.getByTestId("back-to-queue-btn")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("back-to-queue-btn"));
    expect(handleBack).toHaveBeenCalled();
  });
});
