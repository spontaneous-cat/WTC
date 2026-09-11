# WTC setup

## Prerequisites

- Node **22.13+**, preferably Node 22 to match the deployed Functions runtime. Local validation used Node 24.12.0; Firebase warns that the host runtime differs from the configured Node 22 target.
- npm (one root lockfile; `functions/` is an npm workspace).
- Java **21+** for the current Firestore emulator.
- Git Bash on this Windows machine for the agent's command tool.
- A compatible Expo Go client or development build for native testing; browser testing requires neither Android Studio nor Xcode.

Install dependencies from the repository root:

```bash
npm ci
cp .env.example .env
```

Do not put service-account keys or other secrets in `EXPO_PUBLIC_*` variables. They are compiled into the app.

## Run entirely locally

Terminal 1:

```bash
npm run emulators
```

Terminal 2:

```bash
npm run web
# alternatively, for Expo Go on a physical phone:
npm run start:lan
```

The app defaults to the **demo-wtc** emulator project. No Firebase login, billing account, or real cloud project is required. Keep the app in emulator mode for local development.

Emulator endpoints:

| Service     | Port |
| ----------- | ---- |
| Auth        | 9099 |
| Firestore   | 8080 |
| Functions   | 5001 |
| Emulator UI | 4000 |

The emulators bind to `0.0.0.0` so a physical phone can connect. Use only a trusted private network; emulators are not a secured production service and must not be exposed to the internet.

### Host address in `.env`

`EXPO_PUBLIC_EMULATOR_HOST=auto` derives the emulator host from the Expo/Metro URL. This is the recommended default for Expo Go: start Expo in LAN mode and scan the QR code from the same Wi-Fi network.

If auto-detection does not fit your setup, set `EXPO_PUBLIC_EMULATOR_HOST` explicitly:

- Desktop browser or iOS simulator: `127.0.0.1`
- Android Studio emulator: `10.0.2.2`
- Physical phone: computer's LAN IPv4 address, for example `192.168.1.10`

Phone and computer must share a network. Allow the emulator ports through your private-network firewall if needed. Restart Expo after changing `.env`; use `npx expo start --clear` if stale configuration remains. Do not use Expo tunnel mode for emulator testing unless you also provide your own secure tunnel for emulator ports; the Expo tunnel does not tunnel Firebase Auth/Firestore/Functions emulator traffic.

### Data lifecycle

The current emulator command does **not** export/import data automatically. Restarting emulators resets their game state. For persisted local testing, use Firebase's emulator export/import options deliberately. Clear development browser/app storage if a reset leaves a cached identity or profile pointing at deleted data. Clearing a real player's app data loses their identity; there is no recovery flow.

The current app permits one unfinished game per identity. Leave/end/reset UI is not implemented yet. Use separate browser profiles/devices for manual multi-player testing, or the automated browser test (four isolated contexts).

## Emulator-only fake-player developer mode

A local fake-player harness is available for one developer using a computer and, optionally, a phone as the real player/admin. It is explicitly gated by both settings below and only talks to the `demo-wtc` Auth, Firestore, and Functions emulators:

```bash
EXPO_PUBLIC_USE_EMULATORS=true
EXPO_PUBLIC_DEV_MODE=true
```

Restart Expo after changing either value. The fake-player panel appears only for the game creator and creates isolated anonymous Auth emulator users in local app storage, then uses the same callable Cloud Functions as real players to join lobbies. After the game starts, the developer panel can inspect fake players' private roles for repeatable manual testing; normal player UI and Firestore rules still cannot read another player's private role.

Current scope: fake players can be created, joined to the current lobby, reset from local storage, and refreshed after start. Server-side leave/remove, kill reports, nominations, ballots, alerts, and completed game flows are not implemented yet, so the panel labels those controls as pending future authoritative actions.

For a computer-plus-phone test:

