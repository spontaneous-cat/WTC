# Issue 38 validation

Targeted phone-width validation was run at 390 × 844 with the compact lobby/player-list E2E flow.

- Long name covered: `Player 1 With a Very Long Display Name`.
- Verified compact lobby row accessibility label and active-game row accessibility label.
- Verified the row action `Set suspicion for Player 1 With a Very Long Display Name` is reachable and persists a private `Killer` suspicion for the current owner only.
- Final artifact: `compact-player-list-phone.png`.

Command:

```bash
PLAYWRIGHT_CHANNEL=msedge npx firebase emulators:exec --project demo-wtc --only auth,firestore,functions "npx playwright test tests/e2e/lobby.spec.ts"
```
