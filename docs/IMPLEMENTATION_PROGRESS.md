# WTC implementation progress

Source of truth: [WTC_PROJECT_SPEC.md](WTC_PROJECT_SPEC.md).

## Delivery plan

Implement in vertical slices, keeping the app runnable and testing rules before implementation.

1. **Foundation and lobby → private role reveal (implemented; see validation below)**
   - Expo/TypeScript app, Firebase Functions, local emulator configuration. CI remains deferred.
   - Pure domain tests for setup, lobby membership, permissions, random assignment.
   - Transactional create/join/configure/start/name-update APIs.
   - Deny-by-default Firestore rules and privacy tests.
   - Persistent anonymous identity, realtime lobby, dashboard, role card, private suspicion markers.
   - Reusable light/dark parchment theme and setup/run documentation.
2. Kill reports, confirmation, disputes, in-app alerts, admin end-game.
3. Nomination rounds, server deadlines, votes, grace periods, executions, win conditions.
4. Runtime settings/admin corrections, results/revealed history, end-to-end validation and polish.

## Implementation decisions

- Use TypeScript throughout; npm with a committed lockfile.
- Use Expo's current stable blank TypeScript template; inspect installed-version documentation.
- Start with Firebase emulators. Do not create/deploy paid resources without explicit permission.
- Backend maintains authoritative state in a server-only document. Public and owner-only documents are projections, written atomically. A `statusPubliclyRevealed` UI flag cannot hide fields in a readable Firestore document.
- A player can belong to one unfinished game in this MVP. Relaunching reconnects through a private profile document; losing anonymous credentials remains unrecoverable.
- Setup majority is explicitly `ceil(playerCount / 2)` per the approved examples; do not confuse this with the unresolved voting threshold.
- Runtime Cloud Functions target Node 22; local Node 24 is available. Emulator tests require Java 21+ (the initially installed Java is 8).

## Current stop point

User requested wrap-up and next-agent handover. Read [HANDOVER.md](HANDOVER.md) for the detailed implementation map, environment workarounds, validation results, and remaining scope. [SETUP.md](SETUP.md) explains local running and eventual deployment.

- Passed: 27 domain tests, 9 emulator integration/security tests, one four-player browser scenario using Edge.
- Passed: app/backend typechecking, lint, formatting, web and Android/iOS JS exports; Expo Doctor 21/21.
- Native runtime/device testing and cloud deployment have not been performed.
- Full gameplay is not implemented; kills, voting, disputes, wins, results, alerts, and runtime admin controls remain deferred.
- Dependency audit still reports transitive moderate advisories; review before deployment.
- No commits or real cloud resources were created.

## Clarifications needed before affected slices

Ask one at a time; do not silently select gameplay rules.

- Voting threshold: at least half (Clocktower style) or strictly more than half of eligible living players?
- Hidden voting: spec says votes are cast after discussion, but earlier discovery says hidden votes reveal when discussion ends. Confirm exactly when ballots may be cast and are revealed, and whether individual voter choices are public.
- Death during a nomination: eligibility snapshot, counted prior votes, and when the new death is publicly revealed.
- Nomination restrictions: whether dead players can be nominated, self-nomination and repeat nominations within a round.
- Runtime timer edits: whether they affect existing deadlines or future phases only.
- Admin corrections: exact allowed corrections, rollback behavior, and public logging without leaking hidden deaths.
- Dispute continuation: whether the report is rejected, stays pending, or can be confirmed later; escalation of non-response has no specified deadline.

## Validation strategy

- Vitest: pure domain tests (red → green), then integration tests.
- Firebase Emulator Suite: real security-rule and callable-flow tests.
- TypeScript for mobile and Functions; ESLint; Prettier.
- Expo web export to validate bundling, plus device smoke tests documented separately.
- Keep implemented, unverified, and deferred functionality distinct in the handoff.
