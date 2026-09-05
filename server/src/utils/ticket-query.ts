export const ALLOWED_SORT_FIELDS = [
  "createdAt",
  "ticketNumber",
  "summary",
  "requestedPriority",
  "itPriority",
  "currentStatus",
] as const;

export type SortField = (typeof ALLOWED_SORT_FIELDS)[number];
export type SortOrder = "asc" | "desc";

export interface ParsedTicketQueryParams {
  requesterId: number;
  search?: string;
  categoryId?: number;
  requestedPriority?: string;
  itPriority?: string;
  status?: string;
  sortBy: SortField;
  sortOrder: SortOrder;
  page: number;
  limit: number;
}

export interface QueryParseResult {
  isValid: boolean;
  errors: Record<string, string>;
  params?: ParsedTicketQueryParams;
}

const VALID_PRIORITIES = new Set(["LOW", "MEDIUM", "HIGH", "URGENT"]);
const VALID_STATUSES = new Set(["NEW", "IN_PROGRESS", "RESOLVED", "CLOSED", "CANCELLED"]);

export function parseTicketQueryParams(
  query: Record<string, any>,
  headers: Record<string, any> = {}
): QueryParseResult {
  const errors: Record<string, string> = {};

  // Resolve requesterId: header identity takes absolute precedence to prevent query-param tenant spoofing (AC-03)
  const rawRequesterId = headers["x-requester-id"] ?? query.requesterId;
  if (rawRequesterId === undefined || rawRequesterId === null || rawRequesterId === "") {
    errors.requesterId = "requesterId is required";
  }

  const requesterId = Number(rawRequesterId);
  if (rawRequesterId !== undefined && rawRequesterId !== "" && (!Number.isInteger(requesterId) || requesterId <= 0)) {
    errors.requesterId = "requesterId must be a positive integer";
  }

  // Category ID filter
  let categoryId: number | undefined;
  if (query.categoryId !== undefined && query.categoryId !== "") {
    categoryId = Number(query.categoryId);
    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      errors.categoryId = "categoryId must be a positive integer";
    }
  }

  // Requested Priority filter
  let requestedPriority: string | undefined;
  if (query.requestedPriority) {
    const p = String(query.requestedPriority).toUpperCase();
    if (!VALID_PRIORITIES.has(p)) {
      errors.requestedPriority = `requestedPriority must be one of: ${Array.from(VALID_PRIORITIES).join(", ")}`;
    } else {
      requestedPriority = p;
    }
  }

  // IT Priority filter
  let itPriority: string | undefined;
  if (query.itPriority) {
    const p = String(query.itPriority).toUpperCase();
    if (!VALID_PRIORITIES.has(p)) {
      errors.itPriority = `itPriority must be one of: ${Array.from(VALID_PRIORITIES).join(", ")}`;
    } else {
      itPriority = p;
    }
  }

  // Status filter
  let status: string | undefined;
  if (query.status) {
    const s = String(query.status).toUpperCase();
    if (!VALID_STATUSES.has(s)) {
      errors.status = `status must be one of: ${Array.from(VALID_STATUSES).join(", ")}`;
    } else {
      status = s;
    }
  }

  // Search keyword (case-insensitive substring)
  let search: string | undefined;
  if (typeof query.search === "string" && query.search.trim().length > 0) {
    search = query.search.trim();
  }

  // Sorting
  let sortBy: SortField = "createdAt";
  if (query.sortBy) {
    if (ALLOWED_SORT_FIELDS.includes(query.sortBy as SortField)) {
      sortBy = query.sortBy as SortField;
    } else {
      errors.sortBy = `sortBy must be one of: ${ALLOWED_SORT_FIELDS.join(", ")}`;
    }
  }

  let sortOrder: SortOrder = "desc";
  if (query.sortOrder) {
    const lowerOrder = String(query.sortOrder).toLowerCase();
    if (lowerOrder === "asc" || lowerOrder === "desc") {
      sortOrder = lowerOrder;
    } else {
      errors.sortOrder = "sortOrder must be either 'asc' or 'desc'";
    }
  }

  // Pagination
  let page = 1;
  if (query.page !== undefined && query.page !== "") {
    const p = Number(query.page);
    if (!Number.isInteger(p) || p < 1) {
      errors.page = "page must be a positive integer >= 1";
    } else {
      page = p;
    }
  }

  let limit = 10;
  if (query.limit !== undefined && query.limit !== "") {
    const l = Number(query.limit);
    if (!Number.isInteger(l) || l < 1 || l > 50) {
      errors.limit = "limit must be an integer between 1 and 50";
    } else {
      limit = l;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: {},
    params: {
      requesterId,
      search,
      categoryId,
      requestedPriority,
      itPriority,
      status,
      sortBy,
      sortOrder,
      page,
      limit,
    },
  };
}
