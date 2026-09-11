# Project Spec: WTC

## 1. Executive Summary

**WTC** is a mobile companion app for the physical social-deduction game **Within the Collective**.

The game is played in person over multiple days. One hidden killer, optionally supported by minions, attempts to kill or vote out all non-evil players. Good players try to identify and vote out the killer. Neutral roles may have independent win conditions.

The app is both:

- a **player-facing companion app**, and
- an **automated game master** that tracks roles, deaths, nominations, votes, executions, win conditions, public history, and game state.

The MVP should be built as an **Expo React Native** app with a **Firebase serverless backend**.

---

## 2. Goals and Non-Goals

### Goals

- Allow players to create and join a game using a 6-digit numeric game code.
- Run a multi-day social deduction game without a human game master.
- Randomly assign configured roles at game start.
- Privately show each player their own role.
- Track hidden deaths and reveal death status only when a vote starts.
- Support kill/death reporting with confirmation by the other involved party.
- Support a nomination/voting system similar to *Blood on the Clocktower*.
- Track public game history.
- Provide private suspected-role markers per player.
- Support game-end reveal screens.
- Use a low-cost, low-setup backend suitable for small casual groups.

### Non-Goals / Out of Scope for MVP

- Native app store publishing.
- Account creation, email login, social login, or password recovery.
- Player recovery after losing/changing devices.
- Push notifications.
- App-based kill mechanics.
- Advanced role abilities.
- Strong adversarial anti-cheat protection.
- Offline-first gameplay.
- Spectator mode.
- Multiple concurrent games per user beyond basic support.

---

## 3. Users and Use Cases

### User Types

- **Good / Collective players**
- **Killer**
- **Minions**
- **Neutral players**
- **Dead players**
- **Voted-out players**
- **Game creator/admin**

The game creator/admin has no special role knowledge and no gameplay powers, but can manage game settings and dispute resolution.

### Core Use Cases

- Create a game.
- Join a game with a 6-digit code.
- Configure role counts and game settings.
- Start game and assign roles.
- View own role card.
- View player list.
- Record private suspected role/alignment for other players.
- Report a kill/death.
- Confirm or dispute a kill/death.
- Nominate a player for execution.
- Vote on nominations.
- Reveal hidden deaths at vote start.
- Execute a player if voting conditions are met.
- Resolve win conditions.
- View public game history.
- View game-over summary and detailed revealed log.

---

## 4. Game Rules

## 4.1 Factions and Roles

### MVP Roles

| Role | Team | MVP Behavior |
|---|---|---|
| Killer | Evil | Can physically kill players outside the app. Reports kills in app. |
| Minion | Evil | Starts evil. No special MVP app ability. |
| Good / Collective | Good | Tries to vote out the Killer. |
| Neutral Exile-style role | Neutral | Wins immediately if voted out. |

Future roles may add abilities, but the MVP should be structured to support extensibility.

---

## 4.2 Win Conditions

### Good Win

Good wins when the **Killer is voted out**.

### Evil Win

Evil wins when all non-evil players have been either:

- killed, or
- voted out.

When a good player dies, they join the evil team for win-condition purposes.

### Neutral Win

The MVP neutral role wins immediately if they are voted out.

This ends the game.

---

## 4.3 Player States

A player can have the following gameplay status:

- `alive`
- `dead`
- `votedOut`

### Dead Players

Dead players:

- were killed physically and confirmed through the app,
- cannot vote,
- join the evil team,
- still participate socially,
- still receive in-app information,
- still see the app, logs, and discussions.

Dead players are **not publicly revealed immediately**. Their dead status is revealed when the next vote starts.

### Voted-Out Players

Voted-out players:

- cannot vote,
- cannot affect MVP game mechanics,
- still see the app,
- still see public history,
- can still participate in discussion.

---

## 5. Game Setup

## 5.1 Creating a Game

A player creates a game and becomes the **admin/creator**.

