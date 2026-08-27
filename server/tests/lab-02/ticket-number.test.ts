import { describe, it, expect, vi } from "vitest";
import { generateTicketNumber } from "../../src/utils/ticket-number.js";

describe("Ticket Number Generator (UNIT-01 / AC-01, BR-01)", () => {
  it("formats ticket number as TKT-YYYY-NNNNNN with 6-digit zero padding", async () => {
    let mockSequence = 0;
    const mockPrisma = {
      ticketSequence: {
        upsert: vi.fn().mockImplementation(async ({ create, update }: any) => {
          mockSequence += 1;
          return { year: 2026, lastSequence: mockSequence };
        }),
      },
    };

    const date2026 = new Date("2026-08-27T10:00:00Z");
    const ticketNum1 = await generateTicketNumber(mockPrisma as any, date2026);
    expect(ticketNum1).toBe("TKT-2026-000001");

    const ticketNum2 = await generateTicketNumber(mockPrisma as any, date2026);
    expect(ticketNum2).toBe("TKT-2026-000002");
  });

  it("handles annual sequence rollover correctly", async () => {
    const mockPrisma = {
      ticketSequence: {
        upsert: vi.fn().mockImplementation(async ({ where }: any) => {
          return { year: where.year, lastSequence: 42 };
        }),
      },
    };

    const date2027 = new Date("2027-01-01T00:00:00Z");
    const ticketNum = await generateTicketNumber(mockPrisma as any, date2027);
    expect(ticketNum).toBe("TKT-2027-000042");
  });
});