# Lab 2 REST API Specification

## 1. Overview
- **Base URL:** `/api`
- **Content-Type:** `application/json` (except file uploads using `multipart/form-data`)
- **Simulated Identity Context:** In Lab 2, user identity is passed via `requesterId` in request bodies, query strings (`?requesterId=1`) or the custom header `x-requester-id: 1`.

### Standard Response Envelopes

#### Success Envelopes
- **Single Resource:**
```json
{
  "id": 1,
  "ticketNumber": "TKT-2026-000001",
  "summary": "Laptop battery drains quickly",
  "requestedPriority": "MEDIUM",
  "itPriority": "MEDIUM",
  "currentStatus": "NEW",
  "createdAt": "2099-12-20T08:00:00.000Z"
}
```

- **Paginated Collection:**
```json
{
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalCount": 42,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

#### Standard Error Envelope (System SDS Compliant)
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters or payload",
    "fieldErrors": [
      {
        "field": "summary",
        "message": "Summary must be between 5 and 100 characters"
      }
    ],
    "correlationId": "req-1724142000-cpe888"
  }
}
```

---

## 2. API Endpoints

### 2.1. Reference Data & Development Requester

#### `GET /api/requesters`
* **Purpose:** List all active Development Requesters for the simulated user selection screen.
* **Query Parameters:** None (filters `isActive: true` automatically).
* **Response `200 OK`:**
```json
[
  {
    "id": 1,
    "fullName": "Sorawit Chaithong",
    "email": "sorawit.chaithong@email.com",
    "department": "Science",
    "isActive": true
  },
  {
    "id": 2,
    "fullName": "Piti Srisongkram",
    "email": "piti.srisongkram@gmail.com",
    "department": "Engineer",
    "isActive": true
  }
]
```

#### `GET /api/categories`
* **Purpose:** List all active ticket categories.
* **Response `200 OK`:**
```json
[
  { "id": 1, "name": "Account and Access", "isActive": true },
  { "id": 2, "name": "Hardware", "isActive": true },
  { "id": 3, "name": "Software", "isActive": true },
  { "id": 4, "name": "Network", "isActive": true }
]
```

#### `GET /api/related-systems`
* **Purpose:** List all active related systems.
* **Response `200 OK`:**
```json
[
  { "id": 1, "name": "Email", "description": "Corporate Exchange / Webmail" },
  { "id": 2, "name": "Campus Wi-Fi", "description": "Wireless network connectivity" },
  { "id": 3, "name": "VPN", "description": "Remote corporate VPN access" },
  { "id": 4, "name": "LEB2 App", "description": "Learning platform" },
  { "id": 5, "name": "Grade Submission App", "description": "Academic portal" },
  { "id": 6, "name": "Printer", "description": "Office network printers" },
  { "id": 7, "name": "Corporate Laptop", "description": "Assigned laptop hardware" }
]
```

---

### 2.2. Tickets Management

#### `POST /api/tickets`
* **Purpose:** Create a new support ticket with auto-generated ticket number.
* **Request Headers:** `Content-Type: application/json`
* **Request Body:**
```json
{
  "requesterId": 1,
  "categoryId": 2,
  "relatedSystemId": 7,
  "requestedPriority": "MEDIUM",
  "summary": "Laptop battery drains quickly",
  "description": "My laptop battery is draining much faster than usual even when idle."
}
```
* **Validation Rules:**
  * `requesterId`: Required positive integer; must match an active `RequesterUser`.
  * `categoryId`: Required positive integer; must match an active `Category`.
  * `relatedSystemId`: Required positive integer; must match an active `RelatedSystem`.
  * `requestedPriority`: Required enum: `LOW`, `MEDIUM`, `HIGH`, `URGENT`. Default: `MEDIUM`.
  * `summary`: Required string, 5 to 100 characters after trimming.
  * `description`: Required string, 10 to 2,000 characters after trimming.
* **Response `201 Created`:**
```json
{
  "id": 101,
  "ticketNumber": "TKT-2026-000101",
  "requesterId": 1,
  "categoryId": 2,
  "relatedSystemId": 7,
  "requestedPriority": "MEDIUM",
  "itPriority": "MEDIUM",
  "currentStatus": "NEW",
  "summary": "Laptop battery drains quickly",
  "description": "My laptop battery is draining much faster than usual even when idle.",
  "ticketOwner": "Unassigned",
  "createdAt": "2026-08-20T08:30:00.000Z",
  "updatedAt": "2026-08-20T08:30:00.000Z"
}
```
* **Error Responses:**
  * `400 Bad Request`: Validation failure.
  * `404 Not Found`: Inactive or non-existent requester/category/system.