The creator:

- chooses game settings,
- selects role counts,
- starts the game,
- can edit allowed in-game settings,
- can resolve disputed kills,
- can manually end the game,
- may correct game state only if manual correction is enabled.

The creator does **not** see hidden roles or private information.

---

## 5.2 Joining a Game

Players join using a **6-digit numeric game code**.

Authentication model:

- no permanent accounts,
- Firebase Anonymous Auth,
- app generates a random username on first open,
- username can be customized anytime,
- player identity is bound to device/session token,
- device loss/recovery is out of scope.

Usernames do not need to be globally unique. The app may warn or auto-disambiguate duplicate names.

---

## 5.3 Player Count

Defaults and constraints:

- Minimum players: `4`
- Maximum players: `20`
- Default configured player count: `8`

These limits are enforced.

---

## 5.4 Role Count Rules

At setup:

- Exactly `1` Killer required.
- `0+` Minions allowed.
- `0+` Neutrals allowed.
- Good/Collective players must satisfy the majority rule.
- Total role counts must exactly equal configured player count.
- Role composition locks after the game starts.

Good majority rule:

```ts
goodCount >= Math.ceil(totalPlayers / 2)
```

Examples:

- 4 players → at least 2 good
- 5 players → at least 3 good
- 6 players → at least 3 good

---

## 5.5 Locked vs Editable Settings

### Locked After Game Start

- player count,
- role composition,
- included roles,
- initial assignment-affecting setup.

### Editable During Game

- vote cooldown,
- discussion duration,
- voting duration,
- post-vote grace period,
- visible-voting setting if desired,
- other timing/tolerance settings.

---

## 6. Default Game Settings

| Setting | Default |
|---|---:|
| Player count | 8 |
| Minimum players | 4 |
| Maximum players | 20 |
| Vote cooldown | 1 hour |
| Discussion time | 2 minutes |
| Voting time | 30 seconds |
| Post-vote grace period | 1 minute |
| Manual admin corrections | Enabled |
| Visible live voting | Enabled |
| Game code format | 6-digit numeric |

---

## 7. Kill / Death Reporting Flow

Physical kills happen outside the app.

Either involved party can initiate the report:

- Killer reports kill of target.
- Victim reports being killed by killer.

### Flow

1. Player A submits kill/death report involving Player B.
2. Player B receives an in-app alert.
3. Player B confirms or disputes.
4. If confirmed:
   - victim is internally marked `dead`,
   - victim joins evil team internally,
   - no public notification is sent,
   - no vote is triggered,
   - public player status does not update until next vote.
5. If disputed:
   - both players are prompted to reconsider and discuss.
6. If still unresolved:
   - all players receive an in-app alert saying a disputed kill occurred,
   - the app does **not** reveal the involved players,
   - admin chooses whether to continue or end the game.

---

## 8. Voting / Nomination System

Voting is inspired by *Blood on the Clocktower*.

## 8.1 Who Can Call a Vote

Any **living** player can nominate/call a vote if:

- no vote is currently active,
- vote cooldown has expired,
- player is not dead,
- player is not voted out.

Dead and voted-out players cannot nominate.

---

## 8.2 Vote Start Behavior

When a vote starts:

- current alive/dead/voted-out statuses are revealed to all players,
- deaths since the last vote become public,
- the app differentiates killed players from voted-out players,
- killer identity is not revealed,
- roles/teams are not revealed.

---

## 8.3 Nomination Flow

1. Living player nominates another player.
2. Discussion timer starts.
3. After discussion time ends, voting timer starts.
4. Eligible living players cast one vote.
5. Not voting counts as no vote / no execution support.
6. If nominee receives majority support, they become the current execution candidate.
7. Additional nominations may occur during the grace period.
8. Later nominations can replace the current candidate only by meeting the required vote conditions.
9. After grace period ends, final execution is resolved.
10. Vote cooldown begins.

---

## 8.4 Voting Rules

