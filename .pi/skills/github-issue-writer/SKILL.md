---
name: github-issue-writer
description: Creates a well-structured GitHub issue from a user prompt using the GitHub CLI. Use when the user wants an issue filed, including clarifying only necessary ambiguities and decomposing complex work into sub-issues/checklists inside one issue.
compatibility: Requires GitHub CLI (`gh`) installed, authenticated, and run from or pointed at a GitHub repository.
---

# GitHub Issue Writer

Create one clear GitHub issue from the user's prompt using `gh`.

## Principles

- File exactly one GitHub issue unless the user explicitly asks otherwise.
- Ask clarifying questions only when missing information would materially change the title, scope, repository, priority, or acceptance criteria.
- If details are minor or inferable, proceed and note assumptions in the issue.
- Keep issue content compact, actionable, and readable by both humans and AI coding agents.
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
   Use this concise structure, omitting sections that add no value:

   ```markdown
   ## Summary
   <1-3 sentences describing the requested outcome>

   ## Context
   - <relevant background, links, constraints, assumptions>

   ## Work Plan
   - [ ] <task 1>
   - [ ] <task 2>
   - [ ] <task 3>

   ### Sub-issue: <name>
   - [ ] <focused subtask>
   - [ ] <focused subtask>

   ### Sub-issue: <name>
   - [ ] <focused subtask>

   ## Acceptance Criteria
   - [ ] <observable completion criterion>
   - [ ] <test/validation/documentation criterion>

   ## Notes / Assumptions
   - <only if useful>
   ```

   Guidance:
   - Title: imperative or outcome-oriented, <= 80 characters when practical.
   - For complex work, keep one issue but add `### Sub-issue:` subsections with checklists.
   - Make tasks verifiable; avoid vague items like "improve stuff".
   - Include testing/validation expectations when relevant.

4. **Create the issue**
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

5. **Report result**
   Return the created issue URL and a one-line summary. If creation fails, report the exact blocker and next action.

## Quality Checklist

Before creating the issue, ensure:

- The title matches the desired outcome.
- The issue is scoped to one coherent body of work.
- Complex work is decomposed into clear checklist items/sub-issues.
- Acceptance criteria are testable.
- Labels/assignees/milestone are included only when requested or obvious.
