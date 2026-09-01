# Lab 2 - AI Use and Reflection

**LLM / Agent used:** Antigravity (Gemini 3.7 Flash)

## Selected Key Prompts (6-10)

| # | Prompt (Summarised) | What I did with the result |
|---|---------------------|----------------------------|
| 1 | Summarize Lab 2 requirements, strict scope boundaries, issue dependencies and test specifications | Adopted the structured breakdown of the 6 sprint features, documentation files and Git Flow staging strategy.<br>**My Reflection:** Understanding project scope boundaries and Spec-Driven Development is essential before writing any production code. |
| 2 | Create Sprint 2 engineering contract and blank documentation templates in `docs/lab-02/` | Adopted the required submission sections and established the full specification documents (`specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md`, `reviewer.md`, `ai-use.md`).<br>**My Reflection:** Setting up clear specifications upfront prevents architectural drift and clarifies acceptance criteria early. |
| 3 | Plan and implement Feature 2: Development Requester testing context, PostgreSQL seed, reference APIs, and selector UI | Scaffolded `RequesterUser` and `RelatedSystem` Prisma models, wrote idempotent seed data with upsert, implemented `/api/requesters` and `/api/related-systems`, created Zen Green `RequesterContext` with localStorage persistence, and wrote automated unit and Supertest suites.<br>**My Reflection:** Implementing the simulated requester testing context strictly with `isActive: true` filtering prevents unauthorized or deleted users from being selected, and keeping the state in React Context cleanly isolates development simulation from production auth. |
| 4 | Plan and implement | *(To be updated)* |
| 5 | Plan and implement | *(To be updated)* |
| 6 | Plan and implement | *(To be updated)* |
| 7 | Plan and implement | *(To be updated)* |