- One vote per eligible living voter.
- Dead players cannot vote.
- Voted-out players cannot vote.
- Majority is required.
- Ties result in no execution.
- Specifically: if two nominees are tied for highest votes, nobody is executed.
- Visible live voting is enabled by default.
- If voting visibility is disabled, votes become visible after discussion/voting phase completes.

---

## 8.5 Execution Behavior

When a player is executed:

- status becomes `votedOut`,
- public log records execution,
- win conditions are checked.

If executed player is:

- **Killer** → Good wins.
- **Neutral MVP role** → Neutral wins immediately.
- Anyone else → game continues unless evil win condition is met.

---

## 9. UI / Interface Plan

Use a polished mobile app feel with a parchment/fantasy theme and simple light/dark mode.

## 9.1 Screens

### Welcome / Create-or-Join

- Random username shown.
- User can edit username.
- Create game.
- Join game with 6-digit code.

### Lobby

- Shows joined players.
- Shows expected player count.
- Creator can access setup/settings.
- Creator can start game once role counts and player count are valid.

### Game Setup / Settings

- Player count.
- Role counts.
- Available roles.
- Timers.
- Vote visibility.
- Manual correction option.
- Validation messages.

### Main Dashboard

Shows:

- current game status,
- player’s own role card summary,
- call-vote button if eligible,
- kill/death report action,
- recent public history,
- navigation to player list, settings, log, admin tools if applicable.

### Role Card

- Shows player’s own role.
- Shows team/win condition.
- Shows available role-specific actions.

For MVP:

- Killer sees “Report Kill”.
- Non-killers see “Report Death”.
- Future role abilities should fit into this section.

### Player List

Shows all players.

For each player:

- display name,
- public status if revealed,
- killed vs voted-out status where publicly known,
- private suspected role/alignment marker set by current user.

The app must not confirm role/team until game over.

### Kill/Death Report Flow

- Select involved player.
- Submit report.
- Other party confirms/disputes.
- Pending status screen.
- Dispute escalation flow.

### Active Vote / Nomination Screen

- Nominee.
- Nominator.
- Discussion timer.
- Voting timer.
- Vote controls for eligible voters.
- Vote count/visibility according to settings.
- Current execution candidate.
- Grace period countdown.

### Game History / Log

Public info only.

### Read-Only Settings

All players can see current game settings.

### Admin Controls

Available only to creator/admin.

Actions:

- edit allowed settings,
- resolve disputed kill by continue/end,
- manually end game,
- perform state corrections if enabled.

### Game Over / Results

Two levels:

1. **Summary screen**
   - winning team/player,
   - each player’s final role/team.

2. **Detailed revealed log**
   - public history plus revealed names/roles where relevant.

---

## 10. History / Public Log

The log should only include information that players could publicly know.

MVP entries:

- game started,
- nomination called,
- nominator and nominee,
- death-status reveal at vote start,
- final vote count/result for each nomination,
- player executed,
- vote ended with no execution,
- disputed kill occurred,
- game ended,
- winner.

No private/admin-only game log is required for MVP.

---

## 11. Notifications / Alerts

MVP uses **in-app alerts only**.

Alerts should be implemented through an abstraction layer so push notifications can be added later.

Critical MVP alerts:

- vote called,
- player is asked to confirm kill/death report,
- kill/death report disputed,
- disputed kill escalated,
- game ended,
- player-specific action required.

Suggested abstraction:

```ts
type AlertType =
  | 'vote_called'
  | 'kill_confirmation_requested'
  | 'kill_disputed'
  | 'disputed_kill_escalated'
  | 'game_ended'
  | 'admin_action_required';

interface GameAlert {
  id: string;
  gameId: string;
  targetPlayerId?: string;
  type: AlertType;
  title: string;
  body: string;
  createdAt: Timestamp;
  readBy: string[];
}
```

Future push notifications can consume the same alert documents.

---

