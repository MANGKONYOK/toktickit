export interface FieldError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: FieldError[];
}

export const VALID_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export type PriorityType = (typeof VALID_PRIORITIES)[number];

export function validateTicketInput(input: any): ValidationResult {
  // Guard against null, undefined, or non-object top-level input
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {
      isValid: false,
      errors: [
        {
          field: "payload",
          message: "Request body must be a valid JSON object",
        },
      ],
    };
  }

  const errors: FieldError[] = [];

  // 1. requesterId validation
  if (
    input.requesterId === undefined ||
    input.requesterId === null ||
    typeof input.requesterId !== "number" ||
    !Number.isInteger(input.requesterId) ||
    input.requesterId <= 0
  ) {
    errors.push({
      field: "requesterId",
      message: "A valid positive requesterId integer is required",
    });
  }

  // 2. categoryId validation
  if (
    input.categoryId === undefined ||
    input.categoryId === null ||
    typeof input.categoryId !== "number" ||
    !Number.isInteger(input.categoryId) ||
    input.categoryId <= 0
  ) {
    errors.push({
      field: "categoryId",
      message: "A valid positive categoryId integer is required",
    });
  }

  // 3. relatedSystemId validation
  if (
    input.relatedSystemId === undefined ||
    input.relatedSystemId === null ||
    typeof input.relatedSystemId !== "number" ||
    !Number.isInteger(input.relatedSystemId) ||
    input.relatedSystemId <= 0
  ) {
    errors.push({
      field: "relatedSystemId",
      message: "A valid positive relatedSystemId integer is required",
    });
  }

  // 4. requestedPriority validation (optional, defaults to MEDIUM)
  if (input.requestedPriority !== undefined && input.requestedPriority !== null) {
    if (
      typeof input.requestedPriority !== "string" ||
      !VALID_PRIORITIES.includes(input.requestedPriority as PriorityType)
    ) {
      errors.push({
        field: "requestedPriority",
        message: `Priority must be one of: ${VALID_PRIORITIES.join(", ")}`,
      });
    }
  }

  // 5. summary validation (5 to 100 chars after trimming)
  if (typeof input.summary !== "string") {
    errors.push({
      field: "summary",
      message: "Summary is required and must be a string",
    });
  } else {
    const trimmedSummary = input.summary.trim();
    if (trimmedSummary.length < 5 || trimmedSummary.length > 100) {
      errors.push({
        field: "summary",
        message: "Summary must be between 5 and 100 characters",
      });
    }
  }

  // 6. description validation (10 to 2,000 chars after trimming)
  if (typeof input.description !== "string") {
    errors.push({
      field: "description",
      message: "Description is required and must be a string",
    });
  } else {
    const trimmedDesc = input.description.trim();
    if (trimmedDesc.length < 10 || trimmedDesc.length > 2000) {
      errors.push({
        field: "description",
        message: "Description must be between 10 and 2000 characters",
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}