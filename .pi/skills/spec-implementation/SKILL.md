---
name: spec-implementation
description: Implements a provided project specification using modern software engineering practices, including repo discovery, planning, test-driven development, incremental delivery, validation, and clear handoff notes. Use when the user asks an agent to read a spec and execute/build it.
---

# Spec Implementation

Use this skill when the user provides or points to a project specification and wants the agent to implement it in the current repository.

## Operating Principles

- Treat the spec as the source of truth.
- Read the entire referenced spec before modifying code.
- Inspect the existing repository before planning implementation.
- Work incrementally and keep changes focused.
- Prefer test-driven development: write or update tests before implementing behavior where practical.
- Preserve existing architecture and conventions unless the spec explicitly requires changing them.
- Do not silently invent major requirements. Ask when the spec is ambiguous or when choices have significant tradeoffs.
- Keep the project runnable at every reasonable checkpoint.
- Validate changes with the project’s actual test/lint/typecheck/build commands.
- Document deviations from the spec and why they were necessary.

## Workflow

### 1. Load and Understand the Spec

1. Read the complete spec file or user-provided spec text.
2. Identify:
   - project goals,
   - MVP scope,
   - explicit non-goals,
   - functional requirements,
   - non-functional requirements,
   - technical constraints,
   - data models/APIs,
   - testing requirements,
   - acceptance criteria,
   - open questions.
3. Summarize the implementation-relevant requirements back to the user if the task is large or ambiguous.

Do not start implementation until you have enough context to avoid building the wrong thing.

### 2. Discover the Repository

Inspect the repository before editing:

- file tree and package structure,
- package manager and scripts,
- framework/runtime versions,
- existing tests,
- lint/typecheck/build setup,
- app entry points,
- existing architecture patterns,
- environment/configuration files,
- CI or deployment files.

Use repository-native commands and avoid assumptions. Examples:

```bash
ls
find . -maxdepth 3 -type f
npm run
pnpm run
yarn run
```

Adapt commands to the available shell/tooling.

### 3. Create an Implementation Plan

Produce a concise plan before coding. Include:

- major milestones,
- files/modules likely to change,
- tests to add/update,
- validation commands,
- risks or spec ambiguities,
- order of implementation.

For larger specs, split work into vertical slices that produce usable behavior end-to-end.

Prefer this sequence:

1. Project scaffolding/configuration.
2. Core domain types and validation.
3. Pure business logic with unit tests.
4. Persistence/API boundaries.
5. UI/UX flows.
6. Integration tests.
7. Polish, accessibility, and error states.
8. Documentation and handoff.

### 4. Use Test-Driven Development

Where practical:

1. Write a failing test for the specified behavior.
2. Implement the minimal code to pass it.
3. Refactor while tests remain green.
4. Repeat for each behavior.

Prioritize tests for:

- business rules,
- validation,
- permissions/security rules,
- data transformations,
- API/Cloud Function behavior,
- edge cases,
- regression-prone logic.

If TDD is impractical for a part of the work, explain why and still add appropriate tests afterward.

### 5. Implementation Standards

Follow modern best practices:

- Use strong typing when available.
- Keep domain/business logic separate from UI and infrastructure.
- Prefer small composable modules over large files.
- Validate inputs at boundaries.
- Handle loading, empty, success, and error states.
- Avoid hardcoded secrets or environment-specific values.
- Use environment variables/config files according to framework conventions.
- Avoid broad rewrites unless necessary.
- Keep dependencies minimal and justified.
- Use clear names matching the spec vocabulary.
- Preserve accessibility basics for UI work.
- Make failure modes explicit.

### 6. Security and Data Handling

When implementing auth, persistence, APIs, or backend logic:

- Enforce permissions server-side where possible.
- Do not rely solely on client-side checks for sensitive state.
- Keep private data out of public/readable documents or responses.
- Validate user identity and authorization on every privileged action.
- Avoid logging secrets or hidden game/user data.
- Write security rules/tests if the platform supports them.

### 7. Validation

Before declaring work complete, run appropriate checks:

- unit tests,
- integration tests,
- lint,
- typecheck,
- build,
- formatting check,
- relevant manual smoke tests.

If a command fails because of unrelated existing issues, capture the failure clearly and distinguish it from changes made for this task.

For layout changes, capture a baseline before editing and matching after screenshots, then actually inspect both at relevant phone widths with representative content/states. Check the requested visual outcome, long names, overflow, readability, and reachable actions. Record viewport, evidence paths, and findings. Screenshot capture alone is not visual review; browser validation is not native-device validation. If comparison or inspection is unavailable, mark the visual requirement as awaiting review instead of claiming completion.

Test meaningful displayed values and action outcomes, not just labels or container counts. Review removed or weakened assertions in the test diff and preserve equivalent regression coverage unless an approved requirement changed. Explain intentional removals; do not weaken tests to accommodate a refactor. Successful compilation and general test passes do not establish successful UX.

### 8. Track Spec Coverage

Maintain a short checklist mapping each requirement or acceptance criterion to its implementation location, verification method, and evidence. Distinguish:

- implemented but not yet verified requirements,
- verified requirements, with validation results,
- requirements awaiting visual or user review where needed,
- partially implemented requirements,
- deferred/out-of-scope items,
- changed assumptions,
- known gaps.

Do not mark the spec complete while required outcomes are unmet or materially unverified. Report implemented, verified, and awaiting-review work separately in the handoff.

For large projects, create or update a project-local progress file if helpful, for example:

```text
docs/IMPLEMENTATION_PROGRESS.md
```

Only create such a file if it adds value or the user requests it.

### 9. Final Response / Handoff

When finished, provide a concise handoff with:

- summary of what was implemented,
- files changed/created,
- tests and validation commands run,
- any failing checks and why,
- spec requirements not completed,
- setup/run instructions,
- recommended next steps.

## When to Ask Questions

Ask the user before proceeding if:

- the spec has conflicting requirements,
- a major architecture choice is unspecified,
- implementation would require paid services or external accounts,
- required credentials/secrets are missing,
- behavior affects security/privacy materially,
- the requested scope is too large for one pass and needs prioritization.

Do not ask for minor decisions that can be reasonably inferred from existing conventions or the spec.

## Response Style

- Be concise but explicit.
- Use checklists for plans and progress.
- Reference file paths clearly.
- Avoid dumping large code blocks in chat when code has been written to files.
- Prefer actionable next steps over vague commentary.
