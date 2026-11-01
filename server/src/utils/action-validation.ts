export interface FieldError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: FieldError[];
}

export interface ValidatedActionInput {
  actionDateTime: Date;
  description: string;
  result: string;
  followUpRequired: boolean;
  followUpNote: string | null;
  attachmentNotes: string | null;
}

export function validateActionTakenInput(input: any): ValidationResult & { data?: ValidatedActionInput } {
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

  // 1. actionDateTime validation (optional, defaults to now)
  let actionDateTime = new Date();
  if (input.actionDateTime !== undefined && input.actionDateTime !== null) {
    if (typeof input.actionDateTime !== "string" && !(input.actionDateTime instanceof Date)) {
      errors.push({
        field: "actionDateTime",
        message: "actionDateTime must be a valid ISO date-time string",
      });
    } else {
      const parsed = new Date(input.actionDateTime);
      if (isNaN(parsed.getTime())) {
        errors.push({
          field: "actionDateTime",
          message: "actionDateTime must be a valid date",
        });
      } else {
        actionDateTime = parsed;
      }
    }
  }

  // 2. description validation (required, 1..2000 chars after trim)
  let description = "";
  if (input.description === undefined || input.description === null || typeof input.description !== "string") {
    errors.push({
      field: "description",
      message: "Action description is required and must be a string",
    });
  } else {
    description = input.description.trim();
    if (description.length === 0 || description.length > 2000) {
      errors.push({
        field: "description",
        message: "Action description must be between 1 and 2000 characters",
      });
    }
  }

  // 3. result validation (required, 1..2000 chars after trim)
  let result = "";
  if (input.result === undefined || input.result === null || typeof input.result !== "string") {
    errors.push({
      field: "result",
      message: "Action result is required and must be a string",
    });
  } else {
    result = input.result.trim();
    if (result.length === 0 || result.length > 2000) {
      errors.push({
        field: "result",
        message: "Action result must be between 1 and 2000 characters",
      });
    }
  }

  // 4. followUpRequired validation (boolean, default false)
  let followUpRequired = false;
  if (input.followUpRequired !== undefined && input.followUpRequired !== null) {
    if (typeof input.followUpRequired !== "boolean") {
      errors.push({
        field: "followUpRequired",
        message: "followUpRequired must be a boolean",
      });
    } else {
      followUpRequired = input.followUpRequired;
    }
  }

  // 5. followUpNote validation (conditional: mandatory 1..1000 if followUpRequired is true)
  let followUpNote: string | null = null;
  if (followUpRequired) {
    if (
      input.followUpNote === undefined ||
      input.followUpNote === null ||
      typeof input.followUpNote !== "string" ||
      input.followUpNote.trim().length === 0
    ) {
      errors.push({
        field: "followUpNote",
        message: "Follow-up note is required when follow-up is needed and must be between 1 and 1000 characters",
      });
    } else {
      const trimmed = input.followUpNote.trim();
      if (trimmed.length > 1000) {
        errors.push({
          field: "followUpNote",
          message: "Follow-up note must not exceed 1000 characters",
        });
      } else {
        followUpNote = trimmed;
      }
    }
  } else if (input.followUpNote !== undefined && input.followUpNote !== null) {
    if (typeof input.followUpNote === "string") {
      const trimmed = input.followUpNote.trim();
      if (trimmed.length > 1000) {
        errors.push({
          field: "followUpNote",
          message: "Follow-up note must not exceed 1000 characters",
        });
      } else {
        followUpNote = trimmed.length > 0 ? trimmed : null;
      }
    }
  }

  // 6. attachmentNotes validation (optional, max 1000 chars)
  let attachmentNotes: string | null = null;
  if (input.attachmentNotes !== undefined && input.attachmentNotes !== null) {
    if (typeof input.attachmentNotes !== "string") {
      errors.push({
        field: "attachmentNotes",
        message: "attachmentNotes must be a string",
      });
    } else {
      const trimmed = input.attachmentNotes.trim();
      if (trimmed.length > 1000) {
        errors.push({
          field: "attachmentNotes",
          message: "attachmentNotes must not exceed 1000 characters",
        });
      } else {
        attachmentNotes = trimmed.length > 0 ? trimmed : null;
      }
    }
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      errors,
    };
  }

  return {
    isValid: true,
    errors: [],
    data: {
      actionDateTime,
      description,
      result,
      followUpRequired,
      followUpNote,
      attachmentNotes,
    },
  };
}

export function isTerminalTicketStatus(status: string): boolean {
  return status === "CLOSED" || status === "CANCELLED";
}
