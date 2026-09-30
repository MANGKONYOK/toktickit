import { describe, it, expect } from "vitest";
import { TicketStatus } from "@prisma/client";
import {
  STATUS_TRANSITIONS,
  getAllowedTransitions,
  isValidStatusTransition,
  isTerminalStatus,
  isValidTicketStatus,
} from "../../src/utils/status-transition.js";

describe("8-State Ticket Status Transition Engine (UNIT-02 / AC-18, BR-14)", () => {
  describe("Valid Transitions per BR-14", () => {
    it("NEW allows transition only to OPEN and CANCELLED", () => {
      const allowed = getAllowedTransitions(TicketStatus.NEW);
      expect(allowed).toEqual([TicketStatus.OPEN, TicketStatus.CANCELLED]);
      expect(isValidStatusTransition(TicketStatus.NEW, TicketStatus.OPEN)).toBe(true);
      expect(isValidStatusTransition(TicketStatus.NEW, TicketStatus.CANCELLED)).toBe(true);
    });

    it("OPEN allows transition to IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, CANCELLED", () => {
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
    });

    it("IN_PROGRESS allows transition to WAITING_FOR_REQUESTER, RESOLVED, CANCELLED", () => {
      const allowed = getAllowedTransitions(TicketStatus.IN_PROGRESS);
      expect(allowed).toEqual([
        TicketStatus.WAITING_FOR_REQUESTER,
        TicketStatus.RESOLVED,
        TicketStatus.CANCELLED,
      ]);
      expect(isValidStatusTransition(TicketStatus.IN_PROGRESS, TicketStatus.WAITING_FOR_REQUESTER)).toBe(true);
      expect(isValidStatusTransition(TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED)).toBe(true);
      expect(isValidStatusTransition(TicketStatus.IN_PROGRESS, TicketStatus.CANCELLED)).toBe(true);
    });

    it("WAITING_FOR_REQUESTER allows transition to IN_PROGRESS, RESOLVED, CANCELLED", () => {
      const allowed = getAllowedTransitions(TicketStatus.WAITING_FOR_REQUESTER);
      expect(allowed).toEqual([
        TicketStatus.IN_PROGRESS,
        TicketStatus.RESOLVED,
        TicketStatus.CANCELLED,
      ]);
      expect(isValidStatusTransition(TicketStatus.WAITING_FOR_REQUESTER, TicketStatus.IN_PROGRESS)).toBe(true);
      expect(isValidStatusTransition(TicketStatus.WAITING_FOR_REQUESTER, TicketStatus.RESOLVED)).toBe(true);
      expect(isValidStatusTransition(TicketStatus.WAITING_FOR_REQUESTER, TicketStatus.CANCELLED)).toBe(true);
    });

    it("RESOLVED allows transition to CLOSED, REOPENED", () => {
      const allowed = getAllowedTransitions(TicketStatus.RESOLVED);
      expect(allowed).toEqual([TicketStatus.CLOSED, TicketStatus.REOPENED]);
      expect(isValidStatusTransition(TicketStatus.RESOLVED, TicketStatus.CLOSED)).toBe(true);
      expect(isValidStatusTransition(TicketStatus.RESOLVED, TicketStatus.REOPENED)).toBe(true);
    });

    it("REOPENED allows transition to IN_PROGRESS, RESOLVED, CANCELLED", () => {
      const allowed = getAllowedTransitions(TicketStatus.REOPENED);
      expect(allowed).toEqual([
        TicketStatus.IN_PROGRESS,
        TicketStatus.RESOLVED,
        TicketStatus.CANCELLED,
      ]);
      expect(isValidStatusTransition(TicketStatus.REOPENED, TicketStatus.IN_PROGRESS)).toBe(true);
      expect(isValidStatusTransition(TicketStatus.REOPENED, TicketStatus.RESOLVED)).toBe(true);
      expect(isValidStatusTransition(TicketStatus.REOPENED, TicketStatus.CANCELLED)).toBe(true);
    });
  });

  describe("Disallowed Transitions & Terminal States (AC-18, BR-14)", () => {
    it("rejects illegal skip from NEW directly to IN_PROGRESS", () => {
      expect(isValidStatusTransition(TicketStatus.NEW, TicketStatus.IN_PROGRESS)).toBe(false);
    });

    it("rejects illegal skip from NEW directly to RESOLVED or CLOSED", () => {
      expect(isValidStatusTransition(TicketStatus.NEW, TicketStatus.RESOLVED)).toBe(false);
      expect(isValidStatusTransition(TicketStatus.NEW, TicketStatus.CLOSED)).toBe(false);
    });

    it("rejects illegal backward transition from OPEN to NEW", () => {
      expect(isValidStatusTransition(TicketStatus.OPEN, TicketStatus.NEW)).toBe(false);
    });

    it("rejects illegal backward transition from IN_PROGRESS to OPEN or NEW", () => {
      expect(isValidStatusTransition(TicketStatus.IN_PROGRESS, TicketStatus.OPEN)).toBe(false);
      expect(isValidStatusTransition(TicketStatus.IN_PROGRESS, TicketStatus.NEW)).toBe(false);
    });

    it("rejects illegal skip from WAITING_FOR_REQUESTER to CLOSED", () => {
      expect(isValidStatusTransition(TicketStatus.WAITING_FOR_REQUESTER, TicketStatus.CLOSED)).toBe(false);
    });

    it("rejects transition to the exact same status (no-op)", () => {
      expect(isValidStatusTransition(TicketStatus.OPEN, TicketStatus.OPEN)).toBe(false);
      expect(isValidStatusTransition(TicketStatus.IN_PROGRESS, TicketStatus.IN_PROGRESS)).toBe(false);
    });

    it("CLOSED is a terminal state with zero permitted transitions", () => {
      expect(isTerminalStatus(TicketStatus.CLOSED)).toBe(true);
      expect(getAllowedTransitions(TicketStatus.CLOSED)).toEqual([]);
      for (const status of Object.values(TicketStatus)) {
        expect(isValidStatusTransition(TicketStatus.CLOSED, status)).toBe(false);
      }
    });

    it("CANCELLED is a terminal state with zero permitted transitions", () => {
      expect(isTerminalStatus(TicketStatus.CANCELLED)).toBe(true);
      expect(getAllowedTransitions(TicketStatus.CANCELLED)).toEqual([]);
      for (const status of Object.values(TicketStatus)) {
        expect(isValidStatusTransition(TicketStatus.CANCELLED, status)).toBe(false);
      }
    });
  });

  describe("Helper Utilities", () => {
    it("validates valid TicketStatus enum strings", () => {
      expect(isValidTicketStatus("NEW")).toBe(true);
      expect(isValidTicketStatus("OPEN")).toBe(true);
      expect(isValidTicketStatus("IN_PROGRESS")).toBe(true);
      expect(isValidTicketStatus("WAITING_FOR_REQUESTER")).toBe(true);
      expect(isValidTicketStatus("RESOLVED")).toBe(true);
      expect(isValidTicketStatus("CLOSED")).toBe(true);
      expect(isValidTicketStatus("REOPENED")).toBe(true);
      expect(isValidTicketStatus("CANCELLED")).toBe(true);
    });

    it("rejects invalid TicketStatus strings and non-string types", () => {
      expect(isValidTicketStatus("UNKNOWN")).toBe(false);
      expect(isValidTicketStatus("PENDING")).toBe(false);
      expect(isValidTicketStatus("")).toBe(false);
      expect(isValidTicketStatus(null)).toBe(false);
      expect(isValidTicketStatus(undefined)).toBe(false);
      expect(isValidTicketStatus(123)).toBe(false);
    });
  });
});
