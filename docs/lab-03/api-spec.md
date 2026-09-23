# Lab 3 REST API Specification

## TokTickIT — Authentication, RBAC, Staff Workflow & Admin APIs

---

## 1. Global API Standards

### 1.1. Authentication & Identity

- Authenticated endpoints require a valid session established via `POST /api/auth/login`.
- Sessions are maintained using signed HTTP-only cookies (`toktickit_session`) or Bearer tokens.
- Server-side middleware validates session credentials, extracts `{ userId, role }`, and sets `req.user`.
- Client-provided spoofing headers (`x-requester-id`) are ignored in favor of verified session identity.

### 1.2. Standard Error Envelope

All error responses adhere to the standard envelope with a unique UUID `correlationId`:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable explanation of the error.",
    "correlationId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

For validation failures (HTTP 400), field-specific details are included:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input payload.",
    "fieldErrors": {
      "email": "Email address must be a valid email format.",
      "password": "Password must be at least 8 characters with uppercase, digit, and symbol."
    },
    "correlationId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

---

## 2. Authentication APIs

### 2.1. Login

- **Method:** `POST`
- **Route:** `/api/auth/login`
- **Access:** Public (Unauthenticated)
- **Request Body:**

  ```json
  {
    "email": "piti.srisongkram@email.com",
    "password": "Password@2026"
  }
  ```

- **Success Response (`200 OK`):**
  Sets `toktickit_session` HTTP-only cookie.

  ```json
  {
    "user": {
      "id": 2,
      "fullName": "Piti Srisongkram",
      "email": "piti.srisongkram@email.com",
      "role": "IT_STAFF",
      "mustChangePassword": false
    },
    "message": "Login successful."
  }
  ```

- **Error Responses:**
  - `400 Bad Request` — Missing email or password.
  - `401 Unauthorized` — Invalid email or password (`INVALID_CREDENTIALS`).
  - `403 Forbidden` — Account is deactivated (`ACCOUNT_INACTIVE`).
  - `500 Internal Server Error` — Safe error envelope with correlation ID.

---

### 2.2. Logout

- **Method:** `POST`
- **Route:** `/api/auth/logout`
- **Access:** Authenticated
- **Request Body:** Empty (`{}`)
- **Success Response (`200 OK`):**
  Clears session cookie.

  ```json
  {
    "message": "Logout successful."
  }
  ```

---

### 2.3. Get Current Authenticated User Profile

- **Method:** `GET`
- **Route:** `/api/auth/me`
- **Access:** Authenticated
- **Success Response (`200 OK`):**

  ```json
  {
    "user": {
      "id": 2,
      "fullName": "Piti Srisongkram",
      "email": "piti.srisongkram@email.com",
      "role": "IT_STAFF",
      "mustChangePassword": false,
      "department": "Engineering"
    }
  }
  ```

- **Error Responses:**
  - `401 Unauthorized` — No active session.

---

### 2.4. Mandatory / Self Password Change

- **Method:** `POST`
- **Route:** `/api/auth/change-password`
- **Access:** Authenticated (Permitted during mandatory password change gate)
- **Request Body:**

  ```json
  {
    "currentPassword": "Password@2026",
    "newPassword": "SecurePass#2026!",
    "confirmPassword": "SecurePass#2026!"
  }
  ```

- **Success Response (`200 OK`):**
  Updates password hash, sets `mustChangePassword = false`.

  ```json
  {
    "message": "Password changed successfully."
  }
  ```

- **Error Responses:**
  - `400 Bad Request` — Passwords do not match or fail complexity rules (`PASSWORD_COMPLEXITY_FAILED`).
  - `401 Unauthorized` — Current password incorrect (`INVALID_CURRENT_PASSWORD`).

---

## 3. Requester Ticketing APIs (Continuity from Lab 2)

### 3.1. Create Ticket

