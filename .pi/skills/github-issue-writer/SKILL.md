---
name: github-issue-writer
description: Creates concise, actionable GitHub issues from a user prompt using the GitHub CLI. Use when the user wants an issue filed, clarifying only necessary ambiguities and keeping each issue scoped to one simple task.
compatibility: Requires GitHub CLI (`gh`) installed, authenticated, and run from or pointed at a GitHub repository.
---

# GitHub Issue Writer

Create concise, actionable GitHub issues from the user's prompt using `gh`.

## Principles

- Write only what is necessary for a human developer or AI agent to act.
- Prefer exactly one GitHub issue for one simple task.
- If the prompt contains multiple simple tasks, ask whether to split them unless the split is explicitly requested.
- Create sub-issues only when the work is genuinely too large for one issue. Sub-issues must be separate GitHub issues, not checklist sections inside the main issue.
- Ask clarifying questions only when missing information would materially change the title, scope, repository, priority, or acceptance criteria.
- If details are minor or inferable, proceed and note assumptions only when useful.
- Keep issue content compact, clear, direct, and testable.
- Do not include secrets, private credentials, or hidden/internal data in the issue.

## Workflow

1. **Confirm environment**
   - Check repository context and authentication when needed:
     ```bash
     gh repo view --json nameWithOwner,url
     gh auth status
     ```
   - If outside the target repo or multiple repos are plausible, ask which repo or use `gh issue create --repo OWNER/REPO` if provided.

2. **Clarify only blockers**
   Ask at most 1-3 focused questions if necessary, such as:
   - Which repository should receive this issue?
   - Is this a bug, feature, chore, or research task?
   - What outcome or acceptance criteria is required?
   - Are there priority, milestone, label, assignee, or deadline requirements?

3. **Draft the issue**
   Use the shortest structure that is sufficient. Omit sections that add no value.

   ```markdown
   ## Summary
   <1-2 sentences describing the task>

   ## Acceptance Criteria
   - [ ] <observable completion criterion>
   - [ ] <test/validation criterion, if relevant>

   ## Notes
   - <constraints, assumptions, links, or context only if needed>
   ```

   Guidance:
   - Title: imperative or outcome-oriented, <= 80 characters when practical.
   - Scope each issue to a single, simple task.
   - Make acceptance criteria verifiable; avoid vague items like "improve stuff".
   - Include a work plan only when it materially clarifies implementation.
   - Include testing/validation expectations when relevant.

4. **Create issue(s)**
   Prefer a temporary body file to preserve formatting:

   ```bash
   tmp=$(mktemp)
   cat > "$tmp" <<'EOF'
   <issue body markdown>
   EOF
   gh issue create --title "<title>" --body-file "$tmp" <optional flags>
   rm "$tmp"
   ```

   Optional flags may include:
   - `--repo OWNER/REPO`
   - `--label "label"`
   - `--assignee "@me"` or `--assignee "user"`
   - `--milestone "milestone"`

5. **Sub-issues, only when needed**
   If the work must be decomposed:
   - Create a concise main issue that states the overall outcome and links to the sub-issues.
   - Create each sub-issue as its own GitHub issue scoped to one simple task.
   - In each sub-issue, include `Parent: #<main issue number>` near the top of the body.
   - In the main issue, add a short checklist of linked sub-issue numbers after creating them.
   - Do not use `### Sub-issue:` sections inside a single issue body.

6. **Report result**
   Return the created issue URL(s) and a one-line summary. If creation fails, report the exact blocker and next action.

## Quality Checklist

Before creating the issue, ensure:

- The title matches the desired outcome.
- Each issue is scoped to one simple task.
- Complex work is decomposed into separate linked GitHub issues only when needed.
- Acceptance criteria are testable.
- Labels/assignees/milestone are included only when requested or obvious.
