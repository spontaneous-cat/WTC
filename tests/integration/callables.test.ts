import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { initializeApp, deleteApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInAnonymously } from 'firebase/auth';
import {
  connectFirestoreEmulator,
  doc,
  getDoc,
  getFirestore,
  type Firestore,
} from 'firebase/firestore';
import { DEFAULT_SETUP } from '../../shared/lobby';

const apps: FirebaseApp[] = [];
interface Client {
  uid: string;
  token: string;
  db: Firestore;
}
async function client(): Promise<Client> {
  const app = initializeApp(
    {
      apiKey: 'demo-key',
      projectId: 'demo-wtc',
      authDomain: 'demo-wtc.firebaseapp.com',
    },
    randomUUID(),
  );
  apps.push(app);
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const user = (await signInAnonymously(auth)).user;
  const db = getFirestore(app);
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  return { uid: user.uid, token: await user.getIdToken(), db };
}
async function call(name: string, data: unknown, c?: Client) {
  const response = await fetch(
    `http://127.0.0.1:5001/demo-wtc/us-central1/${name}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(c ? { Authorization: `Bearer ${c.token}` } : {}),
      },
      body: JSON.stringify({ data }),
    },
  );
  const body = (await response.json()) as {
    result?: { gameId: string };
    error?: { message: string; status: string };
  };
  if (body.error)
    throw new Error(`${body.error.status}: ${body.error.message}`);
  if (!response.ok || !body.result)
    throw new Error(`Unexpected response: ${response.status}`);
  return body.result;
}
beforeAll(() => {
  if (
    !process.env.FIRESTORE_EMULATOR_HOST ||
    !process.env.FIREBASE_AUTH_EMULATOR_HOST
  ) {
    throw new Error(
      'Use npm run test:emulators. These tests must never call production.',
    );
  }
});
afterAll(async () => {
  await Promise.all(apps.map(deleteApp));
});
const setup = {
  ...DEFAULT_SETUP,
  playerCount: 4,
  roles: { killer: 1, minion: 0, good: 2, neutral_exile: 1 },
};

describe('callable lobby vertical slice', () => {
  it('requires authentication and validates requests', async () => {
    await expect(
      call('createGame', { displayName: 'Admin', setup }),
    ).rejects.toThrow(/UNAUTHENTICATED/);
    const c = await client();
    await expect(
      call('createGame', { displayName: '', setup }, c),
    ).rejects.toThrow(/INVALID_ARGUMENT/);
    await expect(
      call('joinGame', { displayName: 'Test', code: '123' }, c),
    ).rejects.toThrow(/INVALID_ARGUMENT/);
  });
  it('creates, joins, starts, protects private roles, resumes, and renames', async () => {
    const admin = await client();
    const members = await Promise.all([client(), client(), client()]);
    await call('renamePlayer', { displayName: 'Current name' }, admin);
    const { gameId } = await call(
      'createGame',
      { displayName: 'Stale UI name', setup },
      admin,
    );
    expect(
      (await getDoc(doc(admin.db, `profiles/${admin.uid}`))).data()
        ?.displayName,
    ).toBe('Current name');
    expect(
      (await call('createGame', { displayName: 'Admin', setup }, admin)).gameId,
    ).toBe(gameId);
    const gameRef = doc(admin.db, `games/${gameId}`);
    const initial = (await getDoc(gameRef)).data()!;
    expect(initial.code).toMatch(/^\d{6}$/);
    expect(initial.playerIds).toEqual([admin.uid]);
    await expect(call('startGame', { gameId }, admin)).rejects.toThrow(
      /FAILED_PRECONDITION/,
    );
    for (const [i, member] of members.entries())
      await call(
        'joinGame',
        { code: initial.code, displayName: `Player ${i}` },
        member,
      );
    await expect(
      call('updateLobbySettings', { gameId, setup }, members[0]),
    ).rejects.toThrow(/PERMISSION_DENIED/);
    await call('startGame', { gameId }, admin);
    const game = (await getDoc(gameRef)).data()!;
    expect(game.status).toBe('active');
    expect(game).not.toHaveProperty('players');
    const roles = await Promise.all(
      [admin, ...members].map(async (member) => {
        const privateData = (
          await getDoc(
            doc(member.db, `games/${gameId}/privatePlayerData/${member.uid}`),
          )
        ).data()!;
        const publicData = (
          await getDoc(doc(admin.db, `games/${gameId}/players/${member.uid}`))
        ).data()!;
        expect(publicData).not.toHaveProperty('role');
        expect(publicData).not.toHaveProperty('currentTeam');
        return privateData.role;
      }),
    );
    expect(roles.sort()).toEqual(['good', 'good', 'killer', 'neutral_exile']);
    await expect(
      getDoc(
        doc(admin.db, `games/${gameId}/privatePlayerData/${members[0]!.uid}`),
      ),
    ).rejects.toHaveProperty('code', 'permission-denied');
    const before = (
      await getDoc(
        doc(admin.db, `games/${gameId}/privatePlayerData/${admin.uid}`),
      )
    ).data();
    await call('startGame', { gameId }, admin);
    expect(
      (
        await getDoc(
          doc(admin.db, `games/${gameId}/privatePlayerData/${admin.uid}`),
        )
      ).data(),
    ).toEqual(before);
    await expect(
      call('updateLobbySettings', { gameId, setup }, admin),
    ).rejects.toThrow(/FAILED_PRECONDITION/);
    await call('renamePlayer', { displayName: 'Renamed' }, members[0]);
    expect(
      (
        await getDoc(
          doc(admin.db, `games/${gameId}/players/${members[0]!.uid}`),
        )
      ).data()?.displayName,
    ).toBe('Renamed');
    expect(
      (await getDoc(doc(members[0]!.db, `profiles/${members[0]!.uid}`))).data()
        ?.gameId,
    ).toBe(gameId);
    expect(
      (
        await call(
          'joinGame',
          { code: initial.code, displayName: 'Ignored' },
          members[0],
        )
      ).gameId,
    ).toBe(gameId);
  });
  it('serializes concurrent joins without overfilling and prevents concurrent duplicate games', async () => {
    const admin = await client();
    const games = await Promise.all(
      [1, 2].map(() =>
        call('createGame', { displayName: 'Admin', setup }, admin),
      ),
    );
    expect(games[0]!.gameId).toBe(games[1]!.gameId);
    const gameId = games[0]!.gameId;
    const code = (await getDoc(doc(admin.db, `games/${gameId}`))).data()!.code;
    const joiners = await Promise.all(Array.from({ length: 5 }, client));
    const results = await Promise.allSettled(
      joiners.map((c, i) =>
        call('joinGame', { code, displayName: `P${i}` }, c),
      ),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(3);
    expect(
      (await getDoc(doc(admin.db, `games/${gameId}`))).data()!.playerIds,
    ).toHaveLength(4);
  });
});
