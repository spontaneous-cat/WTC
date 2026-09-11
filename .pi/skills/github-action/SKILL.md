---
name: github-action
description: Implements a GitHub issue end to end. Reads the issue, proposes a short plan for approval, develops and tests it, then uses github-push to version, commit, and push. Use when the user asks to work on a GitHub issue.
compatibility: Requires git, GitHub CLI (`gh`) authentication, a GitHub repository checkout, and the github-push skill.
---

# GitHub Action

Implement one GitHub issue only after the user approves a concise plan.

## Workflow

1. **Load context**
   ```bash
   gh repo view --json nameWithOwner,url
   gh issue view <number> --json number,title,body,labels,url
   git status --short
   ```
   Read issue-linked docs and relevant repository code. Confirm the issue is open. Ask only if the issue is ambiguous, blocked, or conflicts with repository constraints.

2. **Propose, then stop**
   Present no more than five numbered steps, including tests and likely files. State meaningful risks/assumptions in one line. Ask: **“Approve this plan?”**

   Do not modify code, change issue status, commit, or push until the user explicitly approves.

3. **Implement**
   - Follow the approved plan; keep changes scoped to the issue.
   - Use TDD where practical: add/update a failing test, implement minimally, then refactor.
   - Respect project architecture, security/privacy constraints, and issue acceptance criteria.
   - If scope materially changes or a blocker emerges, stop and request approval for a revised concise plan.

4. **Validate**
   Run the relevant unit, integration, security, UI, typecheck, lint, format, and build commands. Report any unrelated or unresolved failure honestly. Do not claim completion if issue acceptance criteria are unmet.

5. **Push**
   Load and follow [the GitHub Push skill](../github-push/SKILL.md).
   - Use the issue number in the commit message.
   - Update the changelog and all project version references.
   - Close the issue in the commit only if the implementation fully satisfies it.
   - Push only after the user has approved the plan; this approval also authorizes the resulting push.

6. **Report**
   Provide the issue URL, concise summary, validation results, version, commit hash, pushed branch, and whether the issue was closed.

## Guardrails

- Never stage unrelated work or secrets.
- Never bypass failing tests, required review, or project deployment approvals.
- For multiple issues, handle one issue per invocation unless the user explicitly requests a combined plan.
