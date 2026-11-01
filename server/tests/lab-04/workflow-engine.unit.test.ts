import { describe, it, expect } from "vitest";
import { TicketStatus } from "@prisma/client";
import {
  STATUS_TRANSITIONS,
  getAllowedTransitions,
  isValidStatusTransition,
  isTerminalStatus,
  isValidTicketStatus,
} from "../../src/utils/status-transition.js";

describe("Workflow Engine Unit Tests (UNIT-03 / BR-11 / AC-10)", () => {
  describe("Governed 8-State Transition Matrix Completeness", () => {
    it("defines transition rules for all 8 ticket statuses", () => {
      const allStatuses = Object.values(TicketStatus);
      expect(allStatuses).toHaveLength(8);

      for (const status of allStatuses) {
        expect(STATUS_TRANSITIONS).toHaveProperty(status);
        expect(Array.isArray(getAllowedTransitions(status))).toBe(true);
      }
    });

    it("NEW permits transitions only to OPEN and CANCELLED", () => {
      const allowed = getAllowedTransitions(TicketStatus.NEW);
      expect(allowed).toEqual([TicketStatus.OPEN, TicketStatus.CANCELLED]);
      expect(isValidStatusTransition(TicketStatus.NEW, TicketStatus.OPEN)).toBe(true);
      expect(isValidStatusTransition(TicketStatus.NEW, TicketStatus.CANCELLED)).toBe(true);

      // Rejects illegal jumps
      expect(isValidStatusTransition(TicketStatus.NEW, TicketStatus.RESOLVED)).toBe(false);
      expect(isValidStatusTransition(TicketStatus.NEW, TicketStatus.IN_PROGRESS)).toBe(false);
      expect(isValidStatusTransition(TicketStatus.NEW, TicketStatus.WAITING_FOR_REQUESTER)).toBe(false);
      expect(isValidStatusTransition(TicketStatus.NEW, TicketStatus.CLOSED)).toBe(false);
      expect(isValidStatusTransition(TicketStatus.NEW, TicketStatus.REOPENED)).toBe(false);
    });

    it("OPEN permits transitions to IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, CANCELLED", () => {
      const allowed = getAllowedTransitions(TicketStatus.OPEN);
      expect(allowed).toEqual([
        TicketStatus.IN_PROGRESS,
        TicketStatus.WAITING_FOR_REQUESTER,
        TicketStatus.RESOLVED,
        TicketStatus.CANCELLED,
      ]);
      expect(isValidStatusTransition(TicketStatus.OPEN, TicketStatus.IN_PROGRESS)).toBe(true);
      expect(isValidStatusTransition(TicketStatus.OPEN, TicketStatus.WAITING_FOR_REQUESTER)).toBe(true);
      expect(isValidStatusTransition(TicketStatus.OPEN, TicketStatus.RESOLVED)).toBe(true);
      expect(isValidStatusTransition(TicketStatus.OPEN, TicketStatus.CANCELLED)).toBe(true);

      // Rejects illegal jumps
      expect(isValidStatusTransition(TicketStatus.OPEN, TicketStatus.NEW)).toBe(false);
      expect(isValidStatusTransition(TicketStatus.OPEN, TicketStatus.CLOSED)).toBe(false);
      expect(isValidStatusTransition(TicketStatus.OPEN, TicketStatus.REOPENED)).toBe(false);
    });

    it("IN_PROGRESS permits transitions to WAITING_FOR_REQUESTER, RESOLVED, CANCELLED", () => {
      const allowed = getAllowedTransitions(TicketStatus.IN_PROGRESS);
      expect(allowed).toEqual([
        TicketStatus.WAITING_FOR_REQUESTER,
        TicketStatus.RESOLVED,
        TicketStatus.CANCELLED,
      ]);
      expect(isValidStatusTransition(TicketStatus.IN_PROGRESS, TicketStatus.WAITING_FOR_REQUESTER)).toBe(true);
      expect(isValidStatusTransition(TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED)).toBe(true);
      expect(isValidStatusTransition(TicketStatus.IN_PROGRESS, TicketStatus.CANCELLED)).toBe(true);

      // Rejects illegal jumps
      expect(isValidStatusTransition(TicketStatus.IN_PROGRESS, TicketStatus.NEW)).toBe(false);
      expect(isValidStatusTransition(TicketStatus.IN_PROGRESS, TicketStatus.OPEN)).toBe(false);
      expect(isValidStatusTransition(TicketStatus.IN_PROGRESS, TicketStatus.CLOSED)).toBe(false);
      expect(isValidStatusTransition(TicketStatus.IN_PROGRESS, TicketStatus.REOPENED)).toBe(false);
    });

    it("WAITING_FOR_REQUESTER permits transitions to IN_PROGRESS, RESOLVED, CANCELLED", () => {
      const allowed = getAllowedTransitions(TicketStatus.WAITING_FOR_REQUESTER);
      expect(allowed).toEqual([
        TicketStatus.IN_PROGRESS,
        TicketStatus.RESOLVED,
        TicketStatus.CANCELLED,
      ]);
      expect(isValidStatusTransition(TicketStatus.WAITING_FOR_REQUESTER, TicketStatus.IN_PROGRESS)).toBe(true);
      expect(isValidStatusTransition(TicketStatus.WAITING_FOR_REQUESTER, TicketStatus.RESOLVED)).toBe(true);
      expect(isValidStatusTransition(TicketStatus.WAITING_FOR_REQUESTER, TicketStatus.CANCELLED)).toBe(true);

      // Rejects illegal jumps
      expect(isValidStatusTransition(TicketStatus.WAITING_FOR_REQUESTER, TicketStatus.NEW)).toBe(false);
      expect(isValidStatusTransition(TicketStatus.WAITING_FOR_REQUESTER, TicketStatus.OPEN)).toBe(false);
      expect(isValidStatusTransition(TicketStatus.WAITING_FOR_REQUESTER, TicketStatus.CLOSED)).toBe(false);
      expect(isValidStatusTransition(TicketStatus.WAITING_FOR_REQUESTER, TicketStatus.REOPENED)).toBe(false);
    });

    it("RESOLVED permits transitions only to CLOSED and REOPENED", () => {
      const allowed = getAllowedTransitions(TicketStatus.RESOLVED);
      expect(allowed).toEqual([TicketStatus.CLOSED, TicketStatus.REOPENED]);
      expect(isValidStatusTransition(TicketStatus.RESOLVED, TicketStatus.CLOSED)).toBe(true);
      expect(isValidStatusTransition(TicketStatus.RESOLVED, TicketStatus.REOPENED)).toBe(true);

      // Rejects illegal jumps
      expect(isValidStatusTransition(TicketStatus.RESOLVED, TicketStatus.NEW)).toBe(false);
      expect(isValidStatusTransition(TicketStatus.RESOLVED, TicketStatus.OPEN)).toBe(false);
      expect(isValidStatusTransition(TicketStatus.RESOLVED, TicketStatus.IN_PROGRESS)).toBe(false);
      expect(isValidStatusTransition(TicketStatus.RESOLVED, TicketStatus.WAITING_FOR_REQUESTER)).toBe(false);
      expect(isValidStatusTransition(TicketStatus.RESOLVED, TicketStatus.CANCELLED)).toBe(false);
    });

    it("REOPENED permits transitions to IN_PROGRESS, RESOLVED, CANCELLED", () => {
      const allowed = getAllowedTransitions(TicketStatus.REOPENED);
      expect(allowed).toEqual([
        TicketStatus.IN_PROGRESS,
        TicketStatus.RESOLVED,
        TicketStatus.CANCELLED,
      ]);
      expect(isValidStatusTransition(TicketStatus.REOPENED, TicketStatus.IN_PROGRESS)).toBe(true);
      expect(isValidStatusTransition(TicketStatus.REOPENED, TicketStatus.RESOLVED)).toBe(true);
      expect(isValidStatusTransition(TicketStatus.REOPENED, TicketStatus.CANCELLED)).toBe(true);

      // Rejects illegal jumps
      expect(isValidStatusTransition(TicketStatus.REOPENED, TicketStatus.NEW)).toBe(false);
      expect(isValidStatusTransition(TicketStatus.REOPENED, TicketStatus.OPEN)).toBe(false);
      expect(isValidStatusTransition(TicketStatus.REOPENED, TicketStatus.WAITING_FOR_REQUESTER)).toBe(false);
      expect(isValidStatusTransition(TicketStatus.REOPENED, TicketStatus.CLOSED)).toBe(false);
    });
  });

  describe("Terminal State Mutability Locks (BR-12 / AC-12)", () => {
    it("CLOSED has no permitted transitions and is recognized as terminal", () => {
      expect(getAllowedTransitions(TicketStatus.CLOSED)).toEqual([]);
      expect(isTerminalStatus(TicketStatus.CLOSED)).toBe(true);

      for (const target of Object.values(TicketStatus)) {
        expect(isValidStatusTransition(TicketStatus.CLOSED, target)).toBe(false);
      }
    });

    it("CANCELLED has no permitted transitions and is recognized as terminal", () => {
      expect(getAllowedTransitions(TicketStatus.CANCELLED)).toEqual([]);
      expect(isTerminalStatus(TicketStatus.CANCELLED)).toBe(true);

      for (const target of Object.values(TicketStatus)) {
        expect(isValidStatusTransition(TicketStatus.CANCELLED, target)).toBe(false);
      }
    });

    it("active statuses are not marked as terminal", () => {
      const activeStatuses = [
        TicketStatus.NEW,
        TicketStatus.OPEN,
        TicketStatus.IN_PROGRESS,
        TicketStatus.WAITING_FOR_REQUESTER,
        TicketStatus.RESOLVED,
        TicketStatus.REOPENED,
      ];

      for (const status of activeStatuses) {
        expect(isTerminalStatus(status)).toBe(false);
      }
    });
  });

  describe("Self-Transition Disallowance", () => {
    it("disallows transitioning to the exact same status", () => {
      for (const status of Object.values(TicketStatus)) {
        expect(isValidStatusTransition(status, status)).toBe(false);
      }
    });
  });

  describe("TicketStatus Enum Validation", () => {
    it("recognizes valid TicketStatus values", () => {
      for (const status of Object.values(TicketStatus)) {
        expect(isValidTicketStatus(status)).toBe(true);
      }
    });

    it("rejects invalid or unknown status strings and non-string inputs", () => {
      expect(isValidTicketStatus("INVALID")).toBe(false);
      expect(isValidTicketStatus("open")).toBe(false); // case-sensitive
      expect(isValidTicketStatus("PENDING")).toBe(false);
      expect(isValidTicketStatus("")).toBe(false);
      expect(isValidTicketStatus(null)).toBe(false);
      expect(isValidTicketStatus(undefined)).toBe(false);
      expect(isValidTicketStatus(123)).toBe(false);
      expect(isValidTicketStatus({})).toBe(false);
    });
  });
});
