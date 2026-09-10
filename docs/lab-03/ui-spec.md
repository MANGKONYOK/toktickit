# Lab 3 UI Specification & Design System

## TokTickIT — Zen Green Theme, RBAC Shell Navigation & Operational Screens

---

## 1. Zen Green Design Tokens

The application strictly enforces the established Zen Green color palette and typography across all screens:

| Design Token | CSS Custom Property | Hex Value | Intended Usage |
| :--- | :--- | :---: | :--- |
| **Primary Green** | `--color-primary` | `#006B3C` | App header, primary CTA buttons, active branding |
| **Primary Hover** | `--color-primary-hover` | `#0B7A46` | Button hover and active press states |
| **Light Tint** | `--color-primary-light` | `#EAF6EF` | Success alert backgrounds, active status chips, row highlight |
| **Card / Shading** | `--color-card-bg` | `#F0F4F1` | Shaded read-only fields, standard card backgrounds |
| **Page Background** | `--color-page-bg` | `#F5F7F6` | Main application canvas background |
| **Danger / Error** | `--color-danger` | `#C5221F` | Form validation errors, error banners, destructive buttons |
| **Warning / Amber** | `--color-warning` | `#B06000` | Urgent badges, warning notices |
| **Internal Note Tint**| `--color-note-bg` | `#FFF8E1` | **Confidential Internal Note card background** (Warm amber) |
| **Internal Note Border**|`--color-note-border` | `#FFE082` | **Confidential Internal Note border** (Distinct warning border) |
| **Focus Ring** | `--color-focus-ring` | `#80BD9E` | Visible $\ge 2\text{px}$ outline for keyboard navigation accessibility |
| **Text Primary** | `--color-text-primary` | `#1B2E24` | Primary high-contrast body text and headings |
| **Text Muted** | `--color-text-muted` | `#526058` | Descriptive labels, timestamps, placeholder text |

---

## 2. Application Shell & Role-Based Navigation

The top navigation header dynamically reflects authentication state and assigned role:

```text
[Unauthenticated]
┌────────────────────────────────────────────────────────────────────────┐
│ 🌿 TokTickIT                                                  [Sign In]│
└────────────────────────────────────────────────────────────────────────┘

[Role: REQUESTER]
┌────────────────────────────────────────────────────────────────────────┐
│ 🌿 TokTickIT   My Tickets   Create Ticket    👤 Sorawit [Requester] [Logout]│
└────────────────────────────────────────────────────────────────────────┘

[Role: IT_STAFF]
┌────────────────────────────────────────────────────────────────────────┐
│ 🌿 TokTickIT   Ticket Queue                  👤 Piti [IT Staff]     [Logout]│
└────────────────────────────────────────────────────────────────────────┘

[Role: ADMIN]
┌────────────────────────────────────────────────────────────────────────┐
│ 🌿 TokTickIT   Ticket Queue  User Management 👤 Admin [Admin]        [Logout]│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Screen Specifications

### 3.1. Login Screen (`/login`)

- **Layout:** Centered Zen Green authentication card ($420\text{px}$ width) on `#F5F7F6` canvas.
- **Controls:** Email input (`type="email"`), Password input (`type="password"`), "Sign In" primary button.
- **States:**
  - *Validation Error:* Red border (`#C5221F`) and inline error text below invalid inputs.
  - *Authentication Failure:* Red dismissible alert banner displaying generic rejection message.
  - *Inactive Account Failure:* Distinct alert message informing user the account is inactive.
  - *Busy State:* Submit button disabled with loading spinner (`Signing In...`).

---

### 3.2. Mandatory First-Login Password Change Screen / Modal (`/change-password`)

