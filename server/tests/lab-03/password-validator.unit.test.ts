import { describe, it, expect } from "vitest";
import { validatePasswordComplexity } from "../../src/utils/password-validator.js";

describe("Password Complexity Validator (UNIT-01 / AC-05, BR-02)", () => {
  it("accepts a strong password satisfying all 5 criteria", () => {
    const result = validatePasswordComplexity("Password@2026");
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects password shorter than 8 characters", () => {
    const result = validatePasswordComplexity("Pass@1");
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Password must be at least 8 characters long");
  });

  it("rejects password without an uppercase letter", () => {
    const result = validatePasswordComplexity("password@2026");
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Password must contain at least one uppercase letter");
  });

  it("rejects password without a lowercase letter", () => {
    const result = validatePasswordComplexity("PASSWORD@2026");
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Password must contain at least one lowercase letter");
  });

  it("rejects password without a digit", () => {
    const result = validatePasswordComplexity("Password@Special");
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Password must contain at least one number");
  });

  it("rejects password without a permitted special character", () => {
    const result = validatePasswordComplexity("Password2026");
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Password must contain at least one special character (@$!%*?&#^_-)");
  });

  it("collects multiple validation errors when multiple rules are violated", () => {
    const result = validatePasswordComplexity("weak");
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });

  it("supports all permitted special characters: @$!%*?&#^_-", () => {
    const specials = ["@", "$", "!", "%", "*", "?", "&", "#", "^", "_", "-"];
    for (const char of specials) {
      const result = validatePasswordComplexity(`Secure1${char}xyz`);
      expect(result.isValid).toBe(true);
    }
  });
});