# 12. Recommended Technical Architecture

## 12.1 Stack

Use:

- **Expo React Native**
- **TypeScript**
- **Firebase**
  - Firebase Anonymous Auth
  - Firestore
  - Cloud Functions
  - Firebase Hosting only if a web landing/admin page is later added

Recommended package style:

- Expo Router or React Navigation
- React Query or direct Firestore hooks
- Zod for validation
- date-fns or dayjs for time display
- Zustand or Context for local app state

---

## 12.2 Why Firebase

Firebase is recommended because:

- low setup,
- generous free tier,
- strong Expo/mobile support,
- realtime Firestore listeners for lobby/voting,
- anonymous auth supports accountless device identity,
- Cloud Functions avoid maintaining a VPS,
- suitable for small casual groups.

### Pricing Note

Initial use can likely stay very cheap.

Use:

- Firebase Spark/free where possible,
- Blaze pay-as-you-go if Cloud Functions require it,
- expect minimal cost for a small friend group,
- monitor Firestore reads/writes and function invocations.

---

## 12.3 Serverless Model

The app should not run a custom server.

Architecture:

```text
Expo App
  ↓
Firebase Anonymous Auth
  ↓
Firestore realtime documents
  ↓
Cloud Functions for authoritative game actions
```

The client should request actions. Cloud Functions should validate and apply important state changes.

Examples:

- create game,
- join game,
- start game,
- assign roles,
- report kill,
- confirm kill,
- call nomination,
- cast vote,
- resolve vote,
- end game.

---

# 13. Firestore Data Model

This is a suggested MVP model.

## 13.1 Collections

```text
games/{gameId}
games/{gameId}/players/{playerId}
games/{gameId}/privatePlayerData/{playerId}
games/{gameId}/votes/{voteId}
games/{gameId}/killReports/{reportId}
games/{gameId}/log/{logId}
games/{gameId}/alerts/{alertId}
games/{gameId}/suspicions/{viewerPlayerId_playerId}
```

---

## 13.2 `games/{gameId}`

```ts
interface Game {
  id: string;
  code: string; // 6-digit numeric string
  status: 'lobby' | 'active' | 'paused' | 'ended';

  createdByPlayerId: string;
  createdByUid: string;

  playerCount: number;

  settings: {
    voteCooldownSeconds: number; // default 3600
    discussionSeconds: number; // default 120
    votingSeconds: number; // default 30
    gracePeriodSeconds: number; // default 60
    visibleLiveVoting: boolean; // default true
    manualCorrectionsEnabled: boolean; // default true
  };

  roleSetup: {
    killerCount: 1;
    minionCount: number;
    goodCount: number;
    neutralExileCount: number;
  };

  activeVoteId?: string;
  lastVoteEndedAt?: Timestamp;

  winner?: {
    type: 'good' | 'evil' | 'neutral';
    playerId?: string;
    reason: string;
  };

  createdAt: Timestamp;
  startedAt?: Timestamp;
  endedAt?: Timestamp;
}
```

---

## 13.3 `players/{playerId}`

Public/semi-public player state.

```ts
interface Player {
  id: string;
  uid: string;
  displayName: string;

  status: 'alive' | 'dead' | 'votedOut';

  // Public reveal control
  statusPubliclyRevealed: boolean;
  deathType?: 'killed' | 'votedOut';

  joinedAt: Timestamp;
  isAdmin: boolean;
}
```

Do not store role here if normal players can read this document.

---

## 13.4 `privatePlayerData/{playerId}`

Access should be restricted so only the owning player can read their own document, except Cloud Functions.

```ts
interface PrivatePlayerData {
  playerId: string;
  role: 'killer' | 'minion' | 'good' | 'neutral_exile';
  startingTeam: 'evil' | 'good' | 'neutral';
  currentTeam: 'evil' | 'good' | 'neutral';
  winCondition: string;
}
```

At game over, revealed role/team info can be copied to a public results object.