1. Start emulators on the computer with `npm run emulators`.
2. Set `EXPO_PUBLIC_DEV_MODE=true` and keep `EXPO_PUBLIC_EMULATOR_HOST=auto` (or your LAN IPv4 address).
3. Start Expo with `npm run start:lan`.
4. Open the admin/player on the computer or phone, create a lobby, then use the creator-only fake-player panel to fill remaining seats.
5. If emulator data is reset, also use **Reset local fake players** or clear browser/app storage so old local fake identities do not point at deleted games.

Fake-player controls must not be used for staging or production builds. With `EXPO_PUBLIC_USE_EMULATORS=false`, the app disables dev mode even if `EXPO_PUBLIC_DEV_MODE=true` is accidentally set.

## Automated checks

```bash
npm run check
npm run test:emulators
npx playwright install chromium
npm run test:ui
npm run build:web
npm run build:native
npx expo-doctor
```

Do not run the emulator test commands while a development emulator instance is already using the same ports. The scripts start and stop their own instances.

`npm run test:integration` alone intentionally refuses to run without emulator environment variables. It is invoked by `test:emulators`.

The browser suite starts a built web preview on port 4173 and requires emulator environment variables supplied by `test:ui`. It overrides web-build configuration to use emulators, never production.

### This Windows machine: temporary Java and existing Edge

System Java was version 8. The agent downloaded a portable Temurin Java 21 distribution into the OS temporary directory; it did not change the system installation. While that temporary directory exists, Git Bash can use:

```bash
export JAVA_HOME="$(cygpath -w /tmp/wtc-jdk21/jdk-21.0.12.1+1)"
export PATH="/tmp/wtc-jdk21/jdk-21.0.12.1+1/bin:$PATH"
java -version
```

If it has been cleaned up, install a supported Java 21+ JDK or download another portable distribution. These temporary paths are not a portable project dependency.

Playwright's Chromium download timed out here. The browser test was successfully run using the existing Microsoft Edge installation:

```bash
export PLAYWRIGHT_CHANNEL=msedge
npm run test:ui
```

On another machine, install Playwright Chromium normally and leave `PLAYWRIGHT_CHANNEL` unset.

## Eventual Firebase deployment (not performed)

**Finish the remaining gameplay, security tests, operational controls, and device testing first.** These are setup directions, not a claim that this preview is production-ready.

1. Create a Firebase project and choose a Firestore region. Functions currently use `us-central1`; keep the app and backend region declarations consistent if changing it.
2. Enable Anonymous authentication and create Firestore in production/locked mode.
3. Register a Firebase **web app** to get the Firebase JS SDK configuration, even for Expo native clients.
4. Enable Blaze billing for deployed Cloud Functions. The full authoritative architecture should not be reduced to client-side writes just to avoid billing.
5. Authenticate the local Firebase CLI, then deploy explicitly to the intended project:

   ```bash
   npx firebase login
   npm run check
   npx firebase deploy --project YOUR_PROJECT_ID --only firestore:rules,functions
   ```

6. Set `EXPO_PUBLIC_USE_EMULATORS=false` and the Firebase client config values from `.env.example`, then rebuild/restart the app.
7. Verify permissions and the complete game flow against a separate staging project before sharing with players. Configure billing alerts and retention/cleanup policies.

No `.firebaserc` pointing to a real project has been created. Always pass the project explicitly for cloud deployment. Do not deploy or create paid resources without the user's authorization.

## Cost expectations and follow-up

Local emulators and local web/native JS exports have no Firebase service charges. Hosted Functions require billing; low usage may fit free usage allowances, but **zero cost is not guaranteed**. Firestore operations/storage, Functions compute/networking, and build/artifact storage can all contribute. Future deadline tasks and push delivery also need their own cost review. Budget alerts are notifications, not hard spending caps. `maxInstances: 2` limits each function's scaling but does not cap the entire bill.

Current official rates and free quotas were **not independently researched in this implementation session**. The next agent should verify and document them before deployment rather than reuse potentially stale numbers:

- https://firebase.google.com/pricing
- https://firebase.google.com/docs/functions/quotas
- https://firebase.google.com/docs/firestore/pricing
- https://expo.dev/pricing

EAS build quotas and app-store developer accounts are separate from Firebase. Neither EAS setup nor store publishing is required for the local preview.
