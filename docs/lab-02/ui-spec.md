# Lab 2 Zen Green UI Specification

## 1. Zen Green Design System Tokens

| Token / Element | CSS Variable / Token | Hex Value | Intended Use & Context |
| :--- | :--- | :--- | :--- |
| **Primary Green** | `--color-primary` | `#006B3C` | App header bar, primary action buttons (Submit, Create Ticket), strong brand accents |
| **Secondary Green** | `--color-secondary` | `#0B7A46` | Active navigation tabs, keyboard focus outlines, hover states, interactive links |
| **Pale Green** | `--color-pale-green` | `#EAF6EF` | Selected table rows, positive feedback alert backgrounds, subtle status badges |
| **Page Background** | `--color-bg-page` | `#F5F7F6` | Quiet, clean near-white canvas background across all application views |
| **Surface / Card** | `--color-surface` | `#FFFFFF` | Form cards, tables, modal containers with 1px border (`#E2E8F0`) and soft shadow |
| **Primary Text** | `--color-text-main` | `#1B2E24` | High-contrast dark charcoal-green for headings, body text, and table cells |
| **Muted Text** | `--color-text-muted`| `#5F7367` | Descriptive captions, field helper text, table column headers, timestamps |
| **Editable Field** | `--color-field-bg` | `#FFFFFF` | Input background with 1px `#CBD5E1` border; focus ring: 2px `#0B7A46` |
| **Read-Only Field** | `--color-readonly-bg`| `#F0F4F1` | Distinct soft gray-green background, disabled border, clear readable text |
| **Error / Invalid** | `--color-error` | `#C5221F` | Red input border and immediate inline field-level validation message |
| **Warning** | `--color-warning` | `#D97706` | Amber badge, warning callouts (never used as ordinary decorative elements) |
| **Success** | `--color-success` | `#15803D` | Success confirmation alerts, green badges with explicit text |

---

## 2. Responsive Breakpoints & Viewport Rules

```
+-----------------------------------------------------------------------------------+
| Desktop Viewport (>= 992px)                                                       |
| - Max width: 1200px (centered with auto margin)                                   |
| - Multi-column forms (Category & System side-by-side)                             |
| - Full data table with column headers, sort triggers, and pagination controls     |
+-----------------------------------------------------------------------------------+
| Tablet Viewport (768px - 991px)                                                   |
| - 2-column layout preserved where practical                                       |
| - Summary and Description given full width                                        |
| - Condensed table layout with horizontal scroll wrapper or compact cells          |
+-----------------------------------------------------------------------------------+
| Mobile Viewport (< 768px)                                                         |
| - Single-column vertical stacking for all controls                               |
| - Card-based ticket representation instead of wide data tables                    |
| - Touch-friendly hit targets (min height 44px for buttons, inputs, selects)       |
| - Zero horizontal page scrolling (overflow-x: hidden on viewport container)       |
+-----------------------------------------------------------------------------------+
```

---

## 3. Component Standards & Interaction States

### 3.1. Form Fields & Validation
- **Labels:** Positioned directly above controls in semi-bold charcoal (`#1B2E24`).
- **Required Fields:** Marked with a red asterisk (`*`). The asterisk is supplementary to clear inline validation text.
- **Validation Placement:** Field-level error messages appear **immediately below** the invalid input in `#C5221F` with a small error icon.
- **Read-Only Fields:** Styled with background `#F0F4F1`, subtle border `#D1D5DB`, and full cursor default (never standard white editable look).

### 3.2. Button Hierarchy & States
- **Primary Button:** `#006B3C` background, white bold text. Hover: `#0B7A46`.
- **Secondary Button:** `#FFFFFF` background, `#006B3C` text and 1px border. Hover: `#EAF6EF`.
- **Destructive Button:** `#C5221F` background or outline for soft-removal confirmations.
- **Busy / Processing State:** Submit buttons show an inline CSS spinner, disable pointer events, and display text such as *"Submitting..."* or *"Uploading..."*.

### 3.3. Badges & Status Indicators
- **Requested Priority:**
  - `URGENT`: Crimson background `#FEE2E2`, text `#991B1B`
  - `HIGH`: Orange background `#FFEDD5`, text `#C2410C`
  - `MEDIUM`: Amber background `#FEF3C7`, text `#B45309`
  - `LOW`: Slate/Gray background `#F1F5F9`, text `#475569`
- **Current Status:**
  - `NEW`: Pale green background `#EAF6EF`, text `#006B3C`
  - `IN_PROGRESS`: Blue background `#E0F2FE`, text `#0369A1`
  - `RESOLVED`: Emerald background `#DCFCE7`, text `#15803D`
  - `CLOSED`: Gray background `#F3F4F6`, text `#374151`

---

## 4. Screen Layouts

### 4.1. Development Requester Selector
- Centered modal/card displaying user icon and clear title: **"Select Development Requester"**.
- Prominent info banner: *"Choose a development requester to simulate the current requester context for Lab 2. This is for testing only and is not a login screen. Authentication coming in Lab 3."*
- Dropdown listing only active seed users (`Sorawit Chaithong`, `Piti Srisongkram`, `John Doe`, `Jane Doe`).
- "Continue" primary button directing into My Tickets.

### 4.2. Header & Application Shell
- Brand title **"TokTickIT"** with ticket icon.
- Navigation links: **"My Tickets"** and **"+ Create Ticket"**. Active route indicated with bold text and secondary green highlight.
- Right-aligned profile dropdown showing selected Requester name and a **"Change Requester"** action.

