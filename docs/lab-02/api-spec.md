# Lab 2 REST API Specification

## 1. Overview
- **Base URL:** `/api`
- **Content-Type:** `application/json` (except file uploads using `multipart/form-data`)
- **Simulated Identity Context:** In Lab 2, user identity is transmitted primarily via the custom request header `x-requester-id: <id>`, which takes authoritative precedence across all endpoints to prevent tenant spoofing. Fallback query parameters (`?requesterId=1`) and request body fields (`requesterId`) are supported for browser download links and backwards compatibility. This simulated identity is purely a testing context and explicitly not production authentication.

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
  "createdAt": "2026-08-20T08:00:00.000Z"
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

#### Standard Error Envelope
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
    "correlationId": "req-4b5cf2f4-19e1-4985-bb2e-b22e42a27487"
  }
}
```

---

## 2. API Endpoints (10 Capabilities)

### 2.1. Reference Data & Development Requester

#### 1. `GET /api/categories`
* **Purpose:** Retrieve list of active ticket categories.
* **Query Parameters:** None.
* **Response `200 OK`:**
```json
[
  { "id": 1, "name": "Account and Access", "isActive": true },
  { "id": 2, "name": "Hardware", "isActive": true },
  { "id": 3, "name": "Software", "isActive": true },
  { "id": 4, "name": "Network", "isActive": true }
]
```
* **Error Response:** `500 Internal Server Error`

#### 2. `GET /api/related-systems`
* **Purpose:** Retrieve list of active related systems.
* **Query Parameters:** None.
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
* **Error Response:** `500 Internal Server Error`

#### 3. `GET /api/requesters`
* **Purpose:** Retrieve list of active Development Requesters for the simulated user selection screen.
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
    "department": "Engineering",
    "isActive": true
  },
  {
    "id": 3,
    "fullName": "John Doe",
    "email": "john.doe@email.com",
    "department": "Finance",
    "isActive": true
  },
  {
    "id": 4,
    "fullName": "Jane Doe",
    "email": "jane.doe@email.com",
    "department": "Human Resources",
    "isActive": true
  }
]
```
* **Error Response:** `500 Internal Server Error`

---

### 2.2. Tickets Management

#### 4. `POST /api/tickets`
* **Purpose:** Create a new support ticket with auto-generated Ticket Number.
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
  - `requesterId`: Required positive integer; must match an active `RequesterUser`.
  - `categoryId`: Required positive integer; must match an active `Category`.
  - `relatedSystemId`: Required positive integer; must match an active `RelatedSystem`.
  - `requestedPriority`: Required enum: `LOW`, `MEDIUM`, `HIGH`, `URGENT`. Default: `MEDIUM`.
  - `summary`: Required string, 5 to 100 characters after trimming.
  - `description`: Required string, 10 to 2,000 characters after trimming.
* **Response `201 Created`:**
```json
{
  "id": 101,
  "ticketNumber": "TKT-2026-000001",
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
  - `400 Bad Request`: Validation failure.
  - `404 Not Found`: Inactive or non-existent requester/category/system.
  - `500 Internal Server Error`: Unexpected server failure.

#### 5. `GET /api/tickets`
* **Purpose:** Retrieve paginated tickets owned strictly by the requesting user, with search, multi-criteria filtering, and sorting.
* **Query Parameters:**
  - `requesterId` (required, int): ID of the active requester.
  - `search` (optional, string): Substring search matching `ticketNumber` or `summary`.
  - `categoryId` (optional, int): Filter by Category ID.
  - `requestedPriority` (optional, string): `LOW`, `MEDIUM`, `HIGH`, `URGENT`.
  - `itPriority` (optional, string): `LOW`, `MEDIUM`, `HIGH`, `URGENT`.
  - `status` (optional, string): `NEW`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`, `CANCELLED`.
  - `sortBy` (optional, string): `createdAt`, `ticketNumber`, `summary`, `requestedPriority`, `currentStatus`, `updatedAt` (Default: `createdAt`).
  - `sortOrder` (optional, string): `asc`, `desc` (Default: `desc`).
  - `page` (optional, int): Page number $\ge 1$ (Default: `1`).
  - `limit` (optional, int): Items per page, 1 to 50 (Default: `10`).