---

## 13.5 `votes/{voteId}`

```ts
interface VoteSession {
  id: string;
  status:
    | 'discussion'
    | 'voting'
    | 'grace'
    | 'resolving'
    | 'ended';

  nominatedByPlayerId: string;
  nomineePlayerId: string;

  startedAt: Timestamp;
  discussionEndsAt: Timestamp;
  votingEndsAt: Timestamp;
  graceEndsAt: Timestamp;

  votes: Record<string, boolean>; // playerId -> true means vote for execution

  eligibleVoterIds: string[];

  yesCount: number;
  majorityRequired: number;

  result?: {
    passed: boolean;
    executedPlayerId?: string;
    noExecutionReason?: 'no_majority' | 'tie' | 'superseded';
  };

  createdAt: Timestamp;
  endedAt?: Timestamp;
}
```

If supporting multiple nominations in a single vote window becomes complex, use:

```text
games/{gameId}/voteRounds/{roundId}
games/{gameId}/voteRounds/{roundId}/nominations/{nominationId}
```

For MVP, a simpler single active nomination model is acceptable if carefully implemented.

---

## 13.6 `killReports/{reportId}`

```ts
interface KillReport {
  id: string;

  initiatedByPlayerId: string;
  otherPartyPlayerId: string;

  claimedKillerPlayerId: string;
  claimedVictimPlayerId: string;

  status:
    | 'pending_confirmation'
    | 'confirmed'
    | 'disputed'
    | 'escalated'
    | 'resolved_continue'
    | 'resolved_end_game';

  createdAt: Timestamp;
  confirmedAt?: Timestamp;
  disputedAt?: Timestamp;
  escalatedAt?: Timestamp;
  resolvedAt?: Timestamp;
}
```

---

## 13.7 `log/{logId}`

```ts
interface GameLogEntry {
  id: string;
  type:
    | 'game_started'
    | 'nomination_called'
    | 'death_status_revealed'
    | 'vote_result'
    | 'player_executed'
    | 'no_execution'
    | 'disputed_kill'
    | 'game_ended';

  message: string;
  publicData: Record<string, unknown>;
  createdAt: Timestamp;
}
```

---

## 13.8 `suspicions/{viewerPlayerId_playerId}`

Private per-viewer suspicion data.

```ts
interface Suspicion {
  viewerPlayerId: string;
  targetPlayerId: string;
  suspectedRole:
    | 'unknown'
    | 'killer'
    | 'minion'
    | 'good'
    | 'neutral';

  updatedAt: Timestamp;
}
```

Only `viewerPlayerId` should read/write this document.

---

# 14. Cloud Functions / API Actions

Use callable HTTPS functions or HTTPS endpoints.

## Required Functions

### `createGame`

Creates game with initial settings and 6-digit code.

Validates:

- player count between 4 and 20,
- role counts valid,
- good majority rule,
- exactly one killer.

---

### `joinGame`

Input:

```ts
{
  code: string;
  displayName: string;
}
```

Behavior:

- finds game by code,
- ensures game is in lobby,
- ensures lobby is not full,
- creates player record,
- associates Firebase anonymous UID.

---

### `updateLobbySettings`

Admin only.

Allowed while game is in lobby.

Updates:

- player count,
- role setup,
- timer defaults,
- manual correction setting,
- visible voting setting.

---

### `startGame`

Admin only.

Behavior:

- validates joined player count equals configured player count,
- validates role setup,
- randomly assigns roles,
- writes private role docs,
- sets game status to `active`,
- writes `game_started` log.

---

### `updateRuntimeSettings`

Admin only.

Allowed during active game.

Updates:

- cooldowns,
- timers,
- vote visibility,
- other runtime settings.

---

### `reportKill`

Input:

```ts
{
  gameId: string;
  claimedKillerPlayerId: string;
  claimedVictimPlayerId: string;
}
```

Allowed if requester is one of the involved parties.