- **Method:** `POST`
- **Route:** `/api/tickets`
- **Access:** `REQUESTER`, `IT_STAFF`, `ADMIN`
- **Identity Rule:** Requester ID is derived strictly from `req.user.id`.
- **Request Body:**

  ```json
  {
    "summary": "VPN connection drops every 10 minutes",
    "description": "When connecting through the campus Wi-Fi network, the VPN tunnels drop continuously.",
    "categoryId": 1,
    "relatedSystemId": 2,
    "priority": "HIGH"
  }
  ```

- **Success Response (`201 Created`):**

  ```json
  {
    "ticket": {
      "id": 101,
      "ticketNumber": "TKT-2026-000101",
      "summary": "VPN connection drops every 10 minutes",
      "description": "When connecting through the campus Wi-Fi network, the VPN tunnels drop continuously.",
      "priority": "HIGH",
      "itPriority": "HIGH",
      "status": "NEW",
      "requesterId": 1,
      "ticketOwnerId": null,
      "categoryId": 1,
      "relatedSystemId": 2,
      "createdAt": "2026-09-10T08:00:00.000Z"
    }
  }
  ```

---

### 3.2. List Owned Tickets

- **Method:** `GET`
- **Route:** `/api/tickets`
- **Access:** `REQUESTER` (Filters `where: { requesterId: req.user.id }`)
- **Query Parameters:** `search`, `category`, `priority`, `status`, `sortBy`, `sortOrder`, `page`, `pageSize`
- **Success Response (`200 OK`):**

  ```json
  {
    "tickets": [
      {
        "id": 101,
        "ticketNumber": "TKT-2026-000101",
        "summary": "VPN connection drops every 15 minutes",
        "status": "OPEN",
        "priority": "HIGH",
        "createdAt": "2026-09-10T08:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "totalRecords": 1,
      "totalPages": 1
    }
  }
  ```

---

### 3.3. Indicate Problem Resolved

- **Method:** `PATCH`
- **Route:** `/api/tickets/:id/resolve-indication`
- **Access:** `REQUESTER` (Must own ticket)
- **Request Body:**

  ```json
  {
    "comment": "Issue has been verified fixed on my end."
  }
  ```

- **Success Response (`200 OK`):**
  Sets `resolvedByRequester = true` and appends an audit comment while preserving the active ticket status (does NOT change status to `RESOLVED` per BR-05; formal resolution remains reserved for IT Staff).

  ```json
  {
    "ticket": {
      "id": 101,
      "status": "IN_PROGRESS",
      "resolvedByRequester": true
    },
    "message": "Problem resolution indicated successfully."
  }
  ```

---

## 4. Public Comments & Private Internal Notes

### 4.1. Add Public Comment

- **Method:** `POST`
- **Route:** `/api/tickets/:id/comments`
- **Access:** `REQUESTER` (owned tickets only), `IT_STAFF`, `ADMIN` (any ticket)
- **Request Body:**

  ```json
  {
    "content": "We have reconfigured the VPN tunnel. Please reconnect and verify."
  }
  ```

- **Success Response (`201 Created`):**

  ```json
  {
    "comment": {
      "id": 45,
      "ticketId": 101,
      "authorId": 2,
      "authorName": "Piti Srisongkram",
      "authorRole": "IT_STAFF",
      "content": "We have reconfigured the VPN tunnel. Please reconnect and verify.",
      "createdAt": "2026-09-10T08:30:00.000Z"
    }
  }
  ```

---

### 4.2. List Public Comments

- **Method:** `GET`
- **Route:** `/api/tickets/:id/comments`
- **Access:** `REQUESTER` (owned ticket), `IT_STAFF`, `ADMIN`
- **Success Response (`200 OK`):**

  ```json
  {
    "comments": [
      {
        "id": 45,
        "authorName": "Piti Srisongkram",
        "authorRole": "IT_STAFF",
        "content": "We have reconfigured the VPN tunnel. Please reconnect and verify.",
        "createdAt": "2026-09-10T08:30:00.000Z"
      }
    ]
  }
  ```

