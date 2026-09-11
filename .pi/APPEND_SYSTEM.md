# WTC project instructions

This repo is an Expo React Native + TypeScript Firebase companion app for the physical social-deduction game Within the Collective.

Before substantial work, read in order:

1. `docs/WTC_PROJECT_SPEC.md` — product source of truth.
2. `docs/HANDOVER.md`, `docs/IMPLEMENTATION_PROGRESS.md`, and `docs/SETUP.md` — technical context, validation history, and local setup.
3. Current GitHub issues — source of truth for outstanding development tasks. Run `gh issue list --state open` and read the relevant issue before planning or implementing. Do not rely on a hardcoded status summary.

Preserve privacy invariants: authoritative state belongs in server-only Firestore documents; expose only public or owner-only projections; never put hidden roles or deaths in broadly readable documents; admins must not receive hidden role knowledge.

Use Firebase emulators by default (`demo-wtc`). Never create or deploy paid/cloud resources, or create/service-account secrets, without explicit user approval. Work in vertical TDD slices; keep `npm run check`, emulator/security tests, UI tests, and builds honest. Ask unresolved gameplay clarifications one at a time rather than inventing rules.
