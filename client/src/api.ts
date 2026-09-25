const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TicketStatus =
  | "NEW"
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_FOR_REQUESTER"
  | "RESOLVED"
  | "CLOSED"
  | "REOPENED"
  | "CANCELLED";

export interface RequesterUser {
  id: number;
  fullName: string;
  email: string;
  department: string;
  isActive: boolean;
}

export interface Category {
  id: number;
  name: string;
  isActive?: boolean;
}

export interface RelatedSystem {
  id: number;
  name: string;
  description?: string | null;
  isActive?: boolean;
}

export interface Ticket {
  id: number;
  ticketNumber: string;
  requesterId: number;
  categoryId: number;
  relatedSystemId: number;
  requestedPriority: Priority;
  itPriority: Priority;
  currentStatus: TicketStatus;
  summary: string;
  description: string;
  ticketOwner: string;
  resolvedByRequester?: boolean;
  createdAt: string;
  updatedAt: string;
  category?: Category;
  relatedSystem?: RelatedSystem;
  requester?: RequesterUser;
}

export interface CreateTicketPayload {
  requesterId: number;
  categoryId: number;
  relatedSystemId: number;
  requestedPriority: Priority;
  summary: string;
  description: string;
}

export interface SystemStatus {
  online: boolean;
  categories: Category[];
}

