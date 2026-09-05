import type { PrismaClient } from "@prisma/client";

/**
 * Generates an atomic, sequential Ticket Number conforming to BR-01:
 * Format: `TKT-YYYY-NNNNNN` (e.g. `TKT-2026-000001`)
 *
 * Uses `TicketSequence` row per year to guarantee gap-free and race-free sequence increments.
 */
export async function generateTicketNumber(
  prisma: Pick<PrismaClient, "ticketSequence">,
  date: Date = new Date()
): Promise<string> {
  const year = date.getFullYear();

  const seq = await prisma.ticketSequence.upsert({
    where: { year },
    update: {
      lastSequence: { increment: 1 },
    },
    create: {
      year,
      lastSequence: 1,
    },
  });

  const paddedSequence = String(seq.lastSequence).padStart(6, "0");
  return `TKT-${year}-${paddedSequence}`;
}