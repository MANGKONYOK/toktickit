# Lab 4 REST API Specification

## TokTickIT — Actions Taken, Resolution Concurrency and Role Dashboards

---

## 1. Global Conventions & Protocol Standards

- **Base URL:** `/api`
- **Transport & Authentication:** All requests use HTTP cookie-based session tokens or Bearer tokens validated against the server session store.
- **Identity Derivation:** The authenticated user's ID (`req.user.id`) and role (`req.user.role`) are strictly derived server-side from the session token. Client headers or body payloads attempting to declare or spoof actor identity are ignored or rejected.
- **Request & Response Format:** `application/json; charset=utf-8`.
- **Standard Error Envelope:**
  ```json
  {
    "error": {
      "code": "ERROR_CODE_STRING",
      "message": "Human-readable explanation of error.",
      "details": []
    }
  }
  ```

---

## 2. RBAC Capability & Authorization Matrix

| Endpoint | Method | Requester | IT Staff | Administrator | Unauthenticated |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `/api/tickets/:id/actions` | `GET` | Owned Only (404 on unowned) | Allowed (200) | Allowed (200) | 401 Unauthorized |
| `/api/tickets/:id/actions` | `POST` | 403 Forbidden | Allowed (201) | Allowed (201) | 401 Unauthorized |
| `/api/tickets/:id/actions/:actionId` | `PATCH` | 403 Forbidden | Allowed (200) | Allowed (200) | 401 Unauthorized |
| `/api/tickets/:id/status` | `PATCH` | 403 Forbidden | Allowed (200/409) | Allowed (200/409) | 401 Unauthorized |
| `/api/tickets/:id/resolve` | `PATCH` | Owned Only (200) | Allowed (200) | Allowed (200) | 401 Unauthorized |
| `/api/dashboard/requester` | `GET` | Allowed (200) | 403 Forbidden | Allowed (200) | 401 Unauthorized |
| `/api/dashboard/staff` | `GET` | 403 Forbidden | Allowed (200) | Allowed (200) | 401 Unauthorized |
| `/api/dashboard/admin` | `GET` | 403 Forbidden | 403 Forbidden | Allowed (200) | 401 Unauthorized |

---

## 3. Actions Taken Endpoints

### 3.1. List Actions Taken for Ticket

- **Endpoint:** `GET /api/tickets/:id/actions`
- **Description:** Returns all Action Taken records associated with the specified ticket, ordered chronologically (`actionDateTime ASC`, `id ASC`).
- **Authorization:** Requesters may only query tickets they own (unowned tickets return HTTP 404). IT Staff and Administrators may query any ticket.
- **Response `200 OK`:**
  ```json
  {
    "ticketId": 12,
    "actions": [
      {
        "id": 101,
        "ticketId": 12,
        "actionDateTime": "2026-10-02T09:15:00.000Z",
        "description": "Inspected VPN gateway configuration logs and identified stale routing entry.",
        "result": "Cleared routing cache and restarted tunnel daemon. Ping response returned to normal.",
        "performedById": 2,
        "performedBy": {
          "id": 2,
          "fullName": "Somsak ITStaff",
          "email": "somsak.it@toktickit.local",
          "role": "IT_STAFF"
        },
        "followUpRequired": true,
        "followUpNote": "Monitor latency during peak hours (14:00 - 16:00).",
        "attachmentNotes": "See attached traceroute log traceroute_vpn.txt",
        "createdAt": "2026-10-02T09:16:12.000Z",
        "updatedAt": "2026-10-02T09:16:12.000Z"
      }
    ]
  }
  ```
- **Error Responses:**
  - `401 Unauthorized`: Missing or invalid session token.
  - `404 Not Found`: Ticket does not exist or caller is Requester who does not own the ticket (`TICKET_NOT_FOUND`).

---

### 3.2. Create Action Taken

- **Endpoint:** `POST /api/tickets/:id/actions`
- **Description:** Records a new Action Taken under the specified ticket. The performer identity (`performedById`) is automatically populated from the authenticated session.
- **Authorization:** `IT_STAFF` or `ADMIN`.
- **Request Body:**
  ```json
  {
    "actionDateTime": "2026-10-02T09:15:00.000Z",
    "description": "Replaced RAM module on workstation.",
    "result": "System passed MemTest86 diagnostic without memory errors.",
    "followUpRequired": true,
    "followUpNote": "Check in with user after 48 hours of continuous operation.",
    "attachmentNotes": "RAM serial number captured in photo ram_spec.png"
  }
  ```
