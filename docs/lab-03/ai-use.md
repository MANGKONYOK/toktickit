# Lab 3 — AI Use and Reflection

**LLM / Agent used:** Antigravity (Gemini 3.8 Flash)

---

## Selected Key Prompts

| # | Prompt (Summarised) | What I did with the result |
|---|---------------------|----------------------------|
| 1 | Analyze the CPE 334 Lab 3 labsheet, identify sprint scope boundaries, define the 7-feature breakdown, and formulate the role authorization matrix across `REQUESTER`, `IT_STAFF`, and `ADMIN`. | Established the exact scope boundaries (e.g., real email/password authentication, 3 roles, mandatory first-login password change, IT staff queue, internal notes, minimalist admin user management; strictly excluding self-registration, magic links, SMTP delivery, MFA, and hard user deletion) and mapped out the 7 git feature branches and PR pipeline targeting `lab3-staging`.<br>**My Reflection:** Establishing strict scope boundaries and role definitions prior to development prevents feature creep and ensures that security boundaries are treated as hard contracts rather than afterthoughts. |
| 2 | Author the Sprint 3 engineering contract deliverables in `docs/lab-03/` (`specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md`), detailing all 15 Functional Requirements, 25 Business Rules, 22 Acceptance Criteria, 8 permitted status transitions, and data schema evolution. | Created the complete set of contract documents. Defined the `User`, `Role`, `Comment`, and `InternalNote` data models, the exact 8 allowed ticket status transitions (`NEW` $\to$ `OPEN`, `CANCELLED`; `OPEN` $\to$ `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CANCELLED`, etc.), the strict confidentiality rules for Internal Notes (HTTP 403 for Requesters), and the 6-tier test architecture with AC traceability.<br>**My Reflection:** Specifying the API contracts and status transition rules upfront eliminates ambiguities during backend implementation and ensures the server-side state machine cannot be bypassed by client-side shortcuts. |

*(Prompts 3 through 10 will be recorded incrementally as Features 2 through 7 are planned and implemented step-by-step).*