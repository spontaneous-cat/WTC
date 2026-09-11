import { randomInt, randomUUID } from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import { z } from 'zod';
import {
  createGameSchema,
  gameActionSchema,
  joinGameSchema,
  renameSchema,
  updateSetupSchema,
} from '../../shared/contracts';
import {
  createLobby,
  DomainError,
  joinLobby,
  renamePlayer as renameDomainPlayer,
  startGame as startDomainGame,
  updateSetup,
  type LobbyState,
} from '../../shared/lobby';
import { db, profileRef, readProfile, readState, saveState } from './store';

initializeApp();
setGlobalOptions({
  region: 'us-central1',
  minInstances: 0,
  maxInstances: 2,
  memory: '256MiB',
  timeoutSeconds: 30,
});

function action<T>(
  schema: z.ZodType<T>,
  handler: (uid: string, input: T) => Promise<{ gameId: string | null }>,
) {
  return onCall(async (request) => {
    if (!request.auth)
      throw new HttpsError(
        'unauthenticated',
        'Please reconnect to establish your device identity.',
      );
    try {
      return await handler(request.auth.uid, schema.parse(request.data));
    } catch (error) {
      if (error instanceof z.ZodError)
        throw new HttpsError(
          'invalid-argument',
          error.issues.map((issue) => issue.message).join(' '),
        );
      if (error instanceof DomainError)
        throw new HttpsError(error.code, error.message);
      if (error instanceof HttpsError) throw error;
      // Do not serialize server state, input, or secrets into logs/responses.
      console.error(
        'Game action failed',
        error instanceof Error ? error.name : 'UnknownError',
      );
      throw new HttpsError(
        'internal',
        'The action could not be completed. Please try again.',
      );
    }
  });
}
class CodeCollision extends Error {}

export const createGame = action(createGameSchema, async (uid, input) => {
  const gameId = randomUUID();
  for (let attempt = 0; attempt < 12; attempt++) {
    const code = randomInt(0, 1000000).toString().padStart(6, '0');
    try {
      return await db().runTransaction(async (tx) => {
        const profile = await readProfile(tx, uid);
        if (profile?.gameId) {
          const existing = await readState(tx, profile.gameId);
          if (existing.status !== 'ended') return { gameId: existing.id };
        }
        const codeRef = db().doc(`gameCodes/${code}`);
        if ((await tx.get(codeRef)).exists) throw new CodeCollision();
        const displayName = profile?.displayName ?? input.displayName;
        const state = createLobby(
          gameId,
          code,
          uid,
          displayName,
          input.setup,
          Date.now(),
        );
        saveState(tx, state);
        tx.create(codeRef, { gameId });
        tx.set(profileRef(uid), { gameId, displayName });
        return { gameId };
      });
    } catch (error) {
      if (!(error instanceof CodeCollision)) throw error;
    }
  }
  throw new HttpsError(
    'resource-exhausted',
    'Could not reserve a game code. Please try again.',
  );
});

export const joinGame = action(joinGameSchema, async (uid, input) =>
  db().runTransaction(async (tx) => {
    const codeDoc = await tx.get(db().doc(`gameCodes/${input.code}`));
    if (!codeDoc.exists)
      throw new DomainError('not-found', 'No lobby found with that code.');
    const gameId = codeDoc.data()!.gameId as string;
    const profile = await readProfile(tx, uid);
    if (profile?.gameId && profile.gameId !== gameId) {
      const other = await readState(tx, profile.gameId);
      if (other.status !== 'ended')
        throw new DomainError(
          'failed-precondition',
          'You already belong to another unfinished game.',
        );
    }
    const state = await readState(tx, gameId);
    const next = joinLobby(
      state,
      uid,
      profile?.displayName ?? input.displayName,
      Date.now(),
    );
    saveState(tx, next, state);
    tx.set(profileRef(uid), {
      gameId,
      displayName: next.players[uid]!.displayName,
    });
    return { gameId };
  }),
);

async function changeGame(
  gameId: string,
  update: (state: LobbyState) => LobbyState,
) {
  return db().runTransaction(async (tx) => {
    const before = await readState(tx, gameId);
    saveState(tx, update(before), before);
    return { gameId };
  });
}
export const updateLobbySettings = action(
  updateSetupSchema,
  async (uid, input) =>
    changeGame(input.gameId, (state) => updateSetup(state, uid, input.setup)),
);
export const startGame = action(gameActionSchema, async (uid, input) =>
  changeGame(input.gameId, (state) =>
    startDomainGame(
      state,
      uid,
      Date.now(),
      () => randomInt(0, 2 ** 32) / 2 ** 32,
    ),
  ),
);
export const renamePlayer = action(renameSchema, async (uid, input) =>
  db().runTransaction(async (tx) => {
    const profile = await readProfile(tx, uid);
    if (profile?.gameId) {
      const state = await readState(tx, profile.gameId);
      saveState(tx, renameDomainPlayer(state, uid, input.displayName), state);
    }
    tx.set(profileRef(uid), {
      displayName: input.displayName,
      gameId: profile?.gameId ?? null,
    });
    return { gameId: profile?.gameId ?? null };
  }),
);
