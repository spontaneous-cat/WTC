import { httpsCallable } from 'firebase/functions';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import type { Setup, SuspectedRole } from '../../shared/contracts';
import { services } from './firebase';

async function action(name: string, input: unknown) {
  return (
    await httpsCallable<unknown, { gameId: string | null }>(
      services().functions,
      name,
    )(input)
  ).data;
}
export const api = {
  create: (displayName: string, setup: Setup) =>
    action('createGame', { displayName, setup }),
  join: (displayName: string, code: string) =>
    action('joinGame', { displayName, code }),
  configure: (gameId: string, setup: Setup) =>
    action('updateLobbySettings', { gameId, setup }),
  updateRuntimeSettings: (gameId: string, setup: Setup) =>
    action('updateRuntimeSettings', { gameId, setup }),
  start: (gameId: string) => action('startGame', { gameId }),
  nominate: (gameId: string, nomineePlayerId: string) =>
    action('callNomination', { gameId, nomineePlayerId }),
  castVote: (
    gameId: string,
    roundId: string,
    nominationId: string,
    vote: boolean,
  ) => action('castVote', { gameId, roundId, nominationId, vote }),
  resolveVote: (gameId: string, roundId: string) =>
    action('resolveVote', { gameId, roundId }),
  rename: (displayName: string) => action('renamePlayer', { displayName }),
  suspect: (
    gameId: string,
    uid: string,
    targetId: string,
    suspectedRole: SuspectedRole,
  ) =>
    setDoc(
      doc(
        services().db,
        `games/${gameId}/owners/${uid}/suspicions/${targetId}`,
      ),
      { suspectedRole, updatedAt: serverTimestamp() },
    ),
};
export function friendlyError(error: unknown): string {
  if (error instanceof Error) {
    if (/offline|network|unavailable|deadline/i.test(error.message))
      return 'Could not reach the game server. Check your connection and try again.';
    return error.message.replace(/^Firebase: /, '');
  }
  return 'Something went wrong. Please try again.';
}