---

### 4.3. Add Private Internal Note

- **Method:** `POST`
- **Route:** `/api/staff/tickets/:id/notes`
- **Access:** `IT_STAFF`, `ADMIN` (**Strictly forbidden for `REQUESTER` — 403**)
- **Request Body:**

  ```json
  {
    "content": "Switch port 12 on switch core-02 was flapping. Restarted interface."
  }
  ```

- **Success Response (`201 Created`):**

  ```json
  {
    "note": {
      "id": 12,
      "ticketId": 101,
      "authorId": 2,
      "authorName": "Piti Srisongkram",
      "authorRole": "IT_STAFF",
      "content": "Switch port 12 on switch core-02 was flapping. Restarted interface.",
      "createdAt": "2026-09-10T08:35:00.000Z"
    }
  }
  ```

---

## 5. IT Staff Ticket Queue & Operational APIs

### 5.1. Query Staff Ticket Queue

- **Method:** `GET`
- **Route:** `/api/staff/tickets`
- **Access:** `IT_STAFF`, `ADMIN`
- **Query Parameters:**
  - `search` (string) — Substring match on `ticketNumber` or `summary`
  - `category` (string) — Category ID or name
  - `priority` (string) — Filter by `itPriority` (`LOW`, `MEDIUM`, `HIGH`, `URGENT`)
  - `status` (string) — Filter by `status`
  - `assigned` (string) — `all`, `unassigned` (`ticketOwnerId is null`), or `me` (`ticketOwnerId == req.user.id`)
  - `sortBy` (string) — `createdAt`, `ticketNumber`, `summary`, `priority`, `status`, `updatedAt` (Default `createdAt`)
  - `sortOrder` (string) — `asc` or `desc` (Default `desc`)
  - `page` (integer) — Page number (Default 1)
  - `pageSize` (integer) — 1 to 50; UI presets: 10, 20, 50 (Default 10)
- **Success Response (`200 OK`):**

  ```json
  {
    "tickets": [
      {
        "id": 101,
        "ticketNumber": "TKT-2026-000101",
        "summary": "VPN connection drops every 10 minutes",
        "categoryName": "Network",
        "relatedSystemName": "VPN",
        "priority": "HIGH",
        "itPriority": "URGENT",
        "status": "IN_PROGRESS",
        "requesterName": "Sorawit Chaithong",
        "assignedOwnerName": "Piti Srisongkram",
        "assignedOwnerId": 2,
        "createdAt": "2026-09-10T08:00:00.000Z",
        "updatedAt": "2026-09-10T08:35:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "totalRecords": 75,
      "totalPages": 8
    }
  }
  ```

---

### 5.2. Get Staff Ticket Detail

- **Method:** `GET`
- **Route:** `/api/staff/tickets/:id`
- **Access:** `IT_STAFF`, `ADMIN`
- **Success Response (`200 OK`):**
  Returns complete operational payload including attachments, public comments, and private internal notes.

---

### 5.3. Claim or Reassign Ticket Ownership

- **Method:** `PATCH`
- **Route:** `/api/staff/tickets/:id/assign`
- **Access:** `IT_STAFF`, `ADMIN`
- **Request Body:**

  ```json
  {
    "ticketOwnerId": 2
  }
  ```

  *(Pass `null` to unassign).*

- **Success Response (`200 OK`):**

  ```json
  {
    "ticket": {
      "id": 101,
      "ticketOwnerId": 2,
      "assignedOwnerName": "Piti Srisongkram"
    },
    "message": "Ownership updated successfully."
  }
  ```

- **Error Responses:**
  - `400 Bad Request` — Target user is not active or does not have role `IT_STAFF` or `ADMIN`.

---

### 5.4. Update Operational IT Priority

- **Method:** `PATCH`
- **Route:** `/api/staff/tickets/:id/priority`
- **Access:** `IT_STAFF`, `ADMIN`
- **Request Body:**

  ```json
  {
    "itPriority": "URGENT"
  }
  ```