Creates pending kill report and alert for other party.

---

### `respondToKillReport`

Input:

```ts
{
  reportId: string;
  response: 'confirm' | 'dispute';
}
```

If confirmed:

- victim becomes internally dead,
- victim current team becomes evil,
- no public log entry,
- check evil win condition.

If disputed:

- mark disputed,
- prompt reconsideration.

---

### `escalateDisputedKill`

If unresolved:

- notify all players that a disputed kill occurred,
- do not reveal involved players,
- write public log entry `disputed_kill`,
- require admin resolution.

---

### `resolveDisputedKill`

Admin only.

Options:

- continue game,
- end game manually.

---

### `callNomination`

Input:

```ts
{
  nomineePlayerId: string;
}
```

Validates:

- requester alive,
- requester not voted out,
- no active incompatible vote,
- cooldown expired,
- nominee valid.

Behavior:

- reveals current dead/voted-out statuses,
- creates vote session,
- writes nomination log,
- sends in-app alerts.

---

### `castVote`

Input:

```ts
{
  voteId: string;
  vote: boolean;
}
```

Validates:

- voter eligible,
- voting phase active,
- one vote per voter.

---

### `resolveVote`

Can be triggered by:

- scheduled function,
- client after timer expires,
- admin action if needed.

Behavior:

- counts votes,
- checks majority,
- handles tie/no execution,
- executes player if valid,
- writes public log,
- checks win conditions,
- starts cooldown.

---

### `endGame`

Admin or system.

Behavior:

- sets game status to `ended`,
- writes winner,
- reveals final roles/teams,
- writes game-ended log.

---

# 15. Security and Rules

MVP assumes casual trusted players, but should still avoid obvious tampering.

## Firestore Rules Principles

- Users can read public game/player/log data for games they joined.
- Users can read only their own private role document.
- Users can write their own display name.
- Users can write their own suspicion records.
- Important game state writes should go through Cloud Functions.
- Admin-only updates should verify admin identity.
- Hidden roles should not be stored in broadly readable documents before game end.

---

# 16. Realtime Requirements

Use Firestore realtime listeners for:

- lobby player list,
- active vote session,
- voting timers/state,
- in-app alerts,
- game status changes.

Manual refresh or normal Firestore fetches are acceptable for:

- history log,
- read-only settings,
- older results,
- non-critical state.

Because the game spans multiple days, the app should not assume it can run continuously in the background.

---

# 17. Testing and Validation

## Unit Tests

Test:

- role setup validation,
- good majority calculation,
- vote majority calculation,
- tie handling,
- win-condition checks,
- kill confirmation state transition,
- neutral win on execution,
- game code generation.

## Integration Tests

Test Cloud Functions:

- create game,
- join game,
- start game,
- report/confirm kill,
- call nomination,
- cast votes,
- resolve execution,
- end game.

## Manual MVP Test Scenarios

1. Create 4-player game.
2. Join with 4 devices/sessions.
3. Start game and verify private roles.
4. Killer reports kill; victim confirms.
5. Verify death is hidden until vote.
6. Living player calls nomination.
7. Verify dead status reveal.
8. Cast votes with majority.
9. Execute non-killer; game continues.
10. Execute killer; good wins.
11. Execute neutral exile; neutral wins.
12. Dispute kill and verify anonymous escalation.
13. Admin ends game manually.
14. Verify game-over role reveal.

---

# 18. Risks and Tradeoffs

## Risks

- Firebase Cloud Functions may require Blaze billing.
- Firestore timer resolution is not exact unless carefully handled.
- Anonymous/device-based identity means no account recovery.
- Casual anti-cheat model may not stop malicious players from inspecting local app behavior.
- Multi-day games require careful handling of stale sessions and reconnects.
- Voting flow may become complex if multiple nominations are modeled too simply.

## Tradeoffs

