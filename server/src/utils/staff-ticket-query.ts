export const ALLOWED_STAFF_SORT_FIELDS = [
  "createdAt",
  "ticketNumber",
  "summary",
  "priority",
  "itPriority",
  "status",
  "updatedAt",
] as const;

export type StaffSortField = (typeof ALLOWED_STAFF_SORT_FIELDS)[number];
export type SortOrder = "asc" | "desc";
export type AssignmentFilter = "all" | "unassigned" | "me";

export interface ParsedStaffTicketQueryParams {
  search?: string;
  categoryId?: number;
  categoryName?: string;
  itPriority?: string;
  status?: string;
  assigned: AssignmentFilter;
  sortBy: StaffSortField;
  sortOrder: SortOrder;
  page: number;
  limit: number;
}

export interface StaffQueryParseResult {
  isValid: boolean;
  errors: Record<string, string>;
  params?: ParsedStaffTicketQueryParams;
}

const VALID_PRIORITIES = new Set(["LOW", "MEDIUM", "HIGH", "URGENT"]);
const VALID_STATUSES = new Set([
  "NEW",
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_REQUESTER",
  "RESOLVED",
  "CLOSED",
  "REOPENED",
  "CANCELLED",
]);
const VALID_ASSIGNMENTS = new Set(["all", "unassigned", "me"]);

export function parseStaffTicketQueryParams(
  query: Record<string, any>
): StaffQueryParseResult {
  const errors: Record<string, string> = {};

  // Search keyword (case-insensitive substring on ticketNumber or summary)
  let search: string | undefined;
  if (typeof query.search === "string" && query.search.trim().length > 0) {
    search = query.search.trim();
  }

  // Category filter: support categoryId (number) or category (id or name)
  let categoryId: number | undefined;
  let categoryName: string | undefined;
  const rawCat = query.categoryId !== undefined ? query.categoryId : query.category;
  if (rawCat !== undefined && rawCat !== null && String(rawCat).trim() !== "") {
    const parsedCat = Number(rawCat);
    if (Number.isInteger(parsedCat) && parsedCat > 0) {
      categoryId = parsedCat;
    } else if (typeof rawCat === "string" && rawCat.trim().length > 0) {
      categoryName = rawCat.trim();
    }
  }

  // Priority filter (filters itPriority per api-spec §5.1)
  let itPriority: string | undefined;
  const rawPriority = query.priority || query.itPriority;
  if (rawPriority) {
    const p = String(rawPriority).toUpperCase();
    if (!VALID_PRIORITIES.has(p)) {
      errors.priority = `priority must be one of: ${Array.from(VALID_PRIORITIES).join(", ")}`;
    } else {
      itPriority = p;
    }
  }

  // Status filter (8 permitted statuses)
  let status: string | undefined;
  if (query.status) {
    const s = String(query.status).toUpperCase();
    if (!VALID_STATUSES.has(s)) {
      errors.status = `status must be one of: ${Array.from(VALID_STATUSES).join(", ")}`;
    } else {
      status = s;
    }
  }

  // Assignment filter: 'all', 'unassigned', 'me'
  let assigned: AssignmentFilter = "all";
  if (query.assigned) {
    const a = String(query.assigned).toLowerCase();
    if (!VALID_ASSIGNMENTS.has(a)) {
      errors.assigned = "assigned must be one of: all, unassigned, me";
    } else {
      assigned = a as AssignmentFilter;
    }
  }

  // Sorting
  let sortBy: StaffSortField = "createdAt";
  if (query.sortBy) {
    if (ALLOWED_STAFF_SORT_FIELDS.includes(query.sortBy as StaffSortField)) {
      sortBy = query.sortBy as StaffSortField;
    } else {
      errors.sortBy = `sortBy must be one of: ${ALLOWED_STAFF_SORT_FIELDS.join(", ")}`;
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

  // Pagination (page >= 1, limit 1..50, default 10)
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
  const rawLimit = query.pageSize !== undefined ? query.pageSize : query.limit;
  if (rawLimit !== undefined && rawLimit !== "") {
    const l = Number(rawLimit);
    if (!Number.isInteger(l) || l < 1 || l > 50) {
      errors.pageSize = "pageSize must be an integer between 1 and 50";
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
      search,
      categoryId,
      categoryName,
      itPriority,
      status,
      assigned,
      sortBy,
      sortOrder,
      page,
      limit,
    },
  };
}