export interface TicketQueryParams {
  requesterId?: number;
  search?: string;
  categoryId?: number;
  requestedPriority?: Priority;
  itPriority?: Priority;
  status?: TicketStatus;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface PaginatedTicketsResponse {
  tickets: Ticket[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface Attachment {
  id: number;
  ticketId: number;
  fileName: string;
  originalName?: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  removedAt?: string | null;
  removedById?: number | null;
  removalReason?: string | null;
  isRemoved?: boolean;
}

export interface TicketDetailResponse extends Ticket {
  ticketOwnerId?: number | null;
  resolvedByRequester?: boolean;
  category: Category;
  relatedSystem?: RelatedSystem | null;
  requester: RequesterUser;
  attachments: Attachment[];
  removedAttachments?: Attachment[];
}

export interface CommentItem {
  id: number;
  ticketId?: number;
  authorId?: number;
  authorName: string;
  authorRole: string;
  content: string;
  createdAt: string;
}

export async function checkSystem(): Promise<SystemStatus> {
  const healthRes = await fetch(`${API_URL}/api/health`);
  if (!healthRes.ok) {
    throw new Error(`Health check failed with status ${healthRes.status}`);
  }
  const healthData = await healthRes.json();
  if (healthData.status !== "ok") {
    throw new Error("Backend health status is not ok");
  }

  const categoriesRes = await fetch(`${API_URL}/api/categories`);
  if (!categoriesRes.ok) {
    throw new Error(`Categories fetch failed with status ${categoriesRes.status}`);
  }
  const categories: Category[] = await categoriesRes.json();

  return {
    online: true,
    categories,
  };
}

export async function fetchRequesters(): Promise<RequesterUser[]> {
  const res = await fetch(`${API_URL}/api/requesters`, {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch requesters: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${API_URL}/api/categories`);
  if (!res.ok) {
    throw new Error(`Failed to fetch categories: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchRelatedSystems(): Promise<RelatedSystem[]> {
  const res = await fetch(`${API_URL}/api/related-systems`);
  if (!res.ok) {
    throw new Error(`Failed to fetch related systems: HTTP ${res.status}`);
  }
  return res.json();
}

export async function createTicket(payload: CreateTicketPayload): Promise<Ticket> {
  const res = await fetch(`${API_URL}/api/tickets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-requester-id": String(payload.requesterId),
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message =
      errorData.error?.message ||
      (errorData.error?.fieldErrors
        ? errorData.error.fieldErrors.map((f: any) => f.message).join(", ")
        : `Ticket creation failed with status ${res.status}`);
    const error = new Error(message);
    (error as any).status = res.status;
    (error as any).fieldErrors = errorData.error?.fieldErrors;
    throw error;
  }

  return res.json();
}

export async function fetchMyTickets(
  params: TicketQueryParams
): Promise<PaginatedTicketsResponse> {
  const query = new URLSearchParams();

  if (params.search) {
    query.set("search", params.search);
  }
  if (params.categoryId !== undefined) {
    query.set("categoryId", String(params.categoryId));
  }
  if (params.requestedPriority) {
    query.set("requestedPriority", params.requestedPriority);
  }
  if (params.itPriority) {
    query.set("itPriority", params.itPriority);
  }
  if (params.status) {
    query.set("status", params.status);
  }
  if (params.sortBy) {
    query.set("sortBy", params.sortBy);
  }
  if (params.sortOrder) {
    query.set("sortOrder", params.sortOrder);
  }
  if (params.page !== undefined) {
    query.set("page", String(params.page));
  }
  if (params.limit !== undefined) {
    query.set("limit", String(params.limit));
  }

  const headers: Record<string, string> = {};
  if (params.requesterId !== undefined) {
    headers["x-requester-id"] = String(params.requesterId);
  }

  const res = await fetch(`${API_URL}/api/tickets?${query.toString()}`, {
    headers,
    credentials: "include",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `Failed to fetch tickets: HTTP ${res.status}`
    );
  }

  return res.json();
}

export async function fetchTicketDetail(ticketId: number, requesterId?: number): Promise<TicketDetailResponse> {
  const queryParam = requesterId ? `?requesterId=${requesterId}` : "";
  const headers: Record<string, string> = {};
  if (requesterId) {
    headers["x-requester-id"] = String(requesterId);
  }

  const res = await fetch(`${API_URL}/api/tickets/${ticketId}${queryParam}`, {
    headers,
    credentials: "include",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const err = new Error(errorData.error?.message || `Failed to fetch ticket detail (HTTP ${res.status})`);
    (err as any).status = res.status;
    throw err;
  }
  return res.json();
}

export async function uploadAttachment(
  ticketId: number,
  file: File,
  requesterId: number
): Promise<Attachment> {
  const formData = new FormData();
  formData.append("requesterId", String(requesterId));
  formData.append("file", file);

  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/attachments`, {
    method: "POST",
    headers: {
      "x-requester-id": String(requesterId),
    },
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const err = new Error(errorData.error?.message || `Attachment upload failed (HTTP ${res.status})`);
    (err as any).status = res.status;
    (err as any).code = errorData.error?.code;
    throw err;
  }
  return res.json();
}

export async function softRemoveAttachment(
  attachmentId: number,
  reason: string,
  requesterId: number
): Promise<{ id: number; isRemoved: boolean; removalReason: string }> {
  const res = await fetch(`${API_URL}/api/attachments/${attachmentId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "x-requester-id": String(requesterId),
    },
    body: JSON.stringify({ requesterId, reason }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const err = new Error(errorData.error?.message || `Failed to remove attachment (HTTP ${res.status})`);
    (err as any).status = res.status;
    throw err;
  }
  return res.json();
}

export function getAttachmentDownloadUrl(attachmentId: number, requesterId: number): string {
  return `${API_URL}/api/attachments/${attachmentId}/download?requesterId=${requesterId}`;
}

export async function fetchComments(ticketId: number): Promise<CommentItem[]> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/comments`, {
    credentials: "include",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to fetch comments (HTTP ${res.status})`);
  }
  const data = await res.json();
  return data.comments || [];
}

export async function postComment(ticketId: number, content: string): Promise<CommentItem> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ content }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error?.message || `Failed to post comment (HTTP ${res.status})`);
    (err as any).status = res.status;
    (err as any).code = data.error?.code;
    throw err;
  }
  return data.comment;
}

export async function indicateProblemResolved(
  ticketId: number,
  comment?: string
): Promise<{ ticket: any; message: string }> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/resolve-indication`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ comment }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error?.message || `Failed to indicate problem resolved (HTTP ${res.status})`);
    (err as any).status = res.status;
    (err as any).code = data.error?.code;
    throw err;
  }
  return data;
}

export async function loginApi(credentials: { email: string; password: string }) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(credentials),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error?.message || `Login failed (HTTP ${res.status})`);
    (err as any).status = res.status;
    (err as any).code = data.error?.code;
    (err as any).fieldErrors = data.error?.fieldErrors;
    throw err;
  }
  return data;
}

export async function logoutApi() {
  const res = await fetch(`${API_URL}/api/auth/logout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const err = new Error(data.error?.message || `Logout failed (HTTP ${res.status})`);
    (err as any).status = res.status;
    throw err;
  }
  return res.json();
}

export async function getMeApi() {
  const res = await fetch(`${API_URL}/api/auth/me`, {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const err = new Error(data.error?.message || `Not authenticated (HTTP ${res.status})`);
    (err as any).status = res.status;
    (err as any).code = data.error?.code;
    throw err;
  }
  return res.json();
}

export async function changePasswordApi(payload: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}) {
  const res = await fetch(`${API_URL}/api/auth/change-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error?.message || `Password change failed (HTTP ${res.status})`);
    (err as any).status = res.status;
    (err as any).code = data.error?.code;
    throw err;
  }
  return data;
}

export interface StaffTicketItem {
  id: number;
  ticketNumber: string;
  summary: string;
  description?: string;
  categoryName: string;
  relatedSystemName?: string;
  priority: Priority;
  itPriority: Priority;
  status: TicketStatus;
  requesterName: string;
  requesterId?: number;
  assignedOwnerName: string | null;
  assignedOwnerId: number | null;
  ticketOwner: string;
  ticketOwnerId?: number | null;
  resolvedByRequester?: boolean;
  createdAt: string;
  updatedAt: string;
  category?: Category;
  relatedSystem?: RelatedSystem;
}

export interface StaffTicketQueryParams {
  search?: string;
  categoryId?: number;
  category?: string;
  priority?: Priority;
  status?: TicketStatus;
  assigned?: "all" | "unassigned" | "me";
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
  limit?: number;
}

export interface PaginatedStaffTicketsResponse {
  tickets: StaffTicketItem[];
  pagination: {
    page: number;
    pageSize: number;
    limit: number;
    totalRecords: number;
    total: number;
    totalPages: number;
  };
}

export async function fetchStaffTickets(
  params: StaffTicketQueryParams = {}
): Promise<PaginatedStaffTicketsResponse> {
  const query = new URLSearchParams();

  if (params.search) query.set("search", params.search);
  if (params.categoryId !== undefined) query.set("categoryId", String(params.categoryId));
  if (params.category) query.set("category", params.category);
  if (params.priority) query.set("priority", params.priority);
  if (params.status) query.set("status", params.status);
  if (params.assigned) query.set("assigned", params.assigned);
  if (params.sortBy) query.set("sortBy", params.sortBy);
  if (params.sortOrder) query.set("sortOrder", params.sortOrder);
  if (params.page !== undefined) query.set("page", String(params.page));
  if (params.pageSize !== undefined) query.set("pageSize", String(params.pageSize));
  else if (params.limit !== undefined) query.set("pageSize", String(params.limit));

  const res = await fetch(`${API_URL}/api/staff/tickets?${query.toString()}`, {
    credentials: "include",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const err = new Error(errorData.error?.message || `Failed to fetch staff queue (HTTP ${res.status})`);
    (err as any).status = res.status;
    (err as any).code = errorData.error?.code;
    throw err;
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Lab 3 Feature 5 — Staff Ticket Detail, Lifecycle & Notes APIs
// ---------------------------------------------------------------------------

export interface InternalNoteItem {
  id: number;
  ticketId: number;
  authorId: number;
  authorName: string;
  authorRole: "REQUESTER" | "IT_STAFF" | "ADMIN";
  content: string;
  createdAt: string;
}

export interface StaffTicketDetail {
  id: number;
  ticketNumber: string;
  summary: string;
  description: string;
  requestedPriority: Priority;
  itPriority: Priority;
  priority: Priority;
  status: TicketStatus;
  currentStatus: TicketStatus;
  resolvedByRequester: boolean;
  requester: {
    id: number;
    fullName: string;
    email: string;
    department?: string | null;
    role: string;
  };
  category: {
    id: number;
    name: string;
  };
  relatedSystem: {
    id: number;
    name: string;
  };
  assignedStaff?: {
    id: number;
    fullName: string;
    email: string;
    role: string;
  } | null;
  ticketOwnerId?: number | null;
  ticketOwner: string;
  assignedOwnerName?: string | null;
  assignedOwnerId?: number | null;
  createdAt: string;
  updatedAt: string;
  attachments: Array<{
    id: number;
    fileName: string;
    originalName: string;
    mimeType: string;
    fileSize: number;
    uploadedById: number;
    uploadedAt: string;
    removedAt?: string | null;
    removalReason?: string | null;
  }>;
  comments: CommentItem[];
  internalNotes: InternalNoteItem[];
}

export async function fetchStaffTicketDetail(
  ticketId: number
): Promise<{ ticket: StaffTicketDetail }> {
  const res = await fetch(`${API_URL}/api/staff/tickets/${ticketId}`, {
    credentials: "include",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const err = new Error(
      errorData.error?.message || `Failed to fetch staff ticket detail (HTTP ${res.status})`
    );
    (err as any).status = res.status;
    (err as any).code = errorData.error?.code;
    throw err;
  }

  return res.json();
}

export async function assignTicketOwner(
  ticketId: number,
  ticketOwnerId: number | null
): Promise<{
  ticket: { id: number; ticketOwnerId: number | null; assignedOwnerName: string | null };
  message: string;
}> {
  const res = await fetch(`${API_URL}/api/staff/tickets/${ticketId}/assign`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ ticketOwnerId }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const err = new Error(
      errorData.error?.message || `Failed to update ticket ownership (HTTP ${res.status})`
    );
    (err as any).status = res.status;
    (err as any).code = errorData.error?.code;
    throw err;
  }

  return res.json();
}

export async function updateTicketPriority(
  ticketId: number,
  itPriority: Priority
): Promise<{
  ticket: { id: number; itPriority: Priority };
  message: string;
}> {
  const res = await fetch(`${API_URL}/api/staff/tickets/${ticketId}/priority`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ itPriority }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const err = new Error(
      errorData.error?.message || `Failed to update IT priority (HTTP ${res.status})`
    );
    (err as any).status = res.status;
    (err as any).code = errorData.error?.code;
    throw err;
  }

  return res.json();
}

export async function transitionTicketStatus(
  ticketId: number,
  status: TicketStatus
): Promise<{
  ticket: { id: number; status: TicketStatus; currentStatus: TicketStatus };
  message: string;
}> {
  const res = await fetch(`${API_URL}/api/staff/tickets/${ticketId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ status }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const err = new Error(
      errorData.error?.message || `Failed to transition status (HTTP ${res.status})`
    );
    (err as any).status = res.status;
    (err as any).code = errorData.error?.code;
    throw err;
  }

  return res.json();
}

export async function createInternalNote(
  ticketId: number,
  content: string
): Promise<{
  note: InternalNoteItem;
  message?: string;
}> {
  const res = await fetch(`${API_URL}/api/staff/tickets/${ticketId}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ content }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const err = new Error(
      errorData.error?.message || `Failed to add internal note (HTTP ${res.status})`
    );
    (err as any).status = res.status;
    (err as any).code = errorData.error?.code;
    throw err;
  }

  return res.json();
}

export async function fetchInternalNotes(
  ticketId: number
): Promise<{ notes: InternalNoteItem[] }> {
  const res = await fetch(`${API_URL}/api/staff/tickets/${ticketId}/notes`, {
    credentials: "include",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const err = new Error(
      errorData.error?.message || `Failed to fetch internal notes (HTTP ${res.status})`
    );
    (err as any).status = res.status;
    (err as any).code = errorData.error?.code;
    throw err;
  }

  return res.json();
}