- Firebase gives low setup and strong realtime support but less backend control than a custom server.
- In-app alerts are simpler than push but require users to open/check the app.
- Hidden role data must be carefully separated from public player data.
- Manual admin corrections add flexibility but may complicate audit/history logic.

---

# 19. Open Questions for Later Versions

- What additional roles and abilities should exist?
- Should dead players eventually have role abilities?
- Should app-based kill methods be added?
- Should push notifications be added?
- Should game recovery/device transfer be supported?
- Should there be a web admin panel?
- Should multiple admins be allowed?
- Should logs have a private audit trail separate from public history?
- Should there be support for larger games above 20 players?

---

# 20. MVP Implementation Backlog

| ID | Task | Depends On | Acceptance Criteria |
|---|---|---|---|
| T1 | Initialize Expo TypeScript app | None | App runs locally on iOS/Android simulator or Expo Go/dev build. |
| T2 | Set up Firebase project | T1 | Firebase Auth, Firestore, Functions configured. |
| T3 | Implement anonymous auth/device identity | T2 | User receives stable UID/session on device. |
| T4 | Build welcome/create/join screens | T3 | User can set display name, create game, join with code. |
| T5 | Implement game creation Cloud Function | T2 | Valid game created with 6-digit code. |
| T6 | Implement lobby and join flow | T5 | Multiple users can join same lobby in realtime. |
| T7 | Implement setup validation | T5 | Invalid role/player counts blocked. |
| T8 | Implement start game and role assignment | T6, T7 | Roles randomly assigned and privately visible. |
| T9 | Build dashboard and role card | T8 | Player sees own role and game status. |
| T10 | Build player list and private suspicion marker | T8 | User can privately mark suspected role per player. |
| T11 | Implement kill report/confirmation flow | T8 | Confirmed kill marks victim dead internally. |
| T12 | Implement disputed kill flow | T11 | Anonymous public dispute alert and admin resolution. |
| T13 | Implement nomination/vote session | T8 | Living player can nominate and timers run. |
| T14 | Implement vote casting and resolution | T13 | Majority/tie/no-execution rules work. |
| T15 | Reveal deaths at vote start | T13 | Dead statuses become public only when vote starts. |
| T16 | Implement win-condition checks | T11, T14 | Good, evil, and neutral wins trigger correctly. |
| T17 | Implement public game log | T13-T16 | Public events appear in history. |
| T18 | Implement admin controls | T8 | Admin can edit runtime settings, resolve disputes, end game. |
| T19 | Implement game-over screens | T16 | Summary and detailed revealed log display roles/teams. |
| T20 | Add polished parchment/fantasy theme | Screens complete | Light/dark themed UI feels mobile-polished. |
| T21 | Add tests for core rules/functions | Core functions complete | Validation, voting, kills, and win checks covered. |

---

# 21. Agent Handoff Instructions

An implementation agent should:

1. Build the app as an **Expo React Native TypeScript** project.
2. Use **Firebase Anonymous Auth**, **Firestore**, and **Cloud Functions**.
3. Keep hidden role/team data out of broadly readable documents.
4. Implement game actions through Cloud Functions where practical.
5. Use Firestore realtime listeners for lobby, voting, alerts, and game status.
6. Start with MVP roles only:
   - Killer,
   - Minion,
   - Good,
   - Neutral wins-if-voted-out.
7. Preserve the physical-game boundary:
   - kills happen outside the app,
   - the app only reports/confirms/tracks them.
8. Ensure deaths stay hidden until a vote starts.
9. Ensure voted-out and dead players cannot vote.
10. Implement the voting system with:
    - nomination,
    - discussion timer,
    - voting timer,
    - grace period,
    - majority requirement,
    - tie means no execution.
11. Implement admin powers without giving the admin hidden role knowledge.
12. Structure alerts so push notifications can be added later.
13. Use a polished parchment/fantasy UI with light/dark mode.
14. Do not add accounts, push notifications, advanced roles, or app-based kill methods unless explicitly requested.