* **Response `200 OK`:**
```json
{
  "data": [
    {
      "id": 101,
      "ticketNumber": "TKT-2026-000001",
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
* **Error Responses:** `400 Bad Request`, `500 Internal Server Error`

#### 6. `GET /api/tickets/:id`
* **Purpose:** Retrieve complete details and attachments for a single ticket, strictly enforcing ownership.
* **Query Parameters:** `requesterId` (required, int) or header `x-requester-id`
* **Ownership Policy:** If ticket belongs to a different requester or does not exist, return `404 Not Found`.
* **Response `200 OK`:**
```json
{
  "id": 101,
  "ticketNumber": "TKT-2026-000001",
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
    "fullName": "Sorawit Chaithong",
    "email": "sorawit.chaithong@email.com",
    "department": "Science"
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
  - `400 Bad Request`: Missing `requesterId`.
  - `404 Not Found`: Ticket does not exist or belongs to another requester.
  - `500 Internal Server Error`: Unexpected server failure.

---

### 2.3. Attachment Lifecycle

#### 7. `POST /api/tickets/:id/attachments`
* **Purpose:** Upload an attachment to an existing ticket.
* **Content-Type:** `multipart/form-data`
* **Form Fields:** `requesterId` (text), `file` (binary)
* **Constraints:**
  - Supported MIME: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`.
  - Max size: $5\text{MB}$ ($5,242,880$ bytes).
  - Max active attachments: 5 per ticket.
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
  - `400 Bad Request`: Missing file payload or invalid file format.
  - `404 Not Found`: Ticket not found or owned by another requester.
  - `409 Conflict`: Maximum 5 active attachments limit reached.
  - `413 Payload Too Large`: File exceeds 5MB limit.
  - `415 Unsupported Media Type`: Disallowed MIME type.
  - `500 Internal Server Error`: Server storage error.

#### 8. `GET /api/tickets/:id/attachments`
* **Purpose:** Retrieve attachment metadata list (active and soft-removed) for a ticket.
* **Query Parameters:** `requesterId` (required, int)
* **Response `200 OK`:**
```json
{
  "activeAttachments": [
    {
      "id": 6,
      "fileName": "battery.png",
      "fileSize": 524288,
      "mimeType": "image/png",
      "uploadedAt": "2026-08-20T08:35:00.000Z"
    }
  ],
  "removedAttachments": [
    {
      "id": 4,
      "fileName": "old_logs.pdf",
      "fileSize": 102400,
      "mimeType": "application/pdf",
      "removedAt": "2026-08-20T08:20:00.000Z",
      "removalReason": "Obsolete diagnostic logs."
    }
  ]
}
```
* **Error Responses:**
  - `404 Not Found`: Ticket not found or belongs to another requester.
  - `500 Internal Server Error`: Unexpected server failure.

#### 9. `GET /api/attachments/:id/download`
* **Purpose:** Download an active attachment file stream.
* **Query Parameters:** `requesterId` (required, int)
* **Rules:**
  - Rejects download if attachment is soft-removed (`removedAt` is set) with `404 Not Found` or `410 Gone`.
  - Rejects download if requester does not own the associated ticket (`404 Not Found`).
* **Response `200 OK`:** Binary file stream with `Content-Disposition: attachment; filename="..."`.
* **Error Responses:**
  - `404 Not Found`: Attachment does not exist, belongs to another user, or was removed.
  - `410 Gone`: Attachment was soft-removed.
  - `500 Internal Server Error`: Storage stream error.

#### 10. `DELETE /api/attachments/:id`
* **Purpose:** Soft-remove an active attachment by recording a mandatory reason.
* **Request Body:**
```json
{
  "requesterId": 1,
  "reason": "Accidentally uploaded sensitive system diagnostic report."
}
```
* **Validation Rules:**
  - `reason`: Required string, 5 to 255 characters after trimming.
  - Attachment must not already be soft-removed.
  - Requester must own the associated ticket.
* **Response `200 OK`:**
```json
{
  "id": 6,
  "fileName": "battery.png",
  "removedAt": "2026-08-20T08:40:00.000Z",
  "removedById": 1,
  "removalReason": "Accidentally uploaded sensitive system diagnostic report.",
  "isRemoved": true
}
```
* **Error Responses:**
  - `400 Bad Request`: Missing or invalid removal reason.
  - `404 Not Found`: Attachment not found or owned by another user.
  - `409 Conflict`: Attachment is already soft-removed.
  - `500 Internal Server Error`: Unexpected failure.