- **Condition:** Intercepts authenticated users with `mustChangePassword === true`. Normal application screens and navigation are completely blocked.
- **Controls:** Current Password, New Password, Confirm New Password, "Update Password and Continue" button.
- **Validation Rules Display:** Real-time checklist showing:
  - Minimum 8 characters
  - At least 1 uppercase letter (`A-Z`)
  - At least 1 lowercase letter (`a-z`)
  - At least 1 number (`0-9`)
  - At least 1 special symbol (`@$!%*?&#^_-`)
- **Confirmation:** Disables button until passwords match and satisfy all rules.

---

### 3.3. Requester Ticket Detail Updates (`/tickets/:id`)

- **Read-Only Requester Shading:** Preserves `#F0F4F1` card styling from Lab 2.
- **"Problem Appears Resolved" Action:** Visible for open tickets (`OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`). Renders as a secondary Zen Green button. Clicking sets `resolvedByRequester = true` (without changing status, per BR-05) and prompts for an optional thank-you comment.
- **Public Comments Stream:** Located below ticket description. Displays threaded comments in chronological order with author name, role badge (`Requester`, `IT Staff`, `Admin`), and relative timestamp. Includes an input textarea and "Post Comment" button.

---

### 3.4. IT Staff Ticket Queue (`/staff/tickets`)

- **Search & Filter Toolbar:**
  - Substring search input for Ticket Number or Summary.
  - Dropdown filters for Category, Priority, Status, and Assignment (`All Tickets`, `Unassigned`, `Assigned to Me`).
  - "Clear Filters" reset button.
- **Desktop Table View ($\ge 992\text{px}$):** Multi-column table with headers:
  `Ticket #`, `Date`, `Requester`, `Category`, `System`, `Priority`, `Status`, `Assigned To`, `Actions`.
  Headers for sortable columns include interactive sort indicators (`▲`/`▼`).

- **Tablet View ($768\text{px}-991\text{px}$):** Compact table with secondary columns collapsed and horizontal scrolling enabled on table container.
- **Mobile Stacked Cards View ($< 768\text{px}$):** Replaces table with stacked cards showing Ticket Number, Status pill, Priority badge, Summary, Requester name, and "View Details" button ($\ge 44\text{px}$ height).
- **Empty & No-Results States:**
  - *Empty Queue:* Friendly illustration indicating zero tickets in the system.
  - *Filtered No Results:* "No tickets match your filter criteria" with a "Reset Filters" action.

---

### 3.5. IT Staff Ticket Detail & Operations (`/staff/tickets/:id`)

- **Layout:** Grouped dual-column operational layout.
  - *Left Column:* Read-only requester information card, description, attachments list with upload and soft-remove capabilities.
  - *Right Column (Operational Controls):*
    - **Assigned Owner Dropdown:** Lists active IT Staff and Admins. Option to unassign (`Unassigned`).
    - **IT Priority Dropdown:** `LOW`, `MEDIUM`, `HIGH`, `URGENT` badges.
    - **Status Transition Dropdown:** Only permitted next statuses according to BR-14 are enabled; invalid options are omitted.
    - "Save Operational Changes" button with busy state indicator.
- **Public Comments Tab:** Standard Zen Green comment thread visible to both staff and requester.
- **Confidential Internal Notes Tab / Panel:**
  - **Visual Distinction:** Shaded in warm amber `#FFF8E1` with `#FFE082` border and a prominent 🔒 lock icon labeled **"Internal Note — Confidential to IT Staff & Admin"**.
  - Internal notes stream showing author name, staff role badge, timestamp, and note body.
  - New note input with clear warning: *"Internal notes are never disclosed to the requester."*

---

### 3.6. Administrator User Management (`/admin/users`)

- **Toolbar:** Name/email search input, Role filter dropdown (`All Roles`, `REQUESTER`, `IT_STAFF`, `ADMIN`), and "+ Create User" primary CTA button.
- **User List Table:** Displays `Name`, `Email`, `Role` (colored badge), `Status` (`Active` green / `Inactive` gray), `First Login Password Change` status, and `Actions` button (`Edit / Reset Password`).
- **Create User Drawer / Modal:**
  - Form fields: Full Name, Email, Role select, Initial Password, Active toggle (`default: true`).
  - Explanatory text: *"The user will be required to change this initial password upon first login."*
