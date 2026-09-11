# WTC — next-agent handover

## Stop point and user instructions

The user asked to implement `docs/WTC_PROJECT_SPEC.md` with the `spec-implementation` skill, then explicitly requested: **“wrap up what you're doing and write handover notes for the next agent.”** Feature work is paused at the first validated vertical slice, not at completion of the MVP.

Read, in order:

1. `.pi/skills/spec-implementation/SKILL.md`
2. `docs/WTC_PROJECT_SPEC.md` (approved product spec; not rewritten during implementation)
3. This handover and `docs/IMPLEMENTATION_PROGRESS.md`
4. `docs/SETUP.md`

**Ask clarification questions one at a time**, as the user requested during discovery. Do not silently resolve conflicting gameplay rules.

## Implemented and verified

- Expo SDK 57 / React Native / TypeScript scaffold; npm workspace for Firebase Functions.
- Firebase Anonymous Auth integration. Web persistence is browser-based; native persistence uses AsyncStorage. No accounts or recovery UI.
- Random initial nickname, editable display name. Backend profile is authoritative so stale create/join requests do not overwrite a recently changed name.
- Transactional create/join lobby, six-digit numeric codes preserving leading zeros, collision retry, capacity enforcement, and idempotent create/join retries.
- One unfinished game per identity, resumed through a private `profiles/{uid}` document.
- Editable lobby setup: enforced 4–20 players, default 8, one killer, exact role totals, good count `>= ceil(n/2)`.
- Creator-only setup/start; exact joined count required to start; no reroll on repeated start.
- Server-side random assignment of Killer, Minion, Collective, and Exile (neutral wins-if-voted-out role; win logic is not yet implemented).
- Realtime lobby and player list; private role reveal/hide card; role card resets when app backgrounds; public game-start log and read-only settings.
- Private suspected-role markers, persisted to Firestore and readable only by their owner.
- Reusable light/dark parchment theme, persisted theme choice, basic accessibility labels, loading/error/cached-data states.
- Server-only authoritative state, separate public/owner-only projections, deny-by-default Firestore rules.
- In-app dashboard visibly labels the build a development preview. It does not pretend voting or kill controls work.

## NOT implemented

- Kill reports, confirmation/reconsideration/escalation, disputes, death conversion/reveal.
- Voting rounds, nominations, ballots, deadline processing, grace periods, cooldowns, executions.
- Good/evil/neutral win checks, manual end-game, results/revealed history.
- Runtime settings changes, admin corrections, dispute resolution controls.
- Actual alerts or delivery infrastructure (`GameAlert` is only a preliminary shared type).
- Lobby leave/remove/reset UI, completed-game replay/new-game UX, game-code release/expiry, retention/cleanup.
- Continuous integration workflow, EAS configuration, cloud deployment, verified current pricing tables.
- Native device/simulator runtime testing, mobile UI automation, or production/staging validation.

The current preview cannot run a full game. Starting a lobby transitions to the dashboard but there is no gameplay/end path yet. Do not describe it as a finished MVP.

## Architecture and file map

| Path                                        | Purpose                                                             |
| ------------------------------------------- | ------------------------------------------------------------------- |
| `App.tsx`                                   | App shell, identity/profile, name editing, lobby/dashboard routing  |
| `src/data/firebase.ts`                      | Lazy cached Firebase services; safe emulator default                |
| `src/data/persistentAuth.ts` / `.native.ts` | Platform-specific authentication persistence                        |
| `src/data/hooks.ts`                         | Auth/subscription hooks; app foreground handling                    |
| `src/data/api.ts`                           | Callable adapters and private suspicion writes                      |
| `src/screens/`                              | Welcome/create/join, lobby, dashboard/role/players/history/settings |
| `src/ui/`                                   | Theme, components, setup form                                       |
| `shared/contracts.ts`                       | Shared Zod request/setup schemas and public/private contracts       |
| `shared/lobby.ts`                           | Pure lobby domain transitions and public/private projection         |
| `shared/lobby.test.ts`                      | Domain tests                                                        |
| `functions/src/index.ts`                    | Callable authorization/validation and transactional action handlers |
| `functions/src/store.ts`                    | Firestore persistence and changed-only projection writes            |
| `firestore.rules`                           | Client permissions; server state/code index denied                  |
| `tests/integration/`                        | Real Firestore security-rule and callable tests                     |
| `tests/e2e/lobby.spec.ts`                   | Four isolated browser players through the actual UI                 |
| `firebase.json`                             | Functions/runtime, rules, local emulators                           |

