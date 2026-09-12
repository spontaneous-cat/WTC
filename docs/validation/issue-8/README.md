# Issue #8 — navigation, back controls, and menu validation

Issue: https://github.com/spontaneous-cat/WTC/issues/8

Validated on 2026-09-11 for app version 0.1.3.

## Acceptance evidence

| Criterion                                                                                         | Implementation and verification                                                                                                                                                                                                                                                                                          | Status                                                                          |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Users can navigate to settings and game rules from a drawer/menu on lobby and active-game screens | `src/screens/Lobby.tsx` and `src/screens/Dashboard.tsx` add an `Open menu` entry point. The menu links to `Game settings` and generic `Game rules` in both lobby and active game states. `tests/e2e/lobby.spec.ts` exercises lobby menu → settings, lobby menu → rules, active menu → settings, and active menu → rules. | Verified                                                                        |
| Back controls are visible and functional for nested screens/forms on web and mobile layouts       | `src/ui/navigation.ts` adds a small nested-screen hook with explicit back handling plus web `popstate` and native `BackHandler` support. Screens/forms display `Back to lobby` or `Back to dashboard`. The UI test clicks back from settings/rules and uses browser back from the lobby rules screen.                    | Verified in browser; native handler compiled but device back not runtime-tested |
| Existing lobby/start/role/suspicion flows still pass automated tests                              | Existing four-player create/join/start, private role reveal, suspicion privacy, reconnect, and fake-player scenarios still pass.                                                                                                                                                                                         | Verified                                                                        |
| Tests cover at least one drawer/menu navigation path and one back-button path                     | `tests/e2e/lobby.spec.ts` covers multiple menu paths and both explicit back button and browser back behavior.                                                                                                                                                                                                            | Verified                                                                        |

## Visual inspection

Screenshots captured from the 390×844 browser/mobile viewport:

- [Lobby menu](lobby-menu.png)
- [Lobby rules](lobby-rules.png)
- [Dashboard settings](dashboard-settings.png)
- [Dashboard main](dashboard-main.png)

Inspection: the menu is reachable without exposing hidden game information, settings/rules content is readable on the phone viewport, and explicit back controls are visible above nested content. No before screenshot exists for the new menu/rules screens because those destinations did not previously exist; the previous app used inline dashboard tabs/cards instead.

## Validation and reproduction

- `npm run check`: 28 unit tests, app/Functions typechecks, lint, and formatting passed.
- `npm run test:integration`: nine callable/security tests passed against existing `demo-wtc` emulators with `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080` and `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`.
- `npx playwright test`: three browser scenarios passed with those emulator variables and `PLAYWRIGHT_CHANNEL=msedge`; the Playwright web server runs `npm run build:web` before the tests.
- `npm run build:native`: Android and iOS Hermes exports passed.

The local emulators were already running, so inner integration/UI commands were used rather than wrappers that start another emulator instance. No backend, Firestore rules, identity model, or hidden-state storage changed. Native device runtime, Android hardware-back behavior on a device, screen-reader behavior, large-font accessibility, and staging/production execution were not tested.
