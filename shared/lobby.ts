import {
  displayNameSchema,
  gameCodeSchema,
  ROLE_IDS,
  ROLES,
  setupSchema,
  type PlayerStatus,
  type PrivatePlayerData,
  type PublicGame,
  type PublicPlayer,
  type RoleId,
  type Setup,
  type Team,
} from './contracts';

export const DEFAULT_SETUP: Setup = {
  playerCount: 8,
  roles: { killer: 1, minion: 1, good: 5, neutral_exile: 1 },
  timers: { cooldown: 3600, discussion: 120, voting: 30, grace: 60 },
  manualCorrectionsEnabled: true,
  visibleLiveVoting: true,
};
export class DomainError extends Error {
  constructor(
    public readonly code:
      | 'permission-denied'
      | 'failed-precondition'
      | 'not-found'
      | 'resource-exhausted',
    message: string,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}
export interface ServerPlayer extends PublicPlayer {
  publicStatus: PlayerStatus;
  role?: RoleId;
  startingTeam?: Team;
  currentTeam?: Team;
}
export interface LobbyState extends Omit<PublicGame, 'playerIds'> {
  players: Record<string, ServerPlayer>;
}

function requireAdmin(state: LobbyState, uid: string) {
  if (state.adminUid !== uid)
    throw new DomainError(
      'permission-denied',
      'Only the game creator can do this.',
    );
}
export function createLobby(
  id: string,
  code: string,
  uid: string,
  name: string,
  input: Setup,
  now: number,
): LobbyState {
  return {
    id,
    code: gameCodeSchema.parse(code),
    adminUid: uid,
    status: 'lobby',
    setup: setupSchema.parse(input),
    createdAt: now,
    players: {
      [uid]: {
        uid,
        displayName: displayNameSchema.parse(name),
        status: 'alive',
        publicStatus: 'alive',
        joinedAt: now,
      },
    },
  };
}
export function joinLobby(
  state: LobbyState,
  uid: string,
  name: string,
  now: number,
): LobbyState {
  if (Object.hasOwn(state.players, uid)) return state;
  if (state.status !== 'lobby')
    throw new DomainError(
      'failed-precondition',
      'New players can only join a lobby.',
    );
  if (Object.keys(state.players).length >= state.setup.playerCount)
    throw new DomainError('resource-exhausted', 'The lobby is full.');
  return {
    ...state,
    players: {
      ...state.players,
      [uid]: {
        uid,
        displayName: displayNameSchema.parse(name),
        status: 'alive',
        publicStatus: 'alive',
        joinedAt: now,
      },
    },
  };
}
export function updateSetup(
  state: LobbyState,
  uid: string,
  input: Setup,
): LobbyState {
  requireAdmin(state, uid);
  if (state.status !== 'lobby')
    throw new DomainError(
      'failed-precondition',
      'Setup is locked after the game starts.',
    );
  const setup = setupSchema.parse(input);
  if (setup.playerCount < Object.keys(state.players).length)
    throw new DomainError(
      'failed-precondition',
      'Player count cannot be below the number already joined.',
    );
  return { ...state, setup };
}
export function renamePlayer(
  state: LobbyState,
  uid: string,
  name: string,
): LobbyState {
  const player = state.players[uid];
  if (!player)
    throw new DomainError('permission-denied', 'You must be a game member.');
  return {
    ...state,
    players: {
      ...state.players,
      [uid]: { ...player, displayName: displayNameSchema.parse(name) },
    },
  };
}
export function startGame(
  state: LobbyState,
  uid: string,
  now: number,
  random: () => number,
): LobbyState {
  requireAdmin(state, uid);
  if (state.status === 'active') return state; // Retried callable cannot reroll roles.
  if (state.status !== 'lobby')
    throw new DomainError(
      'failed-precondition',
      'Only a lobby can be started.',
    );
  const setup = setupSchema.parse(state.setup);
  if (Object.keys(state.players).length !== setup.playerCount)
    throw new DomainError(
      'failed-precondition',
      `Exactly ${setup.playerCount} players must join before starting.`,
    );
  const roles = ROLE_IDS.flatMap((role) =>
    Array<RoleId>(setup.roles[role]).fill(role),
  );
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    if (j < 0 || j > i || !Number.isInteger(j))
      throw new Error('Random source must return a value in [0, 1).');
    [roles[i], roles[j]] = [roles[j]!, roles[i]!];
  }
  const players = Object.fromEntries(
    Object.entries(state.players).map(([id, player], i) => {
      const role = roles[i]!;
      return [
        id,
        {
          ...player,
          role,
          startingTeam: ROLES[role].team,
          currentTeam: ROLES[role].team,
        },
      ];
    }),
  );
  return { ...state, status: 'active', startedAt: now, players };
}

export function projectGame(state: LobbyState): {
  game: PublicGame;
  players: Record<string, PublicPlayer>;
  privatePlayers: Record<string, PrivatePlayerData>;
} {
  const game: PublicGame = {
    id: state.id,
    code: state.code,
    adminUid: state.adminUid,
    status: state.status,
    setup: state.setup,
    playerIds: Object.keys(state.players),
    createdAt: state.createdAt,
    ...(state.startedAt === undefined ? {} : { startedAt: state.startedAt }),
  };
  const players: Record<string, PublicPlayer> = {};
  const privatePlayers: Record<string, PrivatePlayerData> = {};
  for (const p of Object.values(state.players)) {
    players[p.uid] = {
      uid: p.uid,
      displayName: p.displayName,
      status: p.publicStatus,
      joinedAt: p.joinedAt,
    };
    if (p.role && p.startingTeam && p.currentTeam) {
      privatePlayers[p.uid] = {
        role: p.role,
        startingTeam: p.startingTeam,
        currentTeam: p.currentTeam,
        status: p.status,
      };
    }
  }
  return { game, players, privatePlayers };
}