### Implemented callable API

All callables require Firebase Auth; identity is taken from the verified token, never a supplied actor ID. Mutations are transactional.

- `createGame({displayName, setup})`
- `joinGame({displayName, code})`
- `updateLobbySettings({gameId, setup})`
- `startGame({gameId})`
- `renamePlayer({displayName})`

Responses are `{gameId}` (`null` for renaming before joining). Setup schema and naming differ slightly from the suggested spec model: `roles.{killer,minion,good,neutral_exile}` and `timers.{cooldown,discussion,voting,grace}`, with durations in seconds. Inspect the actual shared contracts before extending them.

### Storage and privacy invariants

```text
profiles/{uid}                                     # owner-read, server-write
gameCodes/{sixDigits}                               # server-only reservation → gameId
games/{gameId}                                     # member-readable public projection
games/{gameId}/server/state                        # authoritative aggregate, no client access
games/{gameId}/players/{uid}                       # public status/name only
games/{gameId}/privatePlayerData/{uid}             # own role/team/internal status
games/{gameId}/owners/{uid}/suspicions/{targetUid} # owner-only read/write
games/{gameId}/log/game_started                    # public event
```

- Firebase UID is the player ID throughout this implementation.
- Server aggregate contains `status` and `publicStatus` separately for each player. Public player documents receive **only** `publicStatus`. Do not put hidden deaths in readable documents behind a UI flag; Firestore cannot mask individual fields.
- `saveState` writes only changed projections, avoiding public-document timestamp changes for hidden-only mutations. Extend/test this invariant for actual kill reporting.
- Creator has no private-role bypass in client security rules.
- Suspicion rules enforce a valid target, valid role, exact field allowlist, owner identity, and server timestamp.
- All new collections are denied until explicitly authorized. Future participant-specific alerts/reports must not become public through broad collection listeners.
- Public `log` is public information only. End-game detail will need server-only event history/retained reports and an explicit reveal projection, not early leakage.
- Client Firebase config is public metadata, not a secret. No service-account credentials have been created or committed.

### Small implementation choices to preserve or review

- Default 8-player composition: 1 killer, 1 minion, 5 good, 1 neutral. Exact default role mix was not specified; this is a valid initial preset, not a new game rule.
- “Exile” is a working UI name for the neutral role.
- Defensive timer validation currently allows cooldown 0–604800 seconds and other durations 1–86400 seconds, all integers. These bounds are implementation guardrails, not approved balancing limits.
- `Game.status` currently has `lobby | active | ended`; no paused/dispute state yet.
- Timestamps are trusted server-generated epoch milliseconds in this slice, rather than Firestore Timestamp objects (suspicions use serverTimestamp). Keep future deadline handling consistent.
- `privatePlayers` from `projectGame` must be written only to owner-private paths, never alongside the public output in a readable game document.
- Native Auth uses a narrow type assertion for Firebase's RN-only `getReactNativePersistence` export because the package's public TypeScript declaration points at web exports. Both native bundles compiled; native runtime persistence still needs on-device testing.

## Validation at handover

Final checks after the name-race fix and formatting:

| Check                                       | Result                                                                                 |
| ------------------------------------------- | -------------------------------------------------------------------------------------- |
| `npm run check`                             | Passed: 27 domain tests, app typecheck, Functions compilation, ESLint, Prettier        |
| `npm run test:emulators`                    | Passed: 9 tests across callable integration and Firestore rules                        |
| `PLAYWRIGHT_CHANNEL=msedge npm run test:ui` | Passed: one complete four-player UI scenario                                           |
| Web export                                  | Passed, also rebuilt by the final browser test                                         |
| `npm run build:native`                      | Passed: Android and iOS Hermes exports, **not** signed binaries/device tests           |
| `npx expo-doctor`                           | 21/21 checks passed during this session                                                |
| `npm audit`                                 | Unresolved transitive advisories; last standalone report: 22 moderate, 0 high/critical |

