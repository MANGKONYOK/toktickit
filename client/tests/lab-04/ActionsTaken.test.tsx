import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ActionsTakenSection from "../../src/components/ActionsTakenSection.js";
import { ActionTaken } from "../../src/api.js";
import * as api from "../../src/api.js";

const mockActions: ActionTaken[] = [
  {
    id: 1,
    ticketId: 10,
    actionDateTime: "2026-10-02T09:30:00.000Z",
    description: "Inspected router interface error counters",
    result: "Found CRC alignment errors on port ge-0/0/1",
    performedById: 2,
    performedBy: {
      id: 2,
      fullName: "Piti Srisongkram",
      role: "IT_STAFF",
      email: "piti.srisongkram@gmail.com",
    },
    followUpRequired: true,
    followUpNote: "Replace SFP optic transceiver tomorrow morning",
    attachmentNotes: "Interface diagnostic output attached",
    createdAt: "2026-10-02T09:35:00.000Z",
    updatedAt: "2026-10-02T09:35:00.000Z",
  },
  {
    id: 2,
    ticketId: 10,
    actionDateTime: "2026-10-02T11:00:00.000Z",
    description: "Swapped optic transceiver and re-seated patch fiber",
    result: "Link clean, 0 CRC errors over 30 minute test window",
    performedById: 3,
    performedBy: {
      id: 3,
      fullName: "Somchai Jaidee",
      role: "IT_STAFF",
      email: "somchai.it@email.com",
    },
    followUpRequired: false,
    followUpNote: null,
    attachmentNotes: null,
    createdAt: "2026-10-02T11:05:00.000Z",
    updatedAt: "2026-10-02T11:05:00.000Z",
  },
];

