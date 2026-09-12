---
name: github-issue-writer
description: Categorizes and creates concise, actionable GitHub issues from a user prompt using the GitHub CLI. It splits complex work into nested issues where practical. Use when the user wants an issue filed.
compatibility: Requires GitHub CLI (`gh`) installed, authenticated, and run from or pointed at a GitHub repository.
---

# GitHub Issue Writer

Create the lowest-complexity actionable issue or set of nested issues that satisfies the user's request. Use clear imperative language that an AI agent can execute.

## Issue types

Apply exactly one label to every issue:

- **`agent:quick`** — A local, low-risk change. Require the smallest diff and targeted validation. Do not require broad research or tests unless they provide meaningful regression protection.
- **`agent:standard`** — A bounded change requiring inspection of relevant components, meaningful tests, affected test suites, and static checks. Avoid unrelated refactoring.
- **`agent:deep`** — Architectural, cross-cutting, uncertain, compatibility-sensitive, or otherwise high-risk work. Require investigation, a plan before implementation, TDD where appropriate, broad regression testing, and edge-case consideration.

Favor `agent:quick`. Use `agent:standard` only when the work needs the stated inspection and regression coverage. Use `agent:deep` only when the work genuinely needs architectural investigation or broad validation. Do not classify work as deep merely because it is a feature.

## Workflow

1. **Confirm context**
   ```bash
   gh repo view --json nameWithOwner,url
   gh auth status
   gh label list --limit 100
   ```
   Create any missing type labels before creating issues:
   ```bash
   gh label create "agent:quick" --color "0E8A16"
   gh label create "agent:standard" --color "1D76DB"
   gh label create "agent:deep" --color "5319E7"
   ```
   Inspect only the documentation and code needed to determine the outcome, type, and specific context files. Do not perform broad research for a quick issue.

2. **Clarify only blockers**
   Ask one focused question at a time only when missing information materially changes the repository, outcome, scope, or acceptance criteria. Infer minor details from the repository and prompt.

3. **Decompose before drafting**
   - Prefer one `agent:quick` issue for a local task.
   - Split a multi-part or deep request into the smallest independently actionable related issues where practical.
   - Create a parent issue for the overall outcome and make the implementation tasks nested sub-issues. Give every parent and child its own type label; a parent may be `agent:deep` while its children are quick or standard.
   - Do not create a separate issue for work that cannot be independently implemented or reviewed.

4. **Draft each issue**
   Use this compact structure:
   ```markdown
   ## Type
   `agent:quick`

   ## Summary
   <imperative, outcome-oriented task>

   ## Agent Context
   Inspect and change these files first:
   - `<path>` — <why this file is relevant>
   - `<path>` — <why this file is relevant>
   Inspect other files only when necessary to satisfy an acceptance criterion.

   ## Acceptance Criteria
   - [ ] <observable completion criterion>
   - [ ] <validation required by the issue type>

   ## Notes
   - <constraints, assumptions, links, or child-issue links only when needed>
   ```
   - Use an imperative or outcome-oriented title, ideally no more than 80 characters.
   - Name precise files to inspect and change whenever they are known. Do not list the entire repository or invent paths. State when a path is inspection-only.
   - Make criteria observable. For visual work, require verification of the requested result with representative content, long names, overflow, readability, and reachable actions when relevant.
   - Require only targeted validation for quick issues; meaningful tests and affected static checks for standard issues; and broad regression, compatibility, and edge-case validation for deep issues.

5. **Create and nest issues**
   Create issues using a temporary body file and the selected type label:
   ```bash
   gh issue create --title "<title>" --label "agent:quick" --body-file "$tmp"
   ```
   Create the parent first. Then nest each child with the GitHub API:
   ```bash
   gh api --method POST repos/<owner>/<repo>/issues/<parent-number>/sub_issues -f sub_issue_id=<child-number>
   ```
   Add linked child numbers to the parent's Notes after creation. Do not represent sub-issues only as a checklist in one issue body.

6. **Report**
   Return the created issue URL(s), their types, and one-line summaries. Report the exact blocker if creation or nesting fails.

## Quality checklist

- Every issue has exactly one `agent:*` label and matching Type section.
- The chosen type is the lowest justified complexity.
- Each issue is independently actionable and has precise Agent Context files.
- Complex work is split into nested issues when practical.
- Acceptance criteria and validation match the issue type.
- Do not include secrets, credentials, or hidden/internal data.
