# WTC project instructions

This repo is an Expo React Native + TypeScript Firebase companion app for the physical social-deduction game Within the Collective.

Preserve privacy invariants: authoritative state belongs in server-only Firestore documents; expose only public or owner-only projections; never put hidden roles or deaths in broadly readable documents; admins must not receive hidden role knowledge.

Use Firebase emulators by default (`demo-wtc`). Never create or deploy paid/cloud resources, or create/service-account secrets, without explicit user approval. Ask unresolved gameplay clarifications one at a time rather than inventing rules.

## Development philosophy

Prefer the smallest correct change that satisfies the issue.

Do not:
- refactor unrelated code
- improve neighbouring code unless required
- add abstractions for hypothetical future needs
- add tests that merely duplicate trivial implementation details
- add documentation unless behaviour or public APIs change
- run the entire test suite when targeted tests sufficiently verify the change
- repeatedly re-run passing checks without a reason
- continue investigating once the acceptance criteria are satisfied

For small, low-risk changes:
1. Inspect only the relevant code.
2. Make the change.
3. Run the narrowest useful verification.
4. Stop.

For normal changes:
1. Understand the relevant implementation.
2. Make a short implementation plan internally.
3. Implement the smallest solution.
4. Add or update meaningful tests where appropriate.
5. Run targeted tests and type/lint checks relevant to changed files.
6. Stop when acceptance criteria are met.

Use extensive planning, full test suites, architectural investigation and broader refactoring only for complex or high-risk changes.

Do not optimise for theoretical perfection. Optimise for a correct, maintainable implementation with minimal scope.