### 4.3. Create Ticket Screen
- **Read-only Header:** Ticket Date (current timestamp) and Requester Name in `#F0F4F1`.
- **Classification Section:** Category dropdown (Account and Access, Hardware, Software, Network) and Related System dropdown (7 options) in a responsive grid.
- **Priority Selector:** Radio group or dropdown for Requested Priority (`LOW`, `MEDIUM`, `HIGH`, `URGENT`).
- **Ticket Summary:** Single-line text input (5-100 chars) with character counter.
- **Description:** Multiline textarea (10-2000 chars).
- **Attachments:** File dropzone accepting JPG, PNG, WEBP, PDF up to 5MB (max 5 active).
- **Actions:** Primary "Submit Ticket" button and Secondary "Cancel" button.
- **Success Banner:** Green alert containing the official generated `Ticket Number` and button to view ticket.

### 4.4. My Tickets Screen
- **Filter Bar:** Search input (Ticket Number / Summary), Category filter, Priority filter, Status filter, and "Clear Filters" button.
- **Top Actions:** "+ Create Ticket" primary button.
- **Table Columns (Desktop):** Ticket No, Created Date, Summary, Category, Requested Priority, IT Priority, Current Status, Ticket Owner, Last Updated.
- **Pagination Bar:** Displaying *"Showing X to Y of Z tickets"*, previous/next buttons, and numbered page buttons.
- **Empty States:**
  - *No tickets in system:* Shows friendly empty inbox graphic and "+ Create Ticket" button.
  - *No tickets matching filters:* Shows "No tickets found matching your search criteria" with a "Clear Filters" button.

### 4.5. Requester Ticket Detail Screen
- Navigation breadcrumb: `My Tickets > Ticket Details` with a "Back to My Tickets" button.
- Read-only details grid with all ticket information in `#F0F4F1`.
- **Attachment Section:**
  - List of active attachments with download links and "Remove" destructive button.
  - "+ Add Attachment" button triggering file upload modal.
  - Soft-removal confirmation modal prompting for a mandatory removal reason.
  - Audit section listing soft-removed attachments (metadata visible, download link disabled/blocked).

---

## 5. Visual Inspection Checklist

| Check Item | Acceptance Criteria | Verified |
| :--- | :--- | :---: |
| **Color Fidelity** | Primary `#006B3C`, Secondary `#0B7A46`, Pale `#EAF6EF` used accurately across views | [ ] |
| **Read-Only Distinction** | Read-only fields clearly shaded with `#F0F4F1` and distinct from editable inputs | [ ] |
| **Validation Placement** | Field error messages appear immediately below their respective inputs in `#C5221F` | [ ] |
| **Required Markers** | All required fields display red asterisk `*` | [ ] |
| **Button Hierarchy** | Primary, Secondary, Destructive, and Disabled states are visually distinct | [ ] |
| **Busy State** | Submit and Upload buttons show spinner and disable interactions during API calls | [ ] |
| **Desktop Layout** | Clean multi-column grid centered up to 1200px width on $\ge 992\text{px}$ viewports | [ ] |
| **Tablet Layout** | Responsive 2-column layout without overlapping elements on $768\text{px}-991\text{px}$ | [ ] |
| **Mobile Layout** | Single-column stacked layout, card views, $\ge 44\text{px}$ touch targets on $< 768\text{px}$ | [ ] |
| **Zero Overflow** | No unintended horizontal scrollbars at any screen width | [ ] |

---

## 6. Planned Screenshot Artifact Paths

The following screenshot evidence paths are planned for submission (Answer Parts 6-9):

### 6.1. Create Ticket (`artifacts/lab-02/screenshots/create-ticket/`)
- `01-requester-selector.png`: Development Requester selection modal with active user dropdown.
- `02-create-ticket-initial-desktop.png`: Create Ticket form initial state at Desktop ($\ge 992\text{px}$).
- `03-validation-errors.png`: Inline field error messages immediately below invalid controls.
- `04-submitting-busy-state.png`: Submit button in disabled busy state with loading spinner.
- `05-create-success-banner.png`: Green success confirmation showing generated Ticket Number.
- `06-api-failure-preserved.png`: Network/server failure banner with all form inputs preserved.
- `07-invalid-attachment-alert.png`: Error alert on oversized file (>5MB) or invalid extension.

### 6.2. My Tickets (`artifacts/lab-02/screenshots/my-tickets/`)
- `01-my-tickets-desktop.png`: Multi-column data table with status and priority badges.
- `02-my-tickets-mobile.png`: Single-column stacked card representation at $< 768\text{px}$.
- `03-search-and-filtered.png`: Filtered results by category, priority, and search keyword.
- `04-empty-state.png`: Empty queue graphic and "+ Create Ticket" call-to-action for new user.
- `05-no-results-state.png`: "No matching tickets found" with "Clear Filters" button.
- `06-switch-requester-isolation.png`: Evidence showing User A's tickets disappear when switching to User B.

### 6.3. Ticket Detail & Attachments (`artifacts/lab-02/screenshots/ticket-detail/`)
- `01-ticket-detail-readonly.png`: Read-only ticket header with shaded `#F0F4F1` fields.
- `02-active-attachments-list.png`: List of active attachments with download and remove buttons.
- `03-upload-attachment-modal.png`: Add attachment dialog enforcing 5-active-file limit.
- `04-soft-remove-modal.png`: Mandatory removal reason prompt and confirmation dialog.
- `05-removed-attachment-audit.png`: Removed attachment shown in audit list with blocked download.
- `06-cross-requester-404.png`: Evidence of 404 response on attempting to view another user's ticket.