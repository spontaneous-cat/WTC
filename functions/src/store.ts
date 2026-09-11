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
export function saveState(
  tx: Transaction,
  next: LobbyState,
  previous?: LobbyState,
) {
  if (next === previous) return;
  tx.set(stateRef(next.id), next);
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
  if (previous?.status === 'lobby' && next.status === 'active') {
    tx.set(db().doc(`games/${next.id}/log/game_started`), {
      type: 'game_started',
      message: 'The game has begun. Your role is ready.',
      createdAt: next.startedAt,
    });
  }
}