- **Field Validation Rules:**
  - `actionDateTime`: Optional in body; defaults to server `new Date()` if omitted. If provided, must be valid ISO-8601 string.
  - `description`: Required string, 1 to 2,000 characters after whitespace trimming.
  - `result`: Required string, 1 to 2,000 characters after whitespace trimming.
  - `followUpRequired`: Required boolean (default `false`).
  - `followUpNote`: Required string (1..1,000 characters) if `followUpRequired == true`. Optional / ignored if `followUpRequired == false`.
  - `attachmentNotes`: Optional string, max 1,000 characters.
- **Response `201 Created`:**
  ```json
  {
    "id": 102,
    "ticketId": 12,
    "actionDateTime": "2026-10-02T09:15:00.000Z",
    "description": "Replaced RAM module on workstation.",
    "result": "System passed MemTest86 diagnostic without memory errors.",
    "performedById": 2,
    "performedBy": {
      "id": 2,
      "fullName": "Somsak ITStaff",
      "email": "somsak.it@toktickit.local",
      "role": "IT_STAFF"
    },
    "followUpRequired": true,
    "followUpNote": "Check in with user after 48 hours of continuous operation.",
    "attachmentNotes": "RAM serial number captured in photo ram_spec.png",
    "createdAt": "2026-10-02T09:18:00.000Z",
    "updatedAt": "2026-10-02T09:18:00.000Z"
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Validation failure (`VALIDATION_ERROR`, e.g., missing required follow-up note, empty description, or ticket is closed/cancelled).
  - `401 Unauthorized`: Missing or invalid session token.
  - `403 Forbidden`: Caller role is `REQUESTER` (`FORBIDDEN_ROLE`).
  - `404 Not Found`: Ticket ID does not exist (`TICKET_NOT_FOUND`).

---

### 3.3. Update Action Taken

- **Endpoint:** `PATCH /api/tickets/:id/actions/:actionId`
- **Description:** Updates an existing Action Taken record.
- **Authorization:** `IT_STAFF` or `ADMIN`.
- **Request Body:** Partial object containing any of `actionDateTime`, `description`, `result`, `followUpRequired`, `followUpNote`, `attachmentNotes`.
- **Response `200 OK`:** Returns the full updated `ActionTaken` object.
- **Error Responses:**
  - `400 Bad Request`: Validation failure or ticket in terminal state.
  - `403 Forbidden`: Caller role is `REQUESTER`.
  - `404 Not Found`: Ticket or Action record not found.

---

## 4. Ticket Workflow & Concurrency Endpoints

### 4.1. Update Ticket Status (with Optimistic Concurrency Gate)

- **Endpoint:** `PATCH /api/tickets/:id/status`
- **Description:** Advances the lifecycle status of a ticket according to the governed 8-state transition matrix. Requires `expectedUpdatedAt` timestamp to detect concurrent modifications.
- **Authorization:** `IT_STAFF` or `ADMIN`.
- **Request Body:**
  ```json
  {
    "status": "RESOLVED",
    "expectedUpdatedAt": "2026-10-02T09:10:00.000Z"
  }
  ```
- **Concurrency & Validation Rules:**
  1. The API fetches the ticket and compares `ticket.updatedAt.toISOString()` with `expectedUpdatedAt`.
  2. If the timestamps do not match, the request is aborted and returns `HTTP 409 Conflict`.
  3. The requested `status` must be a valid transition from `ticket.currentStatus` per the status graph.
- **Response `200 OK`:**
  ```json
  {
    "id": 12,
    "ticketNumber": "TKT-2026-000012",
    "currentStatus": "RESOLVED",
    "updatedAt": "2026-10-02T09:20:15.000Z",
    "previousStatus": "IN_PROGRESS"
  }
  ```
- **Response `409 Conflict`:**
  ```json
  {
    "error": {
      "code": "CONCURRENCY_CONFLICT",
      "message": "This ticket was modified by another user while you were viewing it. Please reload the latest ticket state before making changes.",
      "details": {
        "currentUpdatedAt": "2026-10-02T09:18:45.000Z",
        "currentStatus": "WAITING_FOR_REQUESTER"
      }
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Invalid status transition (e.g., `NEW -> RESOLVED` or ticket is in terminal state `CLOSED`).
  - `401 Unauthorized`: Not authenticated.
  - `403 Forbidden`: Role is `REQUESTER`.
  - `404 Not Found`: Ticket ID not found.

---

### 4.2. Advisory Requester Resolution Indication

- **Endpoint:** `PATCH /api/tickets/:id/resolve`
- **Description:** Allows the owning Requester to signal that their problem appears resolved.
- **Authorization:** Authenticated Requester (must own ticket) or `IT_STAFF`/`ADMIN`.
- **Request Body:** `{}`
- **Behavior:** Sets `resolvedByRequester = true`, leaves `currentStatus` unchanged, appends automated comment to discussion thread.
- **Response `200 OK`:**
  ```json
  {
    "id": 12,
    "ticketNumber": "TKT-2026-000012",
    "currentStatus": "IN_PROGRESS",
    "resolvedByRequester": true,
    "updatedAt": "2026-10-02T09:22:00.000Z"
  }
  ```

---

## 5. Role Dashboard Endpoints

### 5.1. Requester Dashboard

- **Endpoint:** `GET /api/dashboard/requester`
- **Description:** Returns summary counters and recent tickets owned by the authenticated Requester.
- **Authorization:** `REQUESTER` (or `ADMIN` preview).
- **Response `200 OK`:**
  ```json
  {
    "metrics": {
      "totalOpen": 3,
      "waitingForRequester": 1,
      "recentlyUpdated": 2,
      "recentlyResolved": 4
    },
    "recentTickets": [
      {
        "id": 12,
        "ticketNumber": "TKT-2026-000012",
        "summary": "VPN connection drops every 10 minutes",
        "categoryName": "Network",
        "requestedPriority": "HIGH",
        "currentStatus": "IN_PROGRESS",
        "resolvedByRequester": false,
        "updatedAt": "2026-10-02T09:20:15.000Z"
      }
    ]
  }
  ```
- **Empty State Behavior:** When user has no tickets, metrics return `0` and `recentTickets` returns `[]`.

---

### 5.2. IT Staff Dashboard

- **Endpoint:** `GET /api/dashboard/staff`
- **Description:** Returns operational metrics, status and priority breakdowns, current user's recent actions, and urgent attention tickets.
- **Authorization:** `IT_STAFF` or `ADMIN`.
- **Response `200 OK`:**
  ```json
  {
    "metrics": {
      "unassignedTickets": 4,
      "myAssignedTickets": 6,
      "waitingForRequester": 3,
      "urgentTickets": 2,
      "ticketsByStatus": {
        "NEW": 3,
        "OPEN": 4,
        "IN_PROGRESS": 6,
        "WAITING_FOR_REQUESTER": 3,
        "RESOLVED": 5,
        "CLOSED": 14,
        "REOPENED": 1,
        "CANCELLED": 2
      },
      "ticketsByPriority": {
        "LOW": 5,
        "MEDIUM": 10,
        "HIGH": 6,
        "URGENT": 2
      }
    },
    "recentActions": [
      {
        "id": 102,
        "ticketId": 12,
        "ticketNumber": "TKT-2026-000012",
        "actionDateTime": "2026-10-02T09:15:00.000Z",
        "description": "Replaced RAM module on workstation.",
        "result": "System passed MemTest86 diagnostic without memory errors.",
        "followUpRequired": true
      }
    ],
    "urgentAttentionTickets": [
      {
        "id": 15,
        "ticketNumber": "TKT-2026-000015",
        "summary": "ERP database replica sync failure",
        "itPriority": "URGENT",
        "currentStatus": "OPEN",
        "ticketOwner": "Unassigned",
        "createdAt": "2026-10-02T08:00:00.000Z"
      }
    ]
  }
  ```

---

### 5.3. Administrator Dashboard

- **Endpoint:** `GET /api/dashboard/admin`
- **Description:** Returns staff operational data augmented by user management health metrics.
- **Authorization:** `ADMIN`.
- **Response `200 OK`:**
  ```json
  {
    "staffDashboard": {
      "metrics": { ... },
      "recentActions": [ ... ],
      "urgentAttentionTickets": [ ... ]
    },
    "userStats": {
      "totalUsers": 28,
      "activeUsers": 26,
      "inactiveUsers": 2,
      "byRole": {
        "REQUESTER": 18,
        "IT_STAFF": 8,
        "ADMIN": 2
      }
    }
  }
  ```

---

## 6. HTTP Status Code Catalog

| Status Code | Meaning & Typical Scenarios |
| :---: | :--- |
| `200 OK` | Successful query or modification (`GET`, `PATCH`). |
| `201 Created` | New Action Taken record successfully persisted (`POST`). |
| `400 Bad Request` | Missing required fields, validation error, invalid state transition, or operation on terminal ticket (`CLOSED`/`CANCELLED`). |
| `401 Unauthorized` | Missing, expired, or invalid session token. |
| `403 Forbidden` | Authenticated caller does not possess required role (e.g., Requester calling Staff APIs). |
| `404 Not Found` | Ticket or Action Taken ID does not exist, or unowned ticket requested by Requester (anti-enumeration). |
| `409 Conflict` | Optimistic concurrency conflict (`expectedUpdatedAt` timestamp mismatch). |
| `500 Internal Error`| Unhandled server exception with sanitized error message. |