- **Edit User Modal:**
  - Editable Full Name, Email, Role, and Active Status toggle.
  - Guardrail alert: If the administrator attempts to deactivate their own account or the last active admin, the toggle is disabled or submitting produces an explicit red error alert.
- **Reset Password Modal:**
  - Field: New Initial Password.
  - Resets password hash and forces `mustChangePassword = true`.

---

## 4. Visual Inspection Checklist & Planned Artifact Paths

### 4.1. Visual Checklist

- [ ] **Color Tokens:** Zen Green `#006B3C` used for primary actions, `#0B7A46` for active/focus, `#EAF6EF` for light highlights, `#FFF8E1` for Internal Notes.
- [ ] **Role Shell:** Correct navbar navigation rendered for unauthenticated, requester, staff, and admin.
- [ ] **Read-Only Shading:** `#F0F4F1` applied to non-editable fields and background cards.
- [ ] **Touch Targets:** All interactive controls (buttons, links, select inputs) measure $\ge 44\text{px} \times 44\text{px}$.
- [ ] **Zero Horizontal Overflow:** Document width strictly matches viewport width ($375\text{px}$, $768\text{px}$, $1280\text{px}$).
- [ ] **Confidential Contrast:** Internal Notes panel visually distinct from Public Comments to prevent data leakage.

### 4.2. Planned Screenshot Artifact Paths (`artifacts/lab-03/screenshots/`)

#### 1. Authentication (`artifacts/lab-03/screenshots/authentication/`)

- `01-login-screen.png`: Initial desktop login screen.
- `02-login-validation-errors.png`: Field-level validation on empty/invalid login.
- `03-login-inactive-account.png`: Clear alert rejection for deactivated account.
- `04-mandatory-password-change.png`: First-login password change modal with complexity rules.
- `05-authenticated-navbar-roles.png`: Composite showing navbar for Requester, Staff, and Admin.

#### 2. Staff Queue (`artifacts/lab-03/screenshots/staff-queue/`)

- `01-staff-queue-desktop.png`: Multi-column queue table on Desktop ($\ge 992\text{px}$).
- `02-staff-queue-tablet.png`: Compact queue layout on Tablet ($768\text{px}-991\text{px}$).
- `03-staff-queue-mobile.png`: Stacked cards queue layout on Mobile ($< 768\text{px}$).
- `04-search-and-filtered-queue.png`: Queue with keyword search and category/status filters applied.
- `05-queue-empty-and-no-results.png`: Empty queue vs. no-results filter state.

#### 3. Staff Ticket Detail (`artifacts/lab-03/screenshots/staff-ticket-detail/`)

- `01-staff-ticket-detail-desktop.png`: Grouped layout with operational controls and requester info.
- `02-ownership-and-priority-edit.png`: Claiming ownership and overriding IT Priority.
- `03-status-transitions.png`: Governed status transitions dropdown.
- `04-public-comments-thread.png`: Public comments stream with author badges.
- `05-internal-notes-confidential-panel.png`: Shaded amber Internal Notes panel with lock badge.
- `06-requester-403-notes-blocked.png`: Evidence of 403 response when requester attempts note access.

#### 4. User Management (`artifacts/lab-03/screenshots/user-management/`)

- `01-admin-user-list-desktop.png`: User administration table with role badges and active status.
- `02-admin-create-user-modal.png`: Create user form with initial password.
- `03-admin-edit-user-modal.png`: Editing user details and role.
- `04-admin-reset-password-modal.png`: Resetting password with first-login change flag.
- `05-admin-self-deactivation-guard.png`: Error alert preventing self-deactivation of administrator.
- `06-admin-last-admin-guard.png`: Error alert preventing deactivation of the last active administrator.
