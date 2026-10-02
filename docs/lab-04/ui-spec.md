# Lab 4 UI Specification

## TokTickIT — Zen Green Design System, Dashboards, and Actions Taken

---

## 1. Zen Green Design System Tokens & Foundations

The user interface strictly adheres to and extends the established **Zen Green** design tokens to ensure visual and behavioral unity across the entire application shell.

### 1.1. Color System Variables

```css
:root {
  /* Brand Palette — Zen Green Primary & Accents */
  --zg-primary: #1b4332;
  --zg-primary-hover: #2d6a4f;
  --zg-primary-active: #143526;
  --zg-primary-light: #d8f3dc;
  --zg-primary-glow: rgba(45, 106, 79, 0.15);

  /* Surface & Neutral Colors */
  --zg-bg: #f8fafc;
  --zg-surface: #ffffff;
  --zg-surface-elevated: #ffffff;
  --zg-border: #e2e8f0;
  --zg-border-focus: #2d6a4f;
  --zg-text-main: #0f172a;
  --zg-text-muted: #64748b;
  --zg-text-subtle: #94a3b8;

  /* Lifecycle Status Badges (Always paired with icon & label) */
  --zg-badge-new-bg: #eff6ff;
  --zg-badge-new-text: #1d4ed8;
  --zg-badge-open-bg: #f0f9ff;
  --zg-badge-open-text: #0369a1;
  --zg-badge-progress-bg: #fffbeb;
  --zg-badge-progress-text: #b45309;
  --zg-badge-waiting-bg: #faf5ff;
  --zg-badge-waiting-text: #7e22ce;
  --zg-badge-resolved-bg: #f0fdf4;
  --zg-badge-resolved-text: #15803d;
  --zg-badge-closed-bg: #f1f5f9;
  --zg-badge-closed-text: #475569;
  --zg-badge-reopened-bg: #fff7ed;
  --zg-badge-reopened-text: #c2410c;
  --zg-badge-cancelled-bg: #fef2f2;
  --zg-badge-cancelled-text: #b91c1c;

  /* Priority Indicators */
  --zg-priority-low: #64748b;
  --zg-priority-medium: #0284c7;
  --zg-priority-high: #d97706;
  --zg-priority-urgent: #dc2626;

  /* Confidential Internal Notes (Amber Styling) */
  --zg-note-bg: #fffbeb;
  --zg-note-border: #fcd34d;
  --zg-note-text: #92400e;

  /* Actions Taken Card Tokens */
  --zg-action-bg: #ffffff;
  --zg-action-border: #e2e8f0;
  --zg-action-performer-bg: #e6f4ea;
  --zg-action-performer-text: #137333;
  --zg-action-followup-bg: #fff7ed;
  --zg-action-followup-border: #fdba74;
  --zg-action-followup-text: #9a3412;

  /* Metric Cards */
  --zg-metric-bg: #ffffff;
  --zg-metric-border: #e2e8f0;
  --zg-metric-hover-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.08);

  /* Elevation Shadows */
  --zg-shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --zg-shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04);
  --zg-shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04);
}
```

---

## 2. Screen Specifications

### 2.1. IT Staff Dashboard (`/staff/dashboard`)

- **Top Operational Metric Cards (4 Cards Grid):**
  - **Card 1: Unassigned Queue**
    - Label: `Unassigned Tickets`
    - Value: Large bold integer (e.g., `4`)
    - Subtext / Badge: Amber badge indicating "Needs Triage" when > 0
    - Interaction: Click routes to `/staff/tickets?assigned=unassigned`
  - **Card 2: My Work Queue**
    - Label: `My Active Tickets`
    - Value: Large bold integer (e.g., `6`)
    - Subtext / Badge: Green badge indicating active ownership
    - Interaction: Click routes to `/staff/tickets?assigned=me`
  - **Card 3: Waiting for Requester**
    - Label: `Awaiting Feedback`
    - Value: Large bold integer (e.g., `3`)
    - Subtext / Badge: Purple badge
    - Interaction: Click routes to `/staff/tickets?status=WAITING_FOR_REQUESTER`
  - **Card 4: Urgent Priority**
    - Label: `Urgent Tickets`
    - Value: Large bold integer (e.g., `2`)
    - Subtext / Badge: Rose/red badge indicating "Critical" when > 0
    - Interaction: Click routes to `/staff/tickets?priority=URGENT`
