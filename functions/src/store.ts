import { getFirestore, type Transaction } from 'firebase-admin/firestore';
import { DomainError, projectGame, type LobbyState } from '../../shared/lobby';
import type { Profile } from '../../shared/contracts';

export const db = () => getFirestore();
export const stateRef = (gameId: string) =>
  db().doc(`games/${gameId}/server/state`);
export const profileRef = (uid: string) => db().doc(`profiles/${uid}`);

export async function readState(
  tx: Transaction,
  gameId: string,
): Promise<LobbyState> {
  const snapshot = await tx.get(stateRef(gameId));
  if (!snapshot.exists) throw new DomainError('not-found', 'Game not found.');
  return snapshot.data() as LobbyState;
}
export async function readProfile(
  tx: Transaction,
  uid: string,
): Promise<Profile | undefined> {
  return (await tx.get(profileRef(uid))).data() as Profile | undefined;
}

/** Write only changed projections. Hidden mutations must not even change a public
 * document's update timestamp, which could otherwise disclose secret activity. */
function stripUndefined<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
export function saveState(
  tx: Transaction,
  next: LobbyState,
  previous?: LobbyState,
) {
  if (next === previous) return;
  tx.set(stateRef(next.id), stripUndefined(next));
  const output = projectGame(next);
  const old = previous ? projectGame(previous) : undefined;
  const setIfChanged = (path: string, value: object, before: unknown) => {
    if (JSON.stringify(value) !== JSON.stringify(before))
      tx.set(db().doc(path), value);
  };
  setIfChanged(`games/${next.id}`, output.game, old?.game);
  for (const [uid, player] of Object.entries(output.players)) {
    setIfChanged(`games/${next.id}/players/${uid}`, player, old?.players[uid]);
  }
  for (const [uid, player] of Object.entries(output.privatePlayers)) {
    setIfChanged(
      `games/${next.id}/privatePlayerData/${uid}`,
      player,
      old?.privatePlayers[uid],
    );
  }
  for (const [roundId, round] of Object.entries(output.voteRounds)) {
    setIfChanged(
      `games/${next.id}/voteRounds/${roundId}`,
      round,
      old?.voteRounds[roundId],
    );
  }
  if (previous?.status === 'lobby' && next.status === 'active') {
    tx.set(db().doc(`games/${next.id}/log/game_started`), {
      type: 'game_started',
      message: 'The game has begun. Your role is ready.',
      createdAt: next.startedAt,
    });
  }
  const oldRounds = previous?.voteRounds ?? {};
  for (const round of Object.values(next.voteRounds ?? {})) {
    const oldRound = oldRounds[round.id];
    for (const nomination of round.nominations) {
      if (!oldRound?.nominations.some((n) => n.id === nomination.id)) {
        tx.set(db().doc(`games/${next.id}/log/nomination_${nomination.id}`), {
          type: 'nomination_called',
          message: 'A nomination has been called.',
          createdAt: nomination.startedAt,
        });
      }
      if (
        nomination.result &&
        !oldRound?.nominations.find((n) => n.id === nomination.id)?.result
      ) {
        tx.set(db().doc(`games/${next.id}/log/vote_result_${nomination.id}`), {
          type: 'vote_result',
          message: nomination.result.passed
            ? 'A nominee is on the block.'
            : 'The nomination did not receive enough votes.',
          createdAt: nomination.votingEndsAt,
        });
      }
    }
    if (round.result && !oldRound?.result) {
      const executed = round.result.executedPlayerId;
      tx.set(db().doc(`games/${next.id}/log/vote_ended_${round.id}`), {
        type: executed ? 'player_executed' : 'no_execution',
        message: executed
          ? 'A player was executed.'
          : 'The vote ended with no execution.',
        createdAt: round.endedAt,
      });
    }
  }
  if (next.status === 'ended' && previous?.status !== 'ended') {
    tx.set(db().doc(`games/${next.id}/log/game_ended`), {
      type: 'game_ended',
      message: 'The game has ended.',
      createdAt: next.endedAt,
    });
  }
}
