import {
  displayNameSchema,
  gameCodeSchema,
  ROLE_IDS,
  ROLES,
  setupSchema,
  type NoExecutionReason,
  type PlayerStatus,
  type PrivatePlayerData,
  type PublicGame,
  type PublicPlayer,
  type PublicVoteRound,
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
      | 'resource-exhausted'
      | 'already-exists',
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
export interface VoteNomination {
  id: string;
  nominatedByPlayerId: string;
  nomineePlayerId: string;
  phase: 'discussion' | 'voting' | 'grace' | 'ended';
  startedAt: number;
  discussionEndsAt: number;
  votingEndsAt: number;
  eligibleVoterIds: string[];
  votes: Record<string, boolean>;
  yesCount: number;
  noCount: number;
  majorityRequired: number;
  result?: { passed: boolean; noExecutionReason?: NoExecutionReason };
}
export interface VoteRound {
  id: string;
  status: 'discussion' | 'voting' | 'grace' | 'ended';
  startedAt: number;
  graceEndsAt: number;
  nominations: VoteNomination[];
  currentCandidatePlayerId?: string;
  currentCandidateVotes?: number;
  tiedCandidatePlayerIds?: string[];
  result?: { executedPlayerId?: string; noExecutionReason?: NoExecutionReason };
  endedAt?: number;
}
export interface LobbyState extends Omit<PublicGame, 'playerIds'> {
  players: Record<string, ServerPlayer>;
  voteRounds?: Record<string, VoteRound>;
  nominationCooldownUntil?: Record<string, number>;
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
export function updateRuntimeSettings(
  state: LobbyState,
  uid: string,
  input: Setup,
  now: number,
): LobbyState {
  requireAdmin(state, uid);
  requireActive(state);
  const setup = setupSchema.parse(input);
  if (
    JSON.stringify(setup.roles) !== JSON.stringify(state.setup.roles) ||
    setup.playerCount !== state.setup.playerCount
  )
    throw new DomainError(
      'failed-precondition',
      'Role setup and player count are locked after the game starts.',
    );
  let next: LobbyState = { ...state, setup };
  const roundId = next.activeVoteRoundId;
  const round = roundId ? next.voteRounds?.[roundId] : undefined;
  const nomination = round?.nominations.at(-1);
  if (round && nomination && nomination.phase !== 'ended') {
    const elapsed = now - nomination.startedAt;
    const discussionEndsAt =
      nomination.startedAt + setup.timers.discussion * 1000;
    const votingEndsAt = discussionEndsAt + setup.timers.voting * 1000;
    const graceEndsAt = votingEndsAt + setup.timers.grace * 1000;
    const adjustedNomination = {
      ...nomination,
      discussionEndsAt,
      votingEndsAt,
    };
    const adjustedRound = {
      ...round,
      graceEndsAt,
      nominations: round.nominations.map((n) =>
        n.id === nomination.id ? adjustedNomination : n,
      ),
    };
    next = {
      ...next,
      voteRounds: { ...(next.voteRounds ?? {}), [round.id]: adjustedRound },
    };
    if (elapsed >= 0) next = advanceVote(next, round.id, now);
  }
  return next;
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

function requireActive(state: LobbyState) {
  if (state.status !== 'active')
    throw new DomainError('failed-precondition', 'The game is not active.');
}
function livingPlayer(state: LobbyState, uid: string) {
  const player = state.players[uid];
  if (!player)
    throw new DomainError('permission-denied', 'You must be a game member.');
  if (player.status !== 'alive')
    throw new DomainError(
      'failed-precondition',
      'Only living players can do this.',
    );
  return player;
}
function eligibleVoters(state: LobbyState) {
  return Object.values(state.players)
    .filter((p) => p.status === 'alive')
    .map((p) => p.uid);
}
function publicRevealDeaths(state: LobbyState) {
  const players = Object.fromEntries(
    Object.entries(state.players).map(([uid, p]) => [
      uid,
      p.status === p.publicStatus ? p : { ...p, publicStatus: p.status },
    ]),
  );
  return { ...state, players };
}
export function callNomination(
  state: LobbyState,
  uid: string,
  nomineePlayerId: string,
  now: number,
  roundId: string,
  nominationId: string,
): LobbyState {
  requireActive(state);
  livingPlayer(state, uid);
  livingPlayer(state, nomineePlayerId);
  const cooldown = state.nominationCooldownUntil ?? {};
  if ((cooldown[uid] ?? 0) > now || (cooldown[nomineePlayerId] ?? 0) > now)
    throw new DomainError(
      'failed-precondition',
      'That player is still in voting cooldown.',
    );
  let next = publicRevealDeaths(state);
  if (next.activeVoteRoundId)
    next = advanceVote(next, next.activeVoteRoundId, now);
  const activeRound = next.activeVoteRoundId
    ? next.voteRounds?.[next.activeVoteRoundId]
    : undefined;
  if (activeRound && activeRound.status !== 'grace')
    throw new DomainError(
      'failed-precondition',
      'A nomination is already active.',
    );
  if (activeRound?.status === 'ended')
    throw new DomainError(
      'failed-precondition',
      'The previous vote round has ended.',
    );
  const voters = eligibleVoters(next);
  const timers = next.setup.timers;
  const nomination: VoteNomination = {
    id: nominationId,
    nominatedByPlayerId: uid,
    nomineePlayerId,
    phase: 'discussion',
    startedAt: now,
    discussionEndsAt: now + timers.discussion * 1000,
    votingEndsAt: now + (timers.discussion + timers.voting) * 1000,
    eligibleVoterIds: voters,
    votes: {},
    yesCount: 0,
    noCount: 0,
    majorityRequired: Math.ceil(voters.length / 2),
  };
  const graceEndsAt = nomination.votingEndsAt + timers.grace * 1000;
  const round: VoteRound = activeRound
    ? {
        ...activeRound,
        status: 'discussion',
        graceEndsAt,
        nominations: [...activeRound.nominations, nomination],
      }
    : {
        id: roundId,
        status: 'discussion',
        startedAt: now,
        graceEndsAt,
        nominations: [nomination],
      };
  const participantCooldownUntil = graceEndsAt + timers.cooldown * 1000;
  return {
    ...next,
    activeVoteRoundId: round.id,
    voteRounds: { ...(next.voteRounds ?? {}), [round.id]: round },
    nominationCooldownUntil: {
      ...cooldown,
      [uid]: participantCooldownUntil,
      [nomineePlayerId]: participantCooldownUntil,
    },
  };
}
function evaluateWin(
  state: LobbyState,
  executedPlayerId?: string,
  endedAt?: number,
): LobbyState {
  if (!executedPlayerId || state.status === 'ended') return state;
  const executed = state.players[executedPlayerId];
  if (executed?.role === 'killer')
    return {
      ...state,
      status: 'ended',
      endedAt,
      winner: { type: 'good', reason: 'The killer was voted out.' },
    };
  if (executed?.role === 'neutral_exile')
    return {
      ...state,
      status: 'ended',
      endedAt,
      winner: {
        type: 'neutral',
        playerId: executedPlayerId,
        reason: 'The exile was voted out.',
      },
    };
  const evilWins = Object.values(state.players).every(
    (p) => p.currentTeam === 'evil' || p.status !== 'alive',
  );
  return evilWins
    ? {
        ...state,
        status: 'ended',
        endedAt,
        winner: {
          type: 'evil',
          reason: 'All non-evil players were killed or voted out.',
        },
      }
    : state;
}
function resolveNomination(
  round: VoteRound,
  nomination: VoteNomination,
): VoteRound {
  if (nomination.result) return round;
  const passed = nomination.yesCount >= nomination.majorityRequired;
  const resolved: VoteNomination = {
    ...nomination,
    phase: 'grace',
    result: passed ? { passed } : { passed, noExecutionReason: 'no_majority' },
  };
  const nominations = round.nominations.map((n) =>
    n.id === nomination.id ? resolved : n,
  );
  let candidate = round.currentCandidatePlayerId;
  let candidateVotes = round.currentCandidateVotes ?? 0;
  let tied = round.tiedCandidatePlayerIds ?? [];
  if (passed) {
    if (nomination.yesCount > candidateVotes) {
      candidate = nomination.nomineePlayerId;
      candidateVotes = nomination.yesCount;
      tied = [candidate];
    } else if (
      nomination.yesCount === candidateVotes &&
      candidate &&
      nomination.nomineePlayerId !== candidate
    ) {
      tied = Array.from(new Set([...tied, nomination.nomineePlayerId]));
    }
  }
  return {
    ...round,
    status: 'grace',
    nominations,
    currentCandidatePlayerId: candidate,
    currentCandidateVotes: candidateVotes,
    tiedCandidatePlayerIds: tied,
  };
}
export function advanceVote(
  state: LobbyState,
  roundId: string,
  now: number,
): LobbyState {
  const round = state.voteRounds?.[roundId];
  if (!round || round.status === 'ended') return state;
  const nomination = round.nominations[round.nominations.length - 1];
  if (!nomination) return state;
  let nextRound = round;
  if (nomination.phase === 'discussion' && now >= nomination.discussionEndsAt) {
    nextRound = {
      ...nextRound,
      status: 'voting',
      nominations: nextRound.nominations.map((n) =>
        n.id === nomination.id ? { ...n, phase: 'voting' } : n,
      ),
    };
  }
  const current = nextRound.nominations[nextRound.nominations.length - 1]!;
  if (current.phase === 'voting' && now >= current.votingEndsAt)
    nextRound = resolveNomination(nextRound, current);
  if (nextRound.status === 'grace' && now >= nextRound.graceEndsAt) {
    const tied = nextRound.tiedCandidatePlayerIds ?? [];
    const result =
      nextRound.currentCandidatePlayerId && tied.length <= 1
        ? { executedPlayerId: nextRound.currentCandidatePlayerId }
        : {
            noExecutionReason:
              tied.length > 1 ? ('tie' as const) : ('no_majority' as const),
          };
    nextRound = { ...nextRound, status: 'ended', result, endedAt: now };
    const players = result.executedPlayerId
      ? {
          ...state.players,
          [result.executedPlayerId]: {
            ...state.players[result.executedPlayerId]!,
            status: 'votedOut' as const,
            publicStatus: 'votedOut' as const,
          },
        }
      : state.players;
    return evaluateWin(
      {
        ...state,
        players,
        activeVoteRoundId: undefined,
        lastVoteEndedAt: now,
        voteRounds: { ...(state.voteRounds ?? {}), [roundId]: nextRound },
      },
      result.executedPlayerId,
      now,
    );
  }
  return {
    ...state,
    voteRounds: { ...(state.voteRounds ?? {}), [roundId]: nextRound },
  };
}
export function castBallot(
  state: LobbyState,
  uid: string,
  roundId: string,
  nominationId: string,
  vote: boolean,
  now: number,
): LobbyState {
  requireActive(state);
  livingPlayer(state, uid);
  const next = advanceVote(state, roundId, now);
  const round = next.voteRounds?.[roundId];
  const nomination = round?.nominations.find((n) => n.id === nominationId);
  if (
    !round ||
    !nomination ||
    round.status !== 'voting' ||
    nomination.phase !== 'voting'
  )
    throw new DomainError('failed-precondition', 'Voting is not active.');
  if (!nomination.eligibleVoterIds.includes(uid))
    throw new DomainError('permission-denied', 'You are not eligible to vote.');
  if (Object.hasOwn(nomination.votes, uid))
    throw new DomainError(
      'already-exists',
      'Your ballot has already been cast.',
    );
  const votes = { ...nomination.votes, [uid]: vote };
  const updated = {
    ...nomination,
    votes,
    yesCount: Object.values(votes).filter(Boolean).length,
    noCount: Object.values(votes).filter((v) => !v).length,
  };
  return {
    ...next,
    voteRounds: {
      ...(next.voteRounds ?? {}),
      [roundId]: {
        ...round,
        nominations: round.nominations.map((n) =>
          n.id === nominationId ? updated : n,
        ),
      },
    },
  };
}
export function projectVoteRound(
  state: LobbyState,
  round: VoteRound,
): PublicVoteRound {
  return {
    id: round.id,
    status: round.status,
    startedAt: round.startedAt,
    graceEndsAt: round.graceEndsAt,
    ...(round.currentCandidatePlayerId === undefined
      ? {}
      : { currentCandidatePlayerId: round.currentCandidatePlayerId }),
    ...(round.result === undefined ? {} : { result: round.result }),
    ...(round.endedAt === undefined ? {} : { endedAt: round.endedAt }),
    nominations: round.nominations.map((n) => ({
      id: n.id,
      nominatedByPlayerId: n.nominatedByPlayerId,
      nomineePlayerId: n.nomineePlayerId,
      phase: n.phase,
      startedAt: n.startedAt,
      discussionEndsAt: n.discussionEndsAt,
      votingEndsAt: n.votingEndsAt,
      eligibleVoterCount: n.eligibleVoterIds.length,
      majorityRequired: n.majorityRequired,
      ...(state.setup.visibleLiveVoting ||
      n.phase === 'grace' ||
      n.phase === 'ended'
        ? { yesCount: n.yesCount, noCount: n.noCount }
        : {}),
      ...(n.result === undefined ? {} : { result: n.result }),
    })),
  };
}
export function projectGame(state: LobbyState): {
  game: PublicGame;
  players: Record<string, PublicPlayer>;
  privatePlayers: Record<string, PrivatePlayerData>;
  voteRounds: Record<string, PublicVoteRound>;
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
    ...(state.endedAt === undefined ? {} : { endedAt: state.endedAt }),
    ...(state.winner === undefined ? {} : { winner: state.winner }),
    ...(state.activeVoteRoundId === undefined
      ? {}
      : { activeVoteRoundId: state.activeVoteRoundId }),
    ...(state.lastVoteEndedAt === undefined
      ? {}
      : { lastVoteEndedAt: state.lastVoteEndedAt }),
  };
  const players: Record<string, PublicPlayer> = {};
  const privatePlayers: Record<string, PrivatePlayerData> = {};
  const voteRounds: Record<string, PublicVoteRound> = {};
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
  for (const round of Object.values(state.voteRounds ?? {})) {
    voteRounds[round.id] = projectVoteRound(state, round);
  }
  return { game, players, privatePlayers, voteRounds };
}
