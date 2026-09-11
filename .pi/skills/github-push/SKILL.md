---
name: github-push
description: Summarizes local changes, updates changelog and semantic version references, commits with a GitHub issue reference, and pushes to the GitHub repository. Use when the user asks to prepare and push completed changes.
compatibility: Requires git, GitHub CLI (`gh`) authenticated, and a GitHub repository checkout.
---

# GitHub Push

Prepare a clean, traceable GitHub push for completed work.

## Principles

- Do not push without user confirmation unless the user explicitly requested an immediate push.
- Every commit message must reference a GitHub issue.
- Prefer one coherent commit per push unless changes are clearly separable.
- Update `CHANGELOG.md` for every push; create it if missing.
- Enforce semantic versioning. In general, increment the version for each push.
- Update all in-repo references to the version before committing.
- Never commit secrets, generated credentials, local env files, or unrelated changes.

## Workflow

1. **Inspect repository state**
   ```bash
   git status --short
   git branch --show-current
   gh repo view --json nameWithOwner,url
   ```
   Review changed files with `git diff` and staged changes with `git diff --cached`.

2. **Identify the issue**
   - Determine the issue number from the user prompt, branch name, existing notes, or recent issue context.
   - If no issue is known, ask for one or offer to create an issue first.
   - Commit message issue format:
     - Use `(#123)` for a reference.
     - Use `Fixes #123`, `Closes #123`, or `Resolves #123` only when the commit completes the issue.
   - Recommended commit format:
     ```text
     <type>(<scope>): <short summary> (#123)
     ```
     Examples: `feat(auth): add password reset (#42)`, `fix(ui): correct settings layout (#57)`.

3. **Choose semantic version bump**
   Follow SemVer:
   - `PATCH` for bug fixes, docs, tests, internal chores, or non-breaking polish.
   - `MINOR` for backward-compatible features.
   - `MAJOR` for breaking changes, migrations, or incompatible behavior/API changes.

   If unclear, ask. Otherwise choose the smallest valid bump.

4. **Update version references**
   - Find current version sources, for example:
     - `package.json`, `package-lock.json`, `npm-shrinkwrap.json`
     - app manifests/config files
     - source constants, about screens, docs, README badges
   - Update every intentional in-repo reference from the old version to the new version.
   - Do not edit dependency versions unless they are the project package version or lockfile mirrors of it.

5. **Update changelog**
   - Create `CHANGELOG.md` if missing.
   - Keep entries short and useful.
   - Add the new version at the top using this format:

   ```markdown
   # Changelog

   ## <version> - <YYYY-MM-DD>
   - <short change summary>
   - <short change summary>
   ```

   - If a changelog already follows another reasonable format, preserve it.
   - Mention issue references only when helpful, e.g. `- Add lobby validation (#123)`.

6. **Validate**
   Run the repository's relevant checks when practical, such as:
   ```bash
   npm run check
   npm test
   npm run build
   ```
   Use repo-native commands. If checks are unavailable or fail for unrelated reasons, note that clearly before pushing.

7. **Commit**
   Stage only intended files:
   ```bash
   git add <files>
   git diff --cached
   git commit -m "<type>(<scope>): <summary> (#123)"
   ```
   If the commit fully completes the issue, use a body with a closing keyword:
   ```bash
   git commit -m "<type>(<scope>): <summary> (#123)" -m "Fixes #123"
   ```

8. **Push**
   ```bash
   git push
   ```
   If upstream is missing:
   ```bash
   git push -u origin <branch>
   ```

9. **Report**
   Provide:
   - version bumped from `<old>` to `<new>`,
   - changelog updated/created,
   - commit hash and issue reference,
   - branch pushed,
   - validation commands run and results,
   - any failures or follow-up actions.

## Safety Checklist

Before pushing, confirm:

- `git status` contains only intended changes.
- `CHANGELOG.md` is updated.
- SemVer bump is correct.
- All project version references are updated.
- Commit message references an issue in GitHub format.
- No secrets or unrelated files are staged.
