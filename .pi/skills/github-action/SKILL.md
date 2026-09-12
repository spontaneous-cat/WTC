---
name: github-action
description: Implements one categorized GitHub issue with the smallest safe change, validates it at the issue's required depth, then uses github-push. Use when the user asks to work on a GitHub issue.
compatibility: Requires git, GitHub CLI (`gh`) authentication, a GitHub repository checkout, and the github-push skill.
---

# GitHub Action

Implement one open GitHub issue. Its `agent:quick`, `agent:standard`, or `agent:deep` label controls this workflow. Do not close issues; the user decides whether an issue is complete.

## Load context

1. Run:
   ```bash
   gh repo view --json nameWithOwner,url
   gh issue view <number> --json number,title,body,labels,url,state
   git status --short
   ```
2. Confirm that the issue is open and has exactly one `agent:*` label. If it does not, ask the user to categorize it; do not guess or change its labels.
3. Read the files named in the issue's **Agent Context** section first. Inspect another file only when those files, a direct import, an acceptance criterion, or a failing validation requires it. Do not perform broad repository research.
4. Treat unrelated modified files as user work. Never stage, edit, revert, or validate them unless the issue explicitly requires them.

## Apply the issue type

### `agent:quick`

- Expect a local, low-risk change.
- Do not produce a detailed plan and do not ask for plan approval.
- Make the smallest possible diff. Do not refactor adjacent code.
- Do not add tests unless they provide meaningful regression protection.
- Run only targeted validation for the changed behavior.
- Stop as soon as every acceptance criterion passes, then push.

### `agent:standard`

- Inspect the relevant components named by the issue.
- State a brief implementation and validation plan, then implement immediately. Do not request approval.
- Add or update meaningful regression tests.
- Run affected test suites and relevant static checks.
- Avoid unrelated refactoring. Stop and ask only if the issue is ambiguous, blocked, or materially expands.

### `agent:deep`

- Investigate the relevant architecture, dependencies, alternatives, compatibility, and edge cases before changing code.
- Present a concise plan, risks, affected files, and validation approach. Ask **“Approve this plan?”** and stop.
- After approval, use TDD where appropriate and implement only the approved scope.
- Run broad regression tests and relevant static checks. Request revised approval if scope materially changes.

## Implement and validate

- Preserve project architecture, security/privacy constraints, and issue acceptance criteria.
- Prefer the smallest correct change that satisfies the issue. Avoid unrelated refactoring, cleanup, or additional scope.
- Validate proportionally to the risk and complexity of the change. Use the narrowest checks that provide meaningful confidence, and do not broaden or repeat verification without a specific reason.
- Add or update tests when they provide meaningful behavioural or regression coverage. Do not add tests solely to mirror trivial implementation details, and do not weaken existing assertions to make a change pass.
- For visual changes, do not spend unnecessary time validating the changes. If the issue does not require visual validation, do not run the browser test suite or inspect screenshots.
- Verify meaningful displayed values and user actions where relevant.
- Do not claim something was verified without direct evidence. Clearly report anything that remains unverified or does not meet the acceptance criteria.
- For complex or high-risk work, maintain an acceptance checklist linking important criteria to their implementation and verification evidence. This is optional for small, low-risk changes.
- Stop once the acceptance criteria are satisfied and the appropriate targeted checks pass.


## Push and report

1. Load and follow [the GitHub Push skill](../github-push/SKILL.md), passing the issue type and validation evidence.
2. Use a reference-only issue commit such as `fix(scope): summary (#123)`. Never use `Fixes`, `Closes`, or `Resolves`.
3. For `agent:quick` and `agent:standard`, the user's request to implement the issue authorizes the resulting scoped push. For `agent:deep`, the approved plan authorizes it.
4. Report the issue URL, concise change summary, validation results, version, commit hash, and pushed branch. State that the issue remains open for user review.

## Guardrails

- Never stage unrelated work, secrets, or generated credentials.
- Do not bypass failing required checks or deployment approvals.
- Handle one issue per invocation unless the user explicitly requests otherwise.
