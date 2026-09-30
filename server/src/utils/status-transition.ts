import { TicketStatus } from "@prisma/client";

/**
 * Governed Ticket Status Transition Matrix per BR-14 (specification.md §5.3).
 *
 * NEW                  -> OPEN, CANCELLED
 * OPEN                 -> IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED, CANCELLED
 * IN_PROGRESS          -> WAITING_FOR_REQUESTER, RESOLVED, CANCELLED
 * WAITING_FOR_REQUESTER-> IN_PROGRESS, RESOLVED, CANCELLED
 * RESOLVED             -> CLOSED, REOPENED
 * REOPENED             -> IN_PROGRESS, RESOLVED, CANCELLED
 * CLOSED               -> [Terminal State — No transitions]
 * CANCELLED            -> [Terminal State — No transitions]
 */
export const STATUS_TRANSITIONS: Record<TicketStatus, readonly TicketStatus[]> = {
  [TicketStatus.NEW]: [TicketStatus.OPEN, TicketStatus.CANCELLED],
  [TicketStatus.OPEN]: [
    TicketStatus.IN_PROGRESS,
    TicketStatus.WAITING_FOR_REQUESTER,
    TicketStatus.RESOLVED,
    TicketStatus.CANCELLED,
  ],
  [TicketStatus.IN_PROGRESS]: [
    TicketStatus.WAITING_FOR_REQUESTER,
    TicketStatus.RESOLVED,
    TicketStatus.CANCELLED,
  ],
  [TicketStatus.WAITING_FOR_REQUESTER]: [
    TicketStatus.IN_PROGRESS,
    TicketStatus.RESOLVED,
    TicketStatus.CANCELLED,
  ],
  [TicketStatus.RESOLVED]: [TicketStatus.CLOSED, TicketStatus.REOPENED],
  [TicketStatus.REOPENED]: [
    TicketStatus.IN_PROGRESS,
    TicketStatus.RESOLVED,
    TicketStatus.CANCELLED,
  ],
  [TicketStatus.CLOSED]: [],
  [TicketStatus.CANCELLED]: [],
} as const;

/**
 * Retrieves the list of permitted next statuses for a given current status.
 */
export function getAllowedTransitions(currentStatus: TicketStatus): readonly TicketStatus[] {
  return STATUS_TRANSITIONS[currentStatus] || [];
}

/**
 * Validates whether transitioning from one status to another is permitted by BR-14.
 */
export function isValidStatusTransition(
  fromStatus: TicketStatus,
  toStatus: TicketStatus
): boolean {
  if (fromStatus === toStatus) {
    return false; // Transitioning to the exact same status is redundant and disallowed
  }
  const allowed = getAllowedTransitions(fromStatus);
  return allowed.includes(toStatus);
}

/**
 * Checks whether a given status is a terminal state.
 */
export function isTerminalStatus(status: TicketStatus): boolean {
  return status === TicketStatus.CLOSED || status === TicketStatus.CANCELLED;
}

/**
 * Type guard to verify whether a string is a valid TicketStatus enum value.
 */
export function isValidTicketStatus(value: unknown): value is TicketStatus {
  return typeof value === "string" && Object.values(TicketStatus).includes(value as TicketStatus);
}