#### `GET /api/tickets`
* **Purpose:** Retrieve paginated tickets owned strictly by the requesting user, with search, multi-criteria filtering, and sorting.
* **Query Parameters:**
  * `requesterId` (required, int): ID of the active requester.
  * `search` (optional, string): Search term matching `ticketNumber` or `summary` (case-insensitive substring).
  * `categoryId` (optional, int): Filter by Category.
  * `requestedPriority` (optional, string): `LOW`, `MEDIUM`, `HIGH`, `URGENT`.
  * `itPriority` (optional, string): `LOW`, `MEDIUM`, `HIGH`, `URGENT`.
  * `status` (optional, string): `NEW`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`, `CANCELLED`.
  * `sortBy` (optional, string): `createdAt`, `ticketNumber`, `summary`, `requestedPriority`, `currentStatus`, `updatedAt` (Default: `createdAt`).
  * `sortOrder` (optional, string): `asc`, `desc` (Default: `desc`).
  * `page` (optional, int): Page number $\ge 1$ (Default: `1`).
  * `limit` (optional, int): Items per page, 1 to 50 (Default: `10`).
* **Response `200 OK`:**
```json
{
  "data": [
    {
      "id": 101,
      "ticketNumber": "TKT-2026-00001",
      "summary": "Laptop battery drains quickly",
      "category": { "id": 2, "name": "Hardware" },
      "relatedSystem": { "id": 7, "name": "Corporate Laptop" },
      "requestedPriority": "MEDIUM",
      "itPriority": "MEDIUM",
      "currentStatus": "NEW",
      "ticketOwner": "Unassigned",
      "createdAt": "2026-08-20T08:30:00.000Z",
      "updatedAt": "2026-08-20T08:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalCount": 1,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPreviousPage": false
  }
}
```

#### `GET /api/tickets/:id`
* **Purpose:** Retrieve complete details and attachments for a single ticket, strictly enforcing ownership.
* **Query Parameters:** `requesterId` (required, int) or header `x-requester-id`
* **Response `200 OK`:**
```json
{
  "id": 101,
  "ticketNumber": "TKT-2026-000101",
  "summary": "Laptop battery drains quickly",
  "description": "My laptop battery is draining much faster than usual even when idle.",
  "requestedPriority": "MEDIUM",
  "itPriority": "MEDIUM",
  "currentStatus": "NEW",
  "ticketOwner": "Unassigned",
  "createdAt": "2026-08-20T08:30:00.000Z",
  "updatedAt": "2026-08-20T08:30:00.000Z",
  "requester": {
    "id": 1,
    "fullName": "Jennifer Anderson",
    "email": "jennifer.anderson@example.com",
    "department": "Marketing"
  },
  "category": { "id": 2, "name": "Hardware" },
  "relatedSystem": { "id": 7, "name": "Corporate Laptop" },
  "attachments": [
    {
      "id": 5,
      "fileName": "battery_report.pdf",
      "fileSize": 1048576,
      "mimeType": "application/pdf",
      "uploadedAt": "2026-08-20T08:31:00.000Z",
      "isRemoved": false
    }
  ],
  "removedAttachments": []
}
```
* **Error Responses:**
  * `403 Forbidden`: Requester does not own this ticket.
  * `404 Not Found`: Ticket does not exist.

---

### 2.3. Attachment Lifecycle

#### `POST /api/tickets/:id/attachments`
* **Purpose:** Upload an attachment to an existing ticket.
* **Content-Type:** `multipart/form-data`
* **Form Fields:** `requesterId` (text), `file` (binary)
* **Constraints:**
  * Supported MIME: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`.
  * Max size: $5\text{MB}$ ($5,242,880$ bytes).
  * Max active attachments: 5 per ticket.
* **Response `201 Created`:**
```json
{
  "id": 6,
  "ticketId": 101,
  "fileName": "battery.png",
  "fileSize": 524288,
  "mimeType": "image/png",
  "uploadedAt": "2026-08-20T08:35:00.000Z"
}
```
* **Error Responses:**
  * `400 Bad Request`: Reached max 5 active attachments or missing file.
  * `403 Forbidden`: Requester is not the owner of the ticket.
  * `413 Payload Too Large`: File exceeds 5MB limit.
  * `415 Unsupported Media Type`: File type not permitted.

#### `GET /api/attachments/:id/download`
* **Purpose:** Download an active attachment file.
* **Query Parameters:** `requesterId` (required, int)
* **Rules:**
  * Rejects download if attachment is soft-removed (`removedAt` is set).
  * Rejects download if requester does not own the associated ticket.
* **Response `200 OK`:** Binary file stream with `Content-Disposition: attachment; filename="..."`.
* **Error Responses:**
  * `403 Forbidden`: Ownership mismatch.
  * `404 Not Found`: Attachment does not exist.
  * `410 Gone`: Attachment was soft-removed.

#### `DELETE /api/attachments/:id`
* **Purpose:** Soft-remove an active attachment by recording a mandatory reason.
* **Request Body:**
```json
{
  "requesterId": 1,
  "reason": "Accidentally uploaded sensitive system diagnostic report."
}
```
* **Validation Rules:**
  * `reason`: Required string, 5 to 255 characters after trimming.
  * Attachment must not already be soft-removed.
  * Requester must own the associated ticket.
* **Response `200 OK`:**
```json
{
  "id": 6,
  "fileName": "battery_screenshot.png",
  "removedAt": "2026-08-20T08:40:00.000Z",
  "removedById": 1,
  "removalReason": "Accidentally uploaded sensitive system diagnostic report.",
  "isRemoved": true
}
```
* **Error Responses:**
  * `400 Bad Request`: Missing or invalid removal reason.
  * `403 Forbidden`: Requester does not own the ticket.
  * `404 Not Found`: Attachment does not exist.
  * `409 Conflict`: Attachment is already soft-removed.