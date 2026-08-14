# Lab 1 — AI Use and Reflection

**LLM/agent used:** Antigravity (Gemini 3.7 Flash & 3.6 Flash)

## Selected key prompts (6–10)
| # | Prompt (summarised) | What I did with the result |
|---|---------------------|----------------------------|
| 1 | Summary report tasks and show implementation plan overview | Adopted the structured breakdown of the 4 lab issues, documentation files, and Mermaid workflow diagrams. |
| 2 | Recommend report file format and submission structure | Adopted the 6-section template in Google Docs instead of LaTeX to keep documentation concise and focused. |
| 3 | Show implementation plan for Issue 1 (Project Foundation) | Reviewed the step-by-step setup checklist for environment initialization, dependencies, and database verification. |
| 4 | Check PostgreSQL download and local database status | Analyzed system services and identified that a dedicated Docker PostgreSQL instance was required on port 5432. |
| 5 | Spin up a new PostgreSQL Docker container specifically for TokTickIT | Provisioned the `toktickit-db` container with default credentials matching `.env.example` to ensure environment consistency. |
| 6 | Proceed with Issue 1 setup (install dependencies, create `.env`, test dev servers) | Executed client & server package installation, generated `.env` configurations, and verified builds and baseline tests. |
| 7 | Diagnose fatal pathspec error when adding `package-lock.json` | Corrected the terminal working directory from workspace root (`SoftEn_Lab`) to project directory (`toktickit`). |
| 8 | Draft PR #1 title and description against `lab1-staging` | Generated standardized PR markdown description with git diff summaries, test verification evidence, and issue closing tag. |
| 9 | Resolve Git remote conflict and isolate `toktickit` repository from old `Vanz` repo | Re-initialized a clean, independent `.git` repository for `toktickit` and pushed `lab1-staging` and `feature/1-project-foundation`. |

## Reflection
Structuring prompts to ask for an implementation plan and verification steps before executing actions made the agent responses much more reliable and aligned with the lab requirements. When Git commands failed due to working directory mismatches and nested repository conflicts with a previous project (`Vanz`), I prompted the agent to diagnose the root cause and isolate `toktickit` into its own dedicated Git repository.
