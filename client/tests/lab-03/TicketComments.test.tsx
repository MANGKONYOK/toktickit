import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TicketDetail from "../../src/components/TicketDetail.js";
import * as api from "../../src/api.js";
import { RequesterProvider } from "../../src/context/RequesterContext.js";
import { AuthProvider } from "../../src/context/AuthContext.js";

vi.mock("../../src/api.js");

const mockTicketData: api.TicketDetailResponse = {
  id: 101,
  ticketNumber: "TKT-2026-000101",
  requesterId: 1,
  categoryId: 2,
  relatedSystemId: 7,
  requestedPriority: "HIGH",
  itPriority: "HIGH",
  currentStatus: "IN_PROGRESS",
  resolvedByRequester: false,
  summary: "HDMI display flickering constantly",
  description: "When connected to external monitor in room 302, screen flickers every few minutes.",
  ticketOwner: "IT Staff Jane",
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
  attachments: [],
  removedAttachments: [],
};

const mockComments: api.CommentItem[] = [
  {
    id: 1,
    ticketId: 101,
    authorId: 1,
    content: "Initial observation: only happens with the HDMI cable in room 302.",
    createdAt: "2026-09-01T10:15:00.000Z",
    author: {
      id: 1,
      fullName: "Sorawit Chaithong",
      email: "sorawit.chaithong@email.com",
      role: "REQUESTER",
    },
  },
  {
    id: 2,
    ticketId: 101,
    authorId: 2,
    content: "We ordered a replacement adapter for room 302.",
    createdAt: "2026-09-01T11:00:00.000Z",
    author: {
      id: 2,
      fullName: "IT Staff Jane",
      email: "jane@company.internal",
      role: "IT_STAFF",
    },
  },
];

describe("TicketDetail - Public Comments & Problem Resolution (FR-06, FR-07 / AC-10, AC-11)", () => {
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
    vi.mocked(api.getMeApi).mockResolvedValue({
      user: {
        id: 1,
        fullName: "Sorawit Chaithong",
        email: "sorawit.chaithong@email.com",
        role: "REQUESTER",
        mustChangePassword: false,
      },
    });
    vi.mocked(api.fetchTicketDetail).mockResolvedValue(mockTicketData);
    vi.mocked(api.fetchComments).mockResolvedValue({ comments: mockComments });
  });

  it("UI-03 / AC-10: renders comments stream with author role badges and timestamps", async () => {
    render(
      <AuthProvider>
        <RequesterProvider>
          <TicketDetail ticketId={101} onBack={vi.fn()} />
        </RequesterProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("comments-section")).toBeInTheDocument();
    });

    expect(screen.getByText("Public Discussion (2)")).toBeInTheDocument();
    expect(screen.getByText("Initial observation: only happens with the HDMI cable in room 302.")).toBeInTheDocument();
    expect(screen.getByText("We ordered a replacement adapter for room 302.")).toBeInTheDocument();

    const authorRoles = screen.getAllByTestId("comment-author-role");
    expect(authorRoles[0]).toHaveTextContent("Requester");
    expect(authorRoles[1]).toHaveTextContent("IT Staff");
  });

  it("UI-03 / AC-10: submits a new public comment and appends it to stream", async () => {
    const user = userEvent.setup();
    const newCommentItem: api.CommentItem = {
      id: 3,
      ticketId: 101,
      authorId: 1,
      content: "Thank you for the update!",
      createdAt: new Date().toISOString(),
      author: {
        id: 1,
        fullName: "Sorawit Chaithong",
        email: "sorawit.chaithong@email.com",
        role: "REQUESTER",
      },
    };
    vi.mocked(api.postComment).mockResolvedValue(newCommentItem);

    render(
      <AuthProvider>
        <RequesterProvider>
          <TicketDetail ticketId={101} onBack={vi.fn()} />
        </RequesterProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("new-comment-input")).toBeInTheDocument();
    });

    const input = screen.getByTestId("new-comment-input");
    const submitBtn = screen.getByTestId("submit-comment-btn");

    await user.type(input, "Thank you for the update!");
    await user.click(submitBtn);

    expect(api.postComment).toHaveBeenCalledWith(101, "Thank you for the update!");

    await waitFor(() => {
      expect(screen.getByText("Thank you for the update!")).toBeInTheDocument();
    });
    expect(input).toHaveValue("");
  });

  it("UI-04 / AC-11: shows resolution button when unresolved and updates to resolved badge upon click", async () => {
    const user = userEvent.setup();
    vi.mocked(api.indicateProblemResolved).mockResolvedValue({
      message: "Ticket marked as resolved by requester",
      resolvedByRequester: true,
    });

    render(
      <AuthProvider>
        <RequesterProvider>
          <TicketDetail ticketId={101} onBack={vi.fn()} />
        </RequesterProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("indicate-resolved-btn")).toBeInTheDocument();
    });

    const resolveBtn = screen.getByTestId("indicate-resolved-btn");
    expect(resolveBtn).toHaveTextContent("✓ Problem Appears Resolved");

    await user.click(resolveBtn);

    expect(api.indicateProblemResolved).toHaveBeenCalledWith(101);

    await waitFor(() => {
      expect(screen.getByTestId("problem-resolved-badge")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("indicate-resolved-btn")).not.toBeInTheDocument();
  });

  it("UI-04 / AC-11: displays resolved badge immediately when ticket is already indicated resolved", async () => {
    vi.mocked(api.fetchTicketDetail).mockResolvedValue({
      ...mockTicketData,
      resolvedByRequester: true,
    });

    render(
      <AuthProvider>
        <RequesterProvider>
          <TicketDetail ticketId={101} onBack={vi.fn()} />
        </RequesterProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("problem-resolved-badge")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("indicate-resolved-btn")).not.toBeInTheDocument();
  });
});