- **Success Response (`200 OK`):**

  ```json
  {
    "ticket": {
      "id": 101,
      "itPriority": "URGENT"
    },
    "message": "IT Priority updated."
  }
  ```

---

### 5.5. Transition Ticket Status

- **Method:** `PATCH`
- **Route:** `/api/staff/tickets/:id/status`
- **Access:** `IT_STAFF`, `ADMIN`
- **Request Body:**

  ```json
  {
    "status": "IN_PROGRESS"
  }
  ```

- **Success Response (`200 OK`):**

  ```json
  {
    "ticket": {
      "id": 101,
      "status": "IN_PROGRESS"
    },
    "message": "Status transitioned successfully."
  }
  ```

- **Error Responses:**
  - `400 Bad Request` — Disallowed state transition per BR-14 (`INVALID_STATUS_TRANSITION`).

---

## 6. Administrator User Management APIs

### 6.1. List Users

- **Method:** `GET`
- **Route:** `/api/admin/users`
- **Access:** `ADMIN` strictly
- **Query Parameters:** `search` (name or email substring), `role` (`REQUESTER`, `IT_STAFF`, `ADMIN`)
- **Success Response (`200 OK`):**

  ```json
  {
    "users": [
      {
        "id": 1,
        "fullName": "Sorawit Chaithong",
        "email": "sorawit.chaithong@email.com",
        "role": "REQUESTER",
        "isActive": true,
        "mustChangePassword": false,
        "createdAt": "2026-08-01T00:00:00.000Z"
      }
    ]
  }
  ```

---

### 6.2. Create User

- **Method:** `POST`
- **Route:** `/api/admin/users`
- **Access:** `ADMIN` strictly
- **Request Body:**

  ```json
  {
    "fullName": "Kittiphat Admin",
    "email": "kittiphat.admin@email.com",
    "role": "ADMIN",
    "initialPassword": "InitialPass@2026",
    "isActive": true
  }
  ```

- **Success Response (`201 Created`):**

  ```json
  {
    "user": {
      "id": 10,
      "fullName": "Kittiphat Admin",
      "email": "kittiphat.admin@email.com",
      "role": "ADMIN",
      "isActive": true,
      "mustChangePassword": true
    },
    "message": "User created successfully."
  }
  ```

- **Error Responses:**
  - `400 Bad Request` — Password complexity failure or missing required fields.
  - `409 Conflict` — Email already registered (`EMAIL_ALREADY_EXISTS`).

---

### 6.3. Edit User Profile & Status

- **Method:** `PATCH`
- **Route:** `/api/admin/users/:id`
- **Access:** `ADMIN` strictly
- **Request Body:**

  ```json
  {
    "fullName": "Kittiphat Senior Admin",
    "email": "kittiphat.senior@email.com",
    "role": "ADMIN",
    "isActive": true
  }
  ```

- **Success Response (`200 OK`):**

  ```json
  {
    "user": {
      "id": 10,
      "fullName": "Kittiphat Senior Admin",
      "email": "kittiphat.senior@email.com",
      "role": "ADMIN",
      "isActive": true
    },
    "message": "User updated successfully."
  }
  ```

- **Error Responses:**
  - `400 Bad Request` — Self-deactivation attempted (`CANNOT_DEACTIVATE_SELF`).
  - `400 Bad Request` — Last active administrator deactivation/demotion attempted (`LAST_ADMIN_PROTECTED`).

---

### 6.4. Reset User Password

- **Method:** `POST`
- **Route:** `/api/admin/users/:id/reset-password`
- **Access:** `ADMIN` strictly
- **Request Body:**

  ```json
  {
    "newInitialPassword": "ResetPass@2026"
  }
  ```

- **Success Response (`200 OK`):**
  Sets `mustChangePassword = true`.

  ```json
  {
    "message": "Password reset successfully. User must change password at next login."
  }
  ```  