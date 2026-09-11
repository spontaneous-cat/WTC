# Issue #11 — compact fake-player list validation

Issue: https://github.com/spontaneous-cat/WTC/issues/11

Re-attempt of `53da482`, validated on 2026-09-11 for app version 0.1.2.

## Acceptance evidence

| Criterion                                                             | Implementation and verification                                                                                                                                                                                                                                                                                                                            | Status                        |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| Compact list, not separate large tiles                                | `src/ui/DevFakePlayers.tsx`: one list surface, bottom separators, inline facts, fixed action column; no per-player card frames. Matched lobby list height falls from 862px to 371px at both tested widths (57% less).                                                                                                                                      | Verified                      |
| Name, joined state, public/private status, latest result, key actions | Each row renders these values, with `—` for unavailable data. E2E checks actual name/status/result text, real role/team/status values and the four-player role composition, join results, row-only refresh, refresh-all, and reset. Successful refresh updates the local result without storing role data in the result.                                   | Verified                      |
| Phone usability and unchanged guardrails                              | Edge browser at 360×844 and 390×844; 40-character spaced/unbroken names; light/dark; lobby/active. Tests check row/content bounds, no horizontal overflow, three rows fitting in the viewport, 48px minimum action targets, and disabled states. Non-admin controls remain absent. Existing dev-mode gate unit test and nine callable/security tests pass. | Verified within browser scope |
| Relevant UI tests                                                     | `tests/e2e/fake-players.spec.ts` now has two width-specific scenarios; `tests/e2e/lobby.spec.ts` adds non-admin developer-panel checks. All three scenarios pass.                                                                                                                                                                                          | Verified                      |

## Visual comparison

Captured the old UI before implementation with a temporary Playwright scenario, then inspected matching new list screenshots. Both use the same three names and four-player setup. Codes, UIDs and randomly assigned roles differ between runs. The lobby comparison has equivalent data states; neither the density result nor the layout tests rely on a particular random role assignment.

The before list required a 1600px-tall browser viewport to capture the entire list without scroll-container clipping. Widths remain 360px and 390px. After screenshots and usability assertions use the normal 844px height. Images below are list crops, not whole-screen or native-device captures. All identities and games shown are emulator test fixtures.

| State / width       | Before                               | After                              |
| ------------------- | ------------------------------------ | ---------------------------------- |
| Lobby, light, 360px | [Before](before-lobby-light-360.png) | [After](after-lobby-light-360.png) |
| Lobby, light, 390px | [Before](before-lobby-light-390.png) | [After](after-lobby-light-390.png) |
| Active, dark, 360px | [Before](before-active-dark-360.png) | [After](after-active-dark-360.png) |
| Active, dark, 390px | [Before](before-active-dark-390.png) | [After](after-active-dark-390.png) |

Inspection: old cards were tall and long action labels extended beyond the row; new rows share separators, wrap full names, retain readable facts, and keep short Join/Refresh controls inside the row. The full name remains in each action's accessibility label. Lobby row heights changed from 266/290/290px plus 16px inter-card gaps to 117/127/127px with no inter-row gaps. Light/dark screenshots for both lobby and active states were inspected; the committed images are representative pairs. Current tests also emit screenshots and row-dimension JSON under `test-results/`.

## Validation and reproduction

- TDD: new tests first failed against the old UI's missing inline state; both passed after implementation. Baseline inspection independently exposed the oversized cards and long-label overflow. Previous join/role-count coverage was retained and strengthened to check actual role values and composition, rather than static `Private:` labels.
- `npm run check`: 28 unit tests, app/Functions typechecks, lint and formatting passed.
- `npm run test:integration`: nine callable/security tests passed against existing `demo-wtc` emulators, with `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080` and `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`.
- `npx playwright test`: three scenarios passed with those emulator variables and `PLAYWRIGHT_CHANNEL=msedge`; the Playwright web server runs `npm run build:web` successfully before the tests.
- `npm run build:native`: Android and iOS Hermes exports passed.

The local emulators were already running, so the integration/UI inner commands were used instead of the wrappers that start another instance on the same ports. No emulator reset or shutdown was performed. Tests created local fixture data. On a clean setup, use `npm run test:emulators` and `PLAYWRIGHT_CHANNEL=msedge npm run test:ui` (or installed Playwright Chromium without the channel override).

No backend, Firestore rules, authentication or emulator-gate code changed. Row refresh now reads only that joined fake player's owner-private projection; refresh-all skips unjoined records. Lobby refresh is disabled until roles can exist. No shared player-list component exists yet, so #9 remains separate.

Native device runtime, screen-reader behavior, large-font accessibility and staging/production execution were not tested. Native exports do not establish device usability. No cloud resources or deployments were used.
