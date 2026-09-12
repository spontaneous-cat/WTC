---
name: github-push
description: Prepares, versions, commits, and pushes completed categorized GitHub issue work without closing the issue. Use when the user asks to prepare and push completed changes.
compatibility: Requires git, GitHub CLI (`gh`) authenticated, and a GitHub repository checkout.
---

# GitHub Push

Prepare a clean, traceable push for one completed GitHub issue. Never close an issue; leave closure to the user.

## Workflow

1. **Inspect state and issue type**
   ```bash
   git status --short
   git branch --show-current
   git diff
   git diff --cached
   gh repo view --json nameWithOwner,url
   gh issue view <number> --json number,title,body,labels,url,state
   ```
   Confirm the issue is open and has exactly one `agent:quick`, `agent:standard`, or `agent:deep` label. Stage only the intended issue files.

2. **Apply the issue type**
   - **`agent:quick`:** Preserve the smallest possible diff. Accept targeted validation evidence. Do not add broad validation work during the push.
   - **`agent:standard`:** Confirm meaningful tests and affected static checks were run. Do not introduce unrelated refactoring.
   - **`agent:deep`:** Confirm the approved plan, architecture/compatibility considerations, and broad regression evidence. Do not push if required approval or validation is missing.

3. **Version and changelog**
   Follow the repository's existing release process. If this skill's versioning policy applies, choose the smallest valid SemVer bump:
   - PATCH for fixes, docs, tests, chores, and polish.
   - MINOR for backward-compatible features.
   - MAJOR for breaking changes or migrations.

   Update `CHANGELOG.md` and intentional in-repository version references. Do not update dependency versions except package-version lockfile mirrors.

4. **Commit**
   Use a reference-only commit message. Never include a GitHub closing keyword in a subject or body:
   ```bash
   git add <intended-files>
   git diff --cached
   git commit -m "<type>(<scope>): <summary> (#123)"
   ```
   Do not post an issue comment or change issue state unless the user separately asks.

5. **Push**
   Push when the user explicitly requested an immediate push, or when github-action has authorized it under its categorized workflow:
   ```bash
   git push
   ```
   If necessary:
   ```bash
   git push -u origin <branch>
   ```

6. **Report**
   Report the version change, changelog status, commit hash, issue reference, branch, and validation evidence. State that the issue remains open for user review.

## Safety checklist

- Stage only intended files; never stage secrets, credentials, local environment files, or unrelated work.
- Keep validation proportionate to the issue type.
- Ensure the commit references the issue but never closes it.
- Report failures and unmet criteria honestly; do not push incomplete work.
