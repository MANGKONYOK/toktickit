/**
 * Password complexity validator enforcing BR-02 and AC-05:
 * - At least 8 characters long
 * - At least one uppercase letter (A-Z)
 * - At least one lowercase letter (a-z)
 * - At least one numeric digit (0-9)
 * - At least one special symbol from: @$!%*?&#^_-
 */
export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

export const PERMITTED_SPECIAL_CHARACTERS = "@$!%*?&#^_-" as const;

export function validatePasswordComplexity(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (!password || typeof password !== "string") {
    return {
      isValid: false,
      errors: ["Password is required and must be a string"],
    };
  }

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  if (!/[@$!%*?&#^_\-]/.test(password)) {
    errors.push("Password must contain at least one special character (@$!%*?&#^_-)");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
