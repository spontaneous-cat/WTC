---
name: project-spec
description: Guides the user through rigorous project discovery questions, challenges assumptions, and converts the answers into a clear implementation spec and plan that another agent can follow. Use when a user wants to define, refine, or hand off a proposed project before implementation.
---

# Project Spec

Use this skill to turn a rough project idea into a concrete, actionable specification for another agent or developer.

## Operating Principles

- Do not start drafting the final spec until the project's goals, users, scope, constraints, and acceptance criteria are clear.
- Ask focused questions in small batches. Prefer 5-10 high-value questions at a time over a long interrogation.
- Grill the user constructively: surface hidden assumptions, ambiguous terms, missing decisions, risks, and tradeoffs.
- If the user is unsure, offer sensible options and ask them to choose.
- Clearly distinguish confirmed facts from assumptions and open questions.
- Keep implementation recommendations technology-aware but avoid over-engineering.
- The final output must be usable by another agent with minimal extra context.

## Workflow

### 1. Establish the Project Frame

Start by asking for, or confirming:

1. One-sentence project summary.
2. Primary goal or problem being solved.
3. Target users or stakeholders.
4. Desired end state / definition of success.
5. Current stage: idea, prototype, existing codebase, migration, bugfix, enhancement, etc.
6. Whether the output should be a product spec, technical implementation plan, MVP plan, or all of these.

### 2. Interrogate Requirements

Ask follow-up questions across these areas as relevant:

- Users and workflows: who uses it, what they do, frequency, roles/permissions.
- Core features: must-have, should-have, nice-to-have, explicitly out of scope.
- Inputs and outputs: data sources, user inputs, generated artifacts, reports, APIs.
- UX expectations: platforms, screens, navigation, accessibility, copy/tone.
- Technical context: existing stack, repo structure, services, hosting, integrations, APIs.
- Data model: key entities, relationships, lifecycle, retention, privacy.
- Non-functional requirements: performance, reliability, security, compliance, offline behavior, scalability.
- Constraints: deadlines, budget, dependencies, team skill, mandated tools, prohibited tools.
- Edge cases and failure modes: invalid input, partial failures, retries, empty states, permissions errors.
- Acceptance criteria: how each important feature will be verified.

Challenge vague answers. Examples:

- "What does 'fast' mean numerically here?"
- "Who is allowed to do that action, and who is explicitly not allowed?"
- "What happens if this external API is unavailable?"
- "Is this required for MVP, or can it wait?"
- "What data must survive deletion, export, or account closure?"

### 3. Resolve Ambiguity

Before writing the final spec:

- Summarize what is known.
- List assumptions you propose to make.
- List unresolved questions.
- Ask the user to confirm, correct, or answer the unresolved questions.

If the user asks to proceed despite unknowns, mark them clearly as assumptions or open decisions in the spec.

### 4. Produce the Final Spec

Create a clear Markdown document with this structure unless the user requests another format:

```markdown
# Project Spec: <Project Name>

## 1. Executive Summary
- What is being built
- Why it is being built
- Who it is for

## 2. Goals and Non-Goals
### Goals
- ...

### Non-Goals / Out of Scope
- ...

## 3. Users and Use Cases
- User roles/personas
- Primary workflows

## 4. Requirements
### Functional Requirements
- FR-1: ...
  - Acceptance criteria:
    - ...

### Non-Functional Requirements
- NFR-1: ...

## 5. UX / Interface Plan
- Screens, commands, API endpoints, or interaction flows
- Important states: loading, empty, error, success

## 6. Data and Integrations
- Data entities and relationships
- External systems/APIs
- Auth, permissions, privacy, retention

## 7. Technical Plan
- Recommended architecture
- Key components/modules
- Implementation sequence
- Files or areas likely to change, if known

## 8. Milestones
### MVP
- ...

### Later Enhancements
- ...

## 9. Testing and Validation
- Unit/integration/e2e/manual tests
- Acceptance checks

## 10. Risks, Tradeoffs, and Open Questions
### Risks
- ...

### Tradeoffs
- ...

### Open Questions
- ...

## 11. Agent Handoff Instructions
- Step-by-step instructions for the implementation agent
- Constraints it must preserve
- Decisions it must not revisit without user approval
```

### 5. Optional Implementation Backlog

When useful, append a backlog table:

```markdown
| ID | Task | Depends On | Acceptance Criteria |
|----|------|------------|---------------------|
| T1 | ...  | ...        | ...                 |
```

## Response Style

- During discovery: conversational, probing, and concise.
- During final output: structured, unambiguous, and implementation-ready.
- Use numbered questions so the user can answer efficiently.
- If the user provides documents or code, inspect them before asking questions that the files may already answer.