describe("ActionsTaken Component Tests (UI-01, UI-02, STYLE-01, STYLE-02)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("UI-01: Timeline and Card Rendering (AC-19)", () => {
    it("renders action cards with performer, date, description, and result", () => {
      render(
        <ActionsTakenSection
          ticketId={10}
          actions={mockActions}
          readOnly={false}
          currentUserName="Piti Srisongkram"
        />
      );

      // Verify header and count badge
      expect(screen.getByText("Actions Taken")).toBeInTheDocument();
      expect(screen.getByTestId("actions-count-badge")).toHaveTextContent("2");

      // Verify performers
      expect(screen.getByTestId("action-performer-1")).toHaveTextContent(
        "Piti Srisongkram"
      );
      expect(screen.getByTestId("action-performer-2")).toHaveTextContent(
        "Somchai Jaidee"
      );

      // Verify descriptions and results
      expect(screen.getByTestId("action-desc-1")).toHaveTextContent(
        "Inspected router interface error counters"
      );
      expect(screen.getByTestId("action-result-1")).toHaveTextContent(
        "Found CRC alignment errors on port ge-0/0/1"
      );

      // Verify attachment note
      expect(screen.getByTestId("action-attachment-notes-1")).toHaveTextContent(
        "Interface diagnostic output attached"
      );
    });

    it("renders empty state notice when actions array is empty", () => {
      render(
        <ActionsTakenSection
          ticketId={10}
          actions={[]}
          readOnly={false}
          currentUserName="Piti Srisongkram"
        />
      );

      expect(screen.getByTestId("actions-count-badge")).toHaveTextContent("0");
      expect(screen.getByTestId("empty-actions-notice")).toHaveTextContent(
        "No actions recorded yet for this ticket."
      );
    });
  });

  describe("UI-02: Read-Only Seam for Requesters (AC-02)", () => {
    it("hides '+ Record Action' and 'Edit' buttons when readOnly is true", () => {
      render(
        <ActionsTakenSection
          ticketId={10}
          actions={mockActions}
          readOnly={true}
        />
      );

      // Verify '+ Record Action' button is NOT rendered
      expect(
        screen.queryByTestId("record-action-button")
      ).not.toBeInTheDocument();

      // Verify edit buttons are NOT rendered
      expect(screen.queryByTestId("edit-action-btn-1")).not.toBeInTheDocument();
      expect(screen.queryByTestId("edit-action-btn-2")).not.toBeInTheDocument();

      // Actions are still readable
      expect(screen.getByTestId("action-desc-1")).toBeInTheDocument();
      expect(screen.getByTestId("action-desc-2")).toBeInTheDocument();
    });
  });

  describe("STYLE-01 & STYLE-02: Design Tokens and Badge Styling", () => {
    it("STYLE-02: renders amber follow-up container when followUpRequired is true", () => {
      render(
        <ActionsTakenSection
          ticketId={10}
          actions={mockActions}
          readOnly={false}
        />
      );

      const followUpContainer = screen.getByTestId(
        "action-followup-container-1"
      );
      expect(followUpContainer).toBeInTheDocument();
      expect(screen.getByTestId("followup-badge-1")).toHaveTextContent(
        /follow-up required/i
      );
      expect(screen.getByTestId("action-followup-note-1")).toHaveTextContent(
        "Replace SFP optic transceiver tomorrow morning"
      );

      // Action 2 has no follow-up needed
      expect(screen.getByTestId("followup-none-badge-2")).toHaveTextContent(
        "No follow-up needed"
      );
    });
  });

  describe("Record Action Modal Workflow & Dynamic Validation (BR-04)", () => {
    it("opens modal, toggles follow-up, and submits a new action taken", async () => {
      const user = userEvent.setup();
      const mockCreateAction = vi
        .spyOn(api, "createTicketAction")
        .mockResolvedValueOnce({
          action: {
            id: 3,
            ticketId: 10,
            actionDateTime: "2026-10-02T12:00:00.000Z",
            description: "Installed security patch KB500123",
            result: "Patch installed, zero vulnerabilities reported",
            performedById: 2,
            performedBy: {
              id: 2,
              fullName: "Piti Srisongkram",
              role: "IT_STAFF",
            },
            followUpRequired: true,
            followUpNote: "Re-run Nessus scan after 24 hours",
            attachmentNotes: null,
            createdAt: "2026-10-02T12:05:00.000Z",
            updatedAt: "2026-10-02T12:05:00.000Z",
          },
          message: "Action recorded",
        });

      const onAdded = vi.fn();

      render(
        <ActionsTakenSection
          ticketId={10}
          actions={mockActions}
          readOnly={false}
          currentUserName="Piti Srisongkram"
          onActionAdded={onAdded}
        />
      );

      // Open modal
      await user.click(screen.getByTestId("record-action-button"));
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Record Action Taken")).toBeInTheDocument();

      // Performer name is pre-filled read-only
      expect(screen.getByDisplayValue("Piti Srisongkram")).toBeInTheDocument();

      // Fill description and result
      await user.type(
        screen.getByTestId("action-description-input"),
        "Installed security patch KB500123"
      );
      await user.type(
        screen.getByTestId("action-result-input"),
        "Patch installed, zero vulnerabilities reported"
      );

      // Toggle followUpRequired checkbox
      expect(
        screen.queryByTestId("followup-note-input")
      ).not.toBeInTheDocument();
      await user.click(screen.getByTestId("followup-required-checkbox"));

      // Follow-up note field should now be dynamically visible
      expect(screen.getByTestId("followup-note-input")).toBeInTheDocument();
      await user.type(
        screen.getByTestId("followup-note-input"),
        "Re-run Nessus scan after 24 hours"
      );

      // Submit
      await user.click(screen.getByTestId("submit-action-button"));

      await waitFor(() => {
        expect(mockCreateAction).toHaveBeenCalledWith(
          10,
          expect.objectContaining({
            description: "Installed security patch KB500123",
            result: "Patch installed, zero vulnerabilities reported",
            followUpRequired: true,
            followUpNote: "Re-run Nessus scan after 24 hours",
          })
        );
        expect(onAdded).toHaveBeenCalled();
      });
    });

    it("displays validation error when followUpRequired is checked but followUpNote is blank", async () => {
      const user = userEvent.setup();

      render(
        <ActionsTakenSection
          ticketId={10}
          actions={mockActions}
          readOnly={false}
          currentUserName="Piti Srisongkram"
        />
      );

      await user.click(screen.getByTestId("record-action-button"));

      await user.type(
        screen.getByTestId("action-description-input"),
        "Checked disk health"
      );
      await user.type(
        screen.getByTestId("action-result-input"),
        "SMART status passed"
      );

      // Check follow-up required without filling follow-up note
      await user.click(screen.getByTestId("followup-required-checkbox"));
      await user.click(screen.getByTestId("submit-action-button"));

      expect(screen.getByTestId("error-followup-note")).toHaveTextContent(
        "Follow-up note is required when follow-up is needed"
      );
    });

    it("displays terminal locked notice when ticket is closed", () => {
      render(
        <ActionsTakenSection
          ticketId={10}
          actions={mockActions}
          readOnly={false}
          isTicketTerminal={true}
        />
      );

      expect(screen.getByTestId("terminal-lock-banner")).toBeInTheDocument();
      expect(
        screen.queryByTestId("record-action-button")
      ).not.toBeInTheDocument();
    });
  });
});