The browser test covers create/join/start, private role counts, non-admin UI, private suspicions, public history, persisted identity/name/theme after reload, and no browser page errors. Screenshots are generated under ignored `test-results/`. Light/dark layouts were inspected; initial screenshot review exposed a rename/create race, now covered by a failing-then-passing callable regression and fixed UI flow.

TDD evidence: domain tests ran red before implementation; security tests ran red against deny-all rules; callable tests ran red against explicit unimplemented endpoints. They were then implemented and run green. UI layout was implemented before browser verification rather than pretending it was unit-test-first.

`npm audit fix` was run without force; Firebase Admin was updated to v14.3.0 and Functions to v7.3.2. npm installation summaries and standalone audit counts differed; re-run audit rather than relying on a summary. Do **not** run `npm audit fix --force` blindly: suggested “fixes” included major downgrades of Expo/Firebase tooling. Review dependency advisories before deployment.

### Environment specifics

- Windows project path: `E:/Software Projects/WTC`.
- Node available: 24.12.0; deployed Functions target Node 22. Tests currently run using host Node 24 with an emulator warning. Add Node 22 CI validation next.
- System Java is 8. Portable Java 21 was downloaded to the OS temporary directory. Commands are in `docs/SETUP.md`; no global Java configuration was changed.
- Playwright Chromium download repeatedly timed out. Existing Edge worked via `PLAYWRIGHT_CHANNEL=msedge`; the default config still uses Playwright Chromium on machines where it installs normally.
- No real Firebase project, deployment, EAS project, or paid resource was created.
- Test emulators and test web server were shut down at the end of the commands.
- All project work is currently **untracked/uncommitted** in this initially empty Git repository. No commits were made. Existing `.pi/` skills and the approved spec were preserved. Inspect `git status` before staging; generated files/node_modules are ignored.

## Clarifications before continuing gameplay

Ask one at a time, starting with whichever blocks the next slice:

1. **Voting threshold:** Does execution need at least half of eligible living players, rounded up (Clocktower style), or strictly more than half? For four eligible voters, is the threshold 2 or 3? The approved setup-majority formula does not answer this voting question.
2. **Hidden ballots:** Earlier discussion says hidden votes become visible after discussion, but the final spec places ballot casting after discussion. Confirm when ballots can be cast/revealed and whether voter identities/choices are displayed.
3. **Nomination details:** Self-nomination, repeat nominations, dead nominees, limits, and when additional deaths reveal within a round.
4. **Death mid-vote:** Eligibility snapshot, previously cast ballots, nominee death, and privacy behavior.
5. **Timer edits:** Existing deadlines versus future phases. Do not tie authoritative deadlines to a foreground app or browser timer.
6. **Disputes:** What exactly does “continue” do to the pending report? How does non-response escalate, and does escalation pause gameplay? Admin may not gain participant identities through the app.
7. **Admin corrections:** Exact permitted actions, treatment of hidden status, undo/execution semantics, public logging and win checks.
8. **Death/alignment edge cases:** Final spec says all dead join evil; earlier wording sometimes specifically mentions good. Confirm neutral behavior if it affects role/win handling or execution eligibility.

The next agent should not confuse optional single-active-nomination storage in the spec with permission to omit multiple nominations per round. Preserve round-wide highest counts and ties; do not execute until the final grace deadline.

## Suggested next actions

1. Read the spec and handover, inspect working tree, rerun `npm run check`.
2. Ask the first necessary gameplay clarification, one question at a time.
3. Continue a TDD vertical slice (kill confirmation + private/public state + notifications, or nomination rules once clarified).
4. Add production-safe idempotency/concurrency/deadline tests as each action arrives. Use server-side deadline processing; client countdowns are display only.
5. Add CI using Node 22 and Java 21, plus native device smoke testing. Verify native anonymous identity survives reload/background/relaunch before real play.
6. Complete runtime settings, admin end/corrections, win checks, results and cleanup; update coverage notes honestly.
7. Research current Firebase/Expo pricing and complete staging/deployment validation only when requested.