- **Breakdown Analytics Panels:**
  - **Status Breakdown:** Visual stacked bar and counter pills for all 8 statuses (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`).
  - **Priority Breakdown:** Distribution badges for `LOW`, `MEDIUM`, `HIGH`, `URGENT`.
- **Current User Recent Actions Section:**
  - Displays the last 5 actions recorded by `req.user.id`.
  - Columns / Card details: Action Date/Time, Ticket #, Description snippet, Result snippet, Follow-up indicator, and link to Ticket Detail.
- **Urgent Attention Table:**
  - Highlights unassigned tickets and urgent tickets requiring immediate triage.

---

### 2.2. Requester Dashboard (`/dashboard`)

- **Summary Metric Cards (4 Cards Grid):**
  - **Card 1: Open Requests**
    - Label: `Total Open Tickets`
    - Value: Integer count of active tickets
    - Interaction: Click routes to `/tickets?tab=open`
  - **Card 2: Attention Required**
    - Label: `Waiting for Your Input`
    - Value: Integer count of tickets in `WAITING_FOR_REQUESTER`
    - Subtext / Accent: Bold warning border and alert icon when count > 0
    - Interaction: Click routes to `/tickets?tab=waiting`
  - **Card 3: Recently Updated**
    - Label: `Updated in Past 7 Days`
    - Value: Integer count
    - Interaction: Click routes to `/tickets?tab=recent`
  - **Card 4: Resolved & Closed**
    - Label: `Recently Resolved`
    - Value: Integer count
    - Interaction: Click routes to `/tickets?tab=resolved`
- **Quick Action Bar:** Prominent primary green button `"Create New Ticket"` routing to `/tickets/new`.
- **Recent Requests Table:**
  - Compact table displaying the 5 most recent tickets: Ticket #, Subject, Category, Status badge, Priority badge, Last Updated relative timestamp (`X hours ago`), and `"View Details"` link.
- **Zero-State Display:** Clean empty-state graphic with `"No active tickets found. Submit a request to get assistance from IT."` when ticket count is 0.

---

### 2.3. Actions Taken Section on Staff Ticket Detail (`/staff/tickets/:id`)

- **Placement:** Positioned as a dedicated tab/panel directly below Ticket Metadata, alongside Public Comments and Internal Notes.
- **Header:**
  - Title: `"Actions Taken"` with counter badge (e.g., `Actions (3)`).
  - Action Button: `"+ Record Action"` button (primary green).
- **Action Item Card Specification:**
  - **Performer Badge:** Forest green pill showing Performer Name, role (`IT_STAFF` or `ADMIN`), and checkmark icon.
  - **Timestamp:** Formatted ISO date-time (e.g., `Oct 2, 2026, 09:15 AM`).
  - **Description Block:** Quoted block detailing the exact diagnostic or technical action performed.
  - **Result Block:** Distinct light-gray card showing the outcome of the action.
  - **Follow-Up Section:**
    - If `followUpRequired == true`: Prominent orange/amber badge `"Follow-Up Required"` with accompanying note text in amber card.
    - If `followUpRequired == false`: Subtle gray badge `"No Follow-Up Needed"`.
  - **Attachment Notes Section:** If present, displayed with paperclip icon and blue-gray note (e.g., `"Refer to file: traceroute_vpn.txt"`).
  - **Controls:** `"Edit"` button opening the edit modal.
- **Record / Edit Action Modal:**
  - Modal title: `"Record Action Taken"` or `"Edit Action Taken"`.
  - Field 1: **Performer** (Read-only input showing authenticated user name).
  - Field 2: **Action Date/Time** (Date-time input with `"Now"` shortcut).
  - Field 3: **Description of Action** (Textarea, 1..2000 chars, dynamic character counter).
  - Field 4: **Result / Outcome** (Textarea, 1..2000 chars, dynamic character counter).
  - Field 5: **Follow-Up Required?** (Checkbox toggle).
  - Field 6: **Follow-Up Note** (Textarea, conditionally revealed and marked required when checkbox is checked).
  - Field 7: **Attachment Notes** (Optional single-line text input, e.g., `"Photo of damaged cable"`).
  - Buttons: `"Save Action Taken"` (primary green) and `"Cancel"`.

---

### 2.4. Actions Taken Section on Requester Ticket Detail (`/tickets/:id`)

- **Read-Only Mode:**
  - Requesters see the complete timeline of Actions Taken by IT Staff to provide full transparency on work progress.
  - Create and Edit buttons are completely omitted.
  - Requesters can see what action was taken, who performed it, and the result.

---

### 2.5. Ticket Resolution Gate & Concurrency Feedback

- **Status Transition Controls:**
  - Status select dropdown or pill buttons displaying only permitted transitions from current state.
  - Requester view shows `"Problem Resolved"` advisory button when ticket is in `OPEN`, `IN_PROGRESS`, or `WAITING_FOR_REQUESTER`.
- **Optimistic Concurrency Conflict Dialog (HTTP 409):**
  - Modal or top banner appears if another user modified the ticket simultaneously:
    - Heading: `"Ticket Updated by Another User"`
    - Message: `"The ticket status or details were changed by another staff member while you were working. To prevent overwriting their changes, please refresh the latest state."`
    - Action: `"Reload Ticket Data"` button.

---

## 3. Responsive Breakpoint & Layout Rules

| Viewport | Range | Dashboard Layout | Ticket Detail & Actions Taken Layout |
| :--- | :--- | :--- | :--- |
| **Desktop** | >= 992px | 4-column metric grid; 2-column analytics split. | 2-column split (ticket attributes and notes on left, Actions Taken timeline on right). Full modals with 560px max-width. |
| **Tablet** | 768px - 991px | 2-column metric grid; stacked analytics cards. | Single-column stacked layout with compact metadata chips and expandable action cards. |
| **Mobile** | < 768px | 1-column vertically stacked cards; compact tables. | 1-column full-width action cards; bottom-sheet or full-screen modal; sticky action footer; zero horizontal scroll (`overflow-x: hidden`). |

---

## 4. Accessibility & Visual Design Standards (WCAG 2.1 AA)

- **Color Independence:** Statuses and priorities use color *plus* an icon, text label, and unique border style. No information is conveyed by color alone.
- **Focus Indicators:** All interactive elements (metric cards, buttons, inputs, modal dialogs) display a high-contrast focus outline (`outline: 2px solid var(--zg-primary); outline-offset: 2px`).
- **Semantic HTML & ARIA:**
  - Metric cards are structured as clickable semantic articles with `role="region"` or anchor links with clear `aria-label`.
  - Modals use `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, and trap focus until closed.
  - Custom tooltips use `data-tooltip` attribute instead of the browser `title` attribute.
- **Form Validation & Blur Rule:**
  - Per [AGENTS.md](file:///c:/Users/KITTIPHAT%20NOIKATE/Desktop/SoftEn_Lab/agents_md/AGENTS.md) work norms, invalid inputs during general typing clear on blur.
  - Form-level error messages display only upon clicking `"Save Action Taken"`.
