# WTC

Expo React Native companion for **Within the Collective**.

**Development preview, not a complete game:** create/join a lobby, configure setup, assign private roles, view public players/history/settings, record private suspected roles, and use an emulator-only fake-player harness for lobby/start testing. Kills, votes, disputes, game-end results, and runtime admin controls are still to be implemented.

## Start here

- [Next-agent handover](docs/HANDOVER.md)
- [Setup and running locally](docs/SETUP.md)
- [Approved project spec](docs/WTC_PROJECT_SPEC.md)
- [Implementation progress and open questions](docs/IMPLEMENTATION_PROGRESS.md)

## Local quick start

Requires Node 22.13+ (Node 22 recommended) and Java 21+ for Firebase emulators.

```bash
npm ci
cp .env.example .env
npm run emulators
```

In another terminal:

```bash
npm run web
# or for Expo Go on a physical phone:
npm run start:lan
```

For a physical phone, keep `EXPO_PUBLIC_EMULATOR_HOST=auto` or set it to your computer's LAN address if auto-detection fails. See the setup guide for platform-specific details.

## Checks

```bash
npm run check          # 27 domain tests, typecheck, Functions build, lint, formatting
npm run test:emulators # 9 callable/security integration tests
npm run test:ui        # four-player browser flow; requires a Playwright browser
npm run build:web
npm run build:native   # JS/Hermes exports, not native app binaries
```

Set `EXPO_PUBLIC_DEV_MODE=true` with emulator mode to show creator-only fake-player controls for local testing. No Firebase project has been created or deployed. Emulator mode is the default.
