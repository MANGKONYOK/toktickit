import { describe, it, expect } from "vitest";
import { validateTicketInput } from "../../src/utils/ticket-validation.js";

describe("Ticket Input Validation (UNIT-02 / AC-05, BR-05)", () => {
  const validPayload = {
    requesterId: 1,
    categoryId: 2,
    relatedSystemId: 7,
    requestedPriority: "HIGH",
    summary: "Laptop screen flickering",
    description: "The laptop display flickers randomly when moved or adjusted.",
  };

  it("passes when all fields are valid and within bounds", () => {
    const result = validateTicketInput(validPayload);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("handles null, undefined, or array inputs safely with validation error", () => {
    const nullResult = validateTicketInput(null);
    expect(nullResult.isValid).toBe(false);
    expect(nullResult.errors[0].field).toBe("payload");

    const undefinedResult = validateTicketInput(undefined);
    expect(undefinedResult.isValid).toBe(false);

    const arrayResult = validateTicketInput([]);
    expect(arrayResult.isValid).toBe(false);
  });

  it("rejects summary shorter than 5 characters after trimming", () => {
    const result = validateTicketInput({
      ...validPayload,
      summary: "   abc  ",
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "summary",
          message: "Summary must be between 5 and 100 characters",
        }),
      ])
    );
  });

  it("rejects summary longer than 100 characters", () => {
    const longSummary = "a".repeat(101);
    const result = validateTicketInput({
      ...validPayload,
      summary: longSummary,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "summary" }),
      ])
    );
  });

  it("rejects description shorter than 10 characters after trimming", () => {
    const result = validateTicketInput({
      ...validPayload,
      description: "   short  ",
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "description",
          message: "Description must be between 10 and 2000 characters",
        }),
      ])
    );
  });

  it("rejects description longer than 2000 characters", () => {
    const longDescription = "a".repeat(2001);
    const result = validateTicketInput({
      ...validPayload,
      description: longDescription,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "description" }),
      ])
    );
  });

  it("rejects invalid requestedPriority enum value", () => {
    const result = validateTicketInput({
      ...validPayload,
      requestedPriority: "SUPER_URGENT",
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "requestedPriority" }),
      ])
    );
  });

  it("rejects missing or non-positive integer foreign keys", () => {
    const result = validateTicketInput({
      ...validPayload,
      requesterId: 0,
      categoryId: -1,
      relatedSystemId: "invalid" as any,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });
});