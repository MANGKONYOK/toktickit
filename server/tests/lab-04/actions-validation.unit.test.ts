import { describe, it, expect } from "vitest";
import {
  validateActionTakenInput,
  isTerminalTicketStatus,
} from "../../src/utils/action-validation.js";

describe("ActionTaken Validation Unit Tests", () => {
  describe("UNIT-01: Conditional Follow-up Note Validation (BR-04, AC-04)", () => {
    it("rejects when followUpRequired is true but followUpNote is undefined", () => {
      const res = validateActionTakenInput({
        description: "Checked network cable and switch port",
        result: "Port link light is green",
        followUpRequired: true,
      });

      expect(res.isValid).toBe(false);
      expect(res.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: "followUpNote",
            message: expect.stringContaining("Follow-up note is required"),
          }),
        ])
      );
    });

    it("rejects when followUpRequired is true but followUpNote is empty or whitespace", () => {
      const res = validateActionTakenInput({
        description: "Replaced toner cartridge",
        result: "Printed test page cleanly",
        followUpRequired: true,
        followUpNote: "   ",
      });

      expect(res.isValid).toBe(false);
      expect(res.errors[0].field).toBe("followUpNote");
    });

    it("accepts when followUpRequired is true and followUpNote is valid (AC-01)", () => {
      const res = validateActionTakenInput({
        description: "Installed firmware update on printer",
        result: "Device rebooted with firmware v2.4",
        followUpRequired: true,
        followUpNote: "Verify user can print double-sided tomorrow morning",
      });

      expect(res.isValid).toBe(true);
      expect(res.errors).toHaveLength(0);
      expect(res.data?.followUpRequired).toBe(true);
      expect(res.data?.followUpNote).toBe(
        "Verify user can print double-sided tomorrow morning"
      );
    });

    it("accepts when followUpRequired is false and followUpNote is omitted (AC-05)", () => {
      const res = validateActionTakenInput({
        description: "Reset active directory password",
        result: "User logged in successfully",
        followUpRequired: false,
      });

      expect(res.isValid).toBe(true);
      expect(res.errors).toHaveLength(0);
      expect(res.data?.followUpRequired).toBe(false);
      expect(res.data?.followUpNote).toBeNull();
    });

    it("rejects when followUpNote exceeds 1000 characters", () => {
      const res = validateActionTakenInput({
        description: "Diagnosed overheating issue",
        result: "Cleaned heat sink",
        followUpRequired: true,
        followUpNote: "x".repeat(1001),
      });

      expect(res.isValid).toBe(false);
      expect(res.errors[0].field).toBe("followUpNote");
    });
  });

  describe("UNIT-02: Text Boundaries for Description and Result (BR-05, AC-01)", () => {
    it("rejects when description is empty or whitespace", () => {
      const res = validateActionTakenInput({
        description: "   ",
        result: "All tests passed",
      });

      expect(res.isValid).toBe(false);
      expect(res.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: "description" }),
        ])
      );
    });

    it("rejects when description exceeds 2000 characters", () => {
      const res = validateActionTakenInput({
        description: "a".repeat(2001),
        result: "Valid result",
      });

      expect(res.isValid).toBe(false);
      expect(res.errors[0].field).toBe("description");
    });

    it("rejects when result is empty or whitespace", () => {
      const res = validateActionTakenInput({
        description: "Replaced keyboard",
        result: "   ",
      });

      expect(res.isValid).toBe(false);
      expect(res.errors[0].field).toBe("result");
    });

    it("rejects when result exceeds 2000 characters", () => {
      const res = validateActionTakenInput({
        description: "Replaced keyboard",
        result: "b".repeat(2001),
      });

      expect(res.isValid).toBe(false);
      expect(res.errors[0].field).toBe("result");
    });

    it("accepts boundary values: exactly 1 char and exactly 2000 chars", () => {
      const res = validateActionTakenInput({
        description: "A",
        result: "B".repeat(2000),
      });

      expect(res.isValid).toBe(true);
      expect(res.data?.description).toBe("A");
      expect(res.data?.result.length).toBe(2000);
    });
  });

  describe("General Payload and Date Validation", () => {
    it("rejects null or non-object payloads", () => {
      expect(validateActionTakenInput(null).isValid).toBe(false);
      expect(validateActionTakenInput(undefined).isValid).toBe(false);
      expect(validateActionTakenInput("string").isValid).toBe(false);
      expect(validateActionTakenInput([]).isValid).toBe(false);
    });

    it("parses valid actionDateTime or defaults to current date", () => {
      const now = new Date();
      const resDefault = validateActionTakenInput({
        description: "Valid desc",
        result: "Valid result",
      });
      expect(resDefault.isValid).toBe(true);
      expect(resDefault.data?.actionDateTime.getTime()).toBeGreaterThanOrEqual(
        now.getTime() - 1000
      );

      const customDateStr = "2026-10-02T10:00:00.000Z";
      const resCustom = validateActionTakenInput({
        actionDateTime: customDateStr,
        description: "Valid desc",
        result: "Valid result",
      });
      expect(resCustom.isValid).toBe(true);
      expect(resCustom.data?.actionDateTime.toISOString()).toBe(customDateStr);
    });

    it("rejects invalid date string", () => {
      const res = validateActionTakenInput({
        actionDateTime: "not-a-valid-date",
        description: "Valid desc",
        result: "Valid result",
      });

      expect(res.isValid).toBe(false);
      expect(res.errors[0].field).toBe("actionDateTime");
    });

    it("trims and accepts valid attachmentNotes", () => {
      const res = validateActionTakenInput({
        description: "Valid desc",
        result: "Valid result",
        attachmentNotes: "  Refer to screenshot error_01.png  ",
      });

      expect(res.isValid).toBe(true);
      expect(res.data?.attachmentNotes).toBe("Refer to screenshot error_01.png");
    });
  });

  describe("Terminal State Checker (BR-12, FLOW-04)", () => {
    it("identifies CLOSED and CANCELLED as terminal states", () => {
      expect(isTerminalTicketStatus("CLOSED")).toBe(true);
      expect(isTerminalTicketStatus("CANCELLED")).toBe(true);
    });

    it("identifies active states as non-terminal", () => {
      expect(isTerminalTicketStatus("NEW")).toBe(false);
      expect(isTerminalTicketStatus("OPEN")).toBe(false);
      expect(isTerminalTicketStatus("IN_PROGRESS")).toBe(false);
      expect(isTerminalTicketStatus("WAITING_FOR_REQUESTER")).toBe(false);
      expect(isTerminalTicketStatus("RESOLVED")).toBe(false);
      expect(isTerminalTicketStatus("REOPENED")).toBe(false);
    });
  });
});
