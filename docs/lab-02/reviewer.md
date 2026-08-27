# Lab 2 — Peer Review Record

**Author:** Kittiphat Noikate - GitHub: @MANGKONYOK  
**Peer reviewer:** Piti Srisongkram - Student ID: 67070503467 - GitHub: @kmood-Sakura  

---

## Pull Requests I Authored (Reviewed by My Partner)

| PR | Branch | Reviewer Verdict |
| :---: | :--- | :--- |
| #17 | `feature/1-spec-and-test-plan` | **Approved & Merged** |
| #... | `feature/2-requester-context` | *(Pending / In Progress)* |
| #... | `feature/3-create-ticket` | *(Pending / Approved)* |
| #... | `feature/4-my-tickets` | *(Pending / Approved)* |
| #... | `feature/5-ticket-detail-attachments` | *(Pending / Approved)* |
| #... | `feature/6-e2e-responsive-verification`| *(Pending / Approved)* |

### Reviewer Comments Received & Responses

#### PR #17 (`feature/1-spec-and-test-plan`)
- **Reviewer comment I received:**
  ```text
  specification.md needs all 11 sections (8.10). Missing 2 Stakeholder Request, 6 UI Summary, 8 API Contract, 11 Assumptions — 11 must rule on ticket-number format/uniqueness, attachment storage, create-then-upload atomicity, where the selected Requester lives, enums vs ref tables, and IT Priority/Owner in-or-out.
  9 endpoints, 6 wants 10 — missing attachment metadata (GET /api/tickets/:id/attachments).
  Status codes: no 409 (6th attachment / duplicate) or 500. Pick 403 or 404 for ownership — recommend 404.
  4 test tiers, labsheet wants 6 — UI-style and responsive missing (that's Part 9, 5 pts).
  Planned-test table columns must be Test ID | Type | Req/AC | What It Tests | Expected Result | Test File | Final.
  No ticket-number generator in the data model (BR-01 uniqueness), and 5.2 wants soft-removal representation, justified indexes, and Lab 3 auth evolution.
  ```
- **How I responded:**
  ```text
  Updated all 11 exact specification sections in specification.md with Section 11 rulings and Section 7.2 index justifications.
  Added the 10th endpoint GET /api/tickets/:id/attachments and standardized 404/409/500 error responses in api-spec.md.
  Expanded test plan in tests.md to full 6 test levels with required table headers and traceability matrix.
  Added planned screenshot artifact paths to ui-spec.md.
  ```

#### PR #... (`feature/2-requester-context`)
- **Reviewer comment I received:**
  ```text
  ...
  ```
- **How I responded:**
  ```text
  ...
  ```

#### PR #... (`feature/3-create-ticket`)
- **Reviewer comment I received:**
  ```text
  ...
  ```
- **How I responded:**
  ```text
  ...
  ```

#### PR #... (`feature/4-my-tickets`)
- **Reviewer comment I received:**
  ```text
  ...
  ```
- **How I responded:**
  ```text
  ...
  ```

#### PR #... (`feature/5-ticket-detail-attachments`)
- **Reviewer comment I received:**
  ```text
  ...
  ```
- **How I responded:**
  ```text
  ...
  ```

#### PR #... (`feature/6-e2e-responsive-verification`)
- **Reviewer comment I received:**
  ```text
  ...
  ```
- **How I responded:**
  ```text
  ...
  ```

---

## Pull Requests I Reviewed for My Partner (@kmood-Sakura)

| PR / Feature | Branch | Reviewer Verdict |
| :--- | :--- | :--- |
| Feature 1 | `feature/1-spec-and-test-plan` | *(Pending / Approved)* |
| Feature 2 | `feature/2-requester-context` | *(Pending / Approved)* |
| Feature 3 | `feature/3-create-ticket` | *(Pending / Approved)* |
| Feature 4 | `feature/4-my-tickets` | *(Pending / Approved)* |
| Feature 5 | `feature/5-ticket-detail-attachments` | *(Pending / Approved)* |
| Feature 6 | `feature/6-e2e-responsive-verification`| *(Pending / Approved)* |

### Comments Left & Partner's Responses

#### PR #... (`feature/1-spec-and-test-plan`)
- **My comment:**
  ```text
  ...
  ```
- **Partner's response:**
  ```text
  ...
  ```

#### PR #... (`feature/2-requester-context`)
- **My comment:**
  ```text
  ...
  ```
- **Partner's response:**
  ```text
  ...
  ```

#### PR #... (`feature/3-create-ticket`)
- **My comment:**
  ```text
  ...
  ```
- **Partner's response:**
  ```text
  ...
  ```

#### PR #... (`feature/4-my-tickets`)
- **My comment:**
  ```text
  ...
  ```
- **Partner's response:**
  ```text
  ...
  ```

#### PR #... (`feature/5-ticket-detail-attachments`)
- **My comment:**
  ```text
  ...
  ```
- **Partner's response:**
  ```text
  ...
  ```

#### PR #... (`feature/6-e2e-responsive-verification`)
- **My comment:**
  ```text
  ...
  ```
- **Partner's response:**
  ```text
  ...
  ```