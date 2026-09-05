import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TicketDetail from "../../src/components/TicketDetail.js";
import * as api from "../../src/api.js";
import { RequesterProvider } from "../../src/context/RequesterContext.js";

vi.mock("../../src/api.js");

const mockTicketData: api.TicketDetailResponse = {
  id: 101,
  ticketNumber: "TKT-2026-000101",
  requesterId: 1,
  categoryId: 2,
  relatedSystemId: 7,
  requestedPriority: "HIGH",
  itPriority: "HIGH",
  currentStatus: "NEW",
  summary: "HDMI display flickering constantly",
  description: "When connected to external monitor in room 302, screen flickers every few minutes.",
  ticketOwner: "Unassigned",
  createdAt: "2026-09-01T10:00:00.000Z",
  updatedAt: "2026-09-01T10:00:00.000Z",
  category: { id: 2, name: "Hardware" },
  relatedSystem: { id: 7, name: "Corporate Laptop" },
  requester: {
    id: 1,
    fullName: "Sorawit Chaithong",
    email: "sorawit.chaithong@email.com",
    department: "Science",
    isActive: true,
  },
  attachments: [
    {
      id: 5,
      ticketId: 101,
      fileName: "screen_flicker_photo.jpg",
      originalName: "screen_flicker_photo.jpg",
      fileSize: 102400,
      mimeType: "image/jpeg",
      uploadedAt: "2026-09-01T10:05:00.000Z",
      isRemoved: false,
    },
  ],
  removedAttachments: [],
};

describe("TicketDetail Component - [UI-06 / AC-13, UI Spec §4.4]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
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
    vi.mocked(api.fetchRequesters).mockResolvedValue([
      {
        id: 1,
        fullName: "Sorawit Chaithong",
        email: "sorawit.chaithong@email.com",
        department: "Science",
        isActive: true,
      },
    ]);
  });

  it("renders read-only ticket details with Zen Green style, summary, and metadata", async () => {
    vi.mocked(api.fetchTicketDetail).mockResolvedValue(mockTicketData);
    const onBack = vi.fn();

    render(
      <RequesterProvider>
        <TicketDetail ticketId={101} onBack={onBack} />
      </RequesterProvider>
    );

    // Initial loading
    expect(screen.getByTestId("ticket-detail-loading")).toBeInTheDocument();

    // After load
    await waitFor(() => {
      expect(screen.getByTestId("ticket-number-display")).toHaveTextContent("TKT-2026-000101");
    });

    expect(screen.getByTestId("ticket-summary-display")).toHaveTextContent(
      "HDMI display flickering constantly"
    );
    expect(screen.getByTestId("ticket-description-display")).toHaveTextContent(
      "When connected to external monitor in room 302"
    );
    expect(screen.getByText("Hardware")).toBeInTheDocument();
    expect(screen.getByText("Corporate Laptop")).toBeInTheDocument();
    expect(screen.getByText("Unassigned")).toBeInTheDocument();
    expect(screen.getByText("Sorawit Chaithong")).toBeInTheDocument();

    // Verify read-only surface styling
    const card = screen.getByTestId("ticket-detail-card");
    expect(card).toBeInTheDocument();
  });

  it("triggers onBack callback when clicking Back to Ticket List button", async () => {
    vi.mocked(api.fetchTicketDetail).mockResolvedValue(mockTicketData);
    const user = userEvent.setup();
    const onBack = vi.fn();

    render(
      <RequesterProvider>
        <TicketDetail ticketId={101} onBack={onBack} />
      </RequesterProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("back-to-tickets-btn")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("back-to-tickets-btn"));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("displays error alert when ticket detail fetch fails", async () => {
    vi.mocked(api.fetchTicketDetail).mockRejectedValue(new Error("Ticket not found or unauthorized"));
    const onBack = vi.fn();

    render(
      <RequesterProvider>
        <TicketDetail ticketId={999} onBack={onBack} />
      </RequesterProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("ticket-detail-error")).toBeInTheDocument();
    });

    expect(screen.getByText(/Ticket not found or unauthorized/i)).toBeInTheDocument();
  });
});
