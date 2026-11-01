import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import RequesterDashboard from "../../src/components/RequesterDashboard.js";
import StaffDashboard from "../../src/components/StaffDashboard.js";
import ActionsTakenSection from "../../src/components/ActionsTakenSection.js";
import { AuthProvider } from "../../src/context/AuthContext.js";
import * as api from "../../src/api.js";
import fs from "fs";
import path from "path";

vi.mock("../../src/api.js", async (importOriginal) => {
  const actual = await importOriginal<typeof api>();
  return {
    ...actual,
    getMeApi: vi.fn(),
    fetchRequesterDashboard: vi.fn(),
    fetchStaffDashboard: vi.fn(),
  };
});

describe("Design Token and Style Conformance Tests (STYLE-01, STYLE-02 / AC-19)", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Inject index.css content into document.head to ensure JSDOM evaluates CSS rules and tokens
    const cssPath = path.resolve(__dirname, "../../src/index.css");
    const cssContent = fs.readFileSync(cssPath, "utf8");
    const styleTag = document.createElement("style");
    styleTag.setAttribute("data-testid", "test-stylesheet");
    styleTag.innerHTML = cssContent;
    document.head.appendChild(styleTag);
  });

  describe("STYLE-01: Metric Cards Adopt Zen Green Tokens (AC-19)", () => {
    it("ensures :root defines Zen Green CSS variables (--zg-surface, --zg-border, --zg-primary)", () => {
      const cssPath = path.resolve(__dirname, "../../src/index.css");
      const cssContent = fs.readFileSync(cssPath, "utf8");

      expect(cssContent).toContain("--zg-primary: #006b3c;");
      expect(cssContent).toContain("--zg-surface: #ffffff;");
      expect(cssContent).toContain("--zg-border: #e2e8f0;");
      expect(cssContent).toContain("--zg-amber: #d97706;");
      expect(cssContent).toContain("--zg-action-followup-bg: #fff7ed;");
      expect(cssContent).toContain("--zg-action-followup-border: #fdba74;");
    });

    it("verifies dashboard metric card class applies Zen Green CSS tokens", async () => {
      vi.mocked(api.fetchRequesterDashboard).mockResolvedValueOnce({
        metrics: {
          totalOpen: 5,
          waitingForRequester: 2,
          recentlyUpdated: 3,
          recentlyResolved: 7,
        },
        recentTickets: [],
      });

      render(<RequesterDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId("metric-card-total-open")).toBeInTheDocument();
      });

      const totalOpenCard = screen.getByTestId("metric-card-total-open");
      expect(totalOpenCard.classList.contains("zg-metric-card")).toBe(true);

      const waitingCard = screen.getByTestId("metric-card-waiting");
      expect(waitingCard.classList.contains("zg-metric-card")).toBe(true);
      expect(waitingCard.classList.contains("alert-amber")).toBe(true);
    });

    it("verifies zero raw hardcoded hex colors on metric card titles and values", async () => {
      vi.mocked(api.fetchRequesterDashboard).mockResolvedValueOnce({
        metrics: {
          totalOpen: 1,
          waitingForRequester: 1,
          recentlyUpdated: 1,
          recentlyResolved: 1,
        },
        recentTickets: [],
      });

      render(<RequesterDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId("metric-card-total-open")).toBeInTheDocument();
      });

      const cardTitle = screen.getByTestId("metric-card-total-open").querySelector(".zg-metric-card-title");
      const cardValue = screen.getByTestId("metric-value-total-open");

      expect(cardTitle).toBeInTheDocument();
      expect(cardValue).toBeInTheDocument();
      expect(cardTitle?.classList.contains("zg-metric-card-title")).toBe(true);
      expect(cardValue.classList.contains("zg-metric-card-value")).toBe(true);

      // Verify all metric cards and their child elements contain zero raw hardcoded hex styles
      const cardIds = [
        "metric-card-total-open",
        "metric-card-waiting",
        "metric-card-recently-updated",
        "metric-card-recently-resolved",
      ];

      for (const cardId of cardIds) {
        const card = screen.getByTestId(cardId);
        const allElements = [card, ...Array.from(card.querySelectorAll("*"))];
        for (const el of allElements) {
          const styleAttr = el.getAttribute("style") || "";
          // Any hex colour (# followed by 3-8 hex characters) must only appear within a var(...) fallback
          const hexMatches = styleAttr.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
          for (const hex of hexMatches) {
            expect(styleAttr).toContain("var(");
          }
        }
      }
    });
  });

  describe("STYLE-02: Follow-Up Required Badge Adopts Amber Tokens (AC-19)", () => {
    it("verifies follow-up badge renders with amber background and border design tokens", () => {
      const mockActions = [
        {
          id: 1,
          ticketId: 10,
          actionDateTime: "2026-10-02T10:00:00.000Z",
          description: "Diagnosed port flapping",
          result: "Identified bad transceiver",
          performedById: 2,
          performedBy: {
            id: 2,
            fullName: "Piti Srisongkram",
            role: "IT_STAFF" as const,
            email: "piti@email.com",
          },
          followUpRequired: true,
          followUpNote: "Order replacement optic",
          attachmentNotes: null,
          createdAt: "2026-10-02T10:05:00.000Z",
          updatedAt: "2026-10-02T10:05:00.000Z",
        },
      ];

      render(
        <ActionsTakenSection
          ticketId={10}
          actions={mockActions}
          readOnly={false}
          currentUserName="Piti Srisongkram"
        />
      );

      // Verify the follow-up container uses amber background and border tokens
      const followupContainer = screen.getByTestId("action-followup-container-1");
      expect(followupContainer).toBeInTheDocument();
      const containerStyle = followupContainer.getAttribute("style") || "";
      expect(containerStyle).toContain("var(--zg-action-followup-bg, #fff7ed)");
      expect(containerStyle).toContain("var(--zg-action-followup-border, #fdba74)");

      // Verify the badge text and its amber token
      const followupBadge = screen.getByTestId("followup-badge-1");
      expect(followupBadge).toBeInTheDocument();
      expect(followupBadge).toHaveTextContent("Follow-Up Required");
      const badgeStyle = followupBadge.getAttribute("style") || "";
      expect(badgeStyle).toContain("var(--zg-amber, #d97706)");
    });

    it("verifies staff dashboard recent action follow-up badge uses .zg-badge-followup class", async () => {
      vi.mocked(api.getMeApi).mockResolvedValueOnce({
        user: {
          id: 2,
          fullName: "Piti Staff",
          email: "piti@toktickit.com",
          role: "IT_STAFF",
          mustChangePassword: false,
        },
      });

      vi.mocked(api.fetchStaffDashboard).mockResolvedValueOnce({
        metrics: {
          unassignedTickets: 1,
          myAssignedTickets: 1,
          waitingForRequester: 0,
          urgentTickets: 0,
          ticketsByStatus: {
            NEW: 1,
            OPEN: 0,
            IN_PROGRESS: 0,
            WAITING_FOR_REQUESTER: 0,
            RESOLVED: 0,
            CLOSED: 0,
            REOPENED: 0,
            CANCELLED: 0,
          },
          ticketsByPriority: {
            LOW: 1,
            MEDIUM: 0,
            HIGH: 0,
            URGENT: 0,
          },
        },
        recentActions: [
          {
            id: 55,
            ticketId: 10,
            ticketNumber: "TKT-2026-000010",
            actionDateTime: "2026-10-02T10:00:00.000Z",
            description: "Inspected hardware",
            result: "Done",
            followUpRequired: true,
          },
        ],
        urgentAttentionTickets: [],
      });

      render(
        <AuthProvider>
          <StaffDashboard />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("action-followup-badge-55")).toBeInTheDocument();
      });

      const badge = screen.getByTestId("action-followup-badge-55");
      expect(badge).toHaveTextContent("Follow-Up Required");
      expect(badge.classList.contains("zg-badge-followup")).toBe(true);
    });
  });
});
