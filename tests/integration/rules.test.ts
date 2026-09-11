import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';

let env: RulesTestEnvironment;
beforeAll(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST)
    throw new Error('Run via npm run test:emulators; never target production.');
  env = await initializeTestEnvironment({
    projectId: 'demo-wtc',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'games/rules-game'), {
      adminUid: 'admin',
      status: 'active',
      playerIds: ['admin', 'member'],
    });
    await setDoc(doc(db, 'games/rules-game/players/admin'), {
      uid: 'admin',
      displayName: 'Admin',
      status: 'alive',
    });
    await setDoc(doc(db, 'games/rules-game/players/member'), {
      uid: 'member',
      displayName: 'Member',
      status: 'alive',
    });
    await setDoc(doc(db, 'games/rules-game/server/state'), {
      secret: 'hidden-death',
    });
    await setDoc(doc(db, 'games/rules-game/privatePlayerData/member'), {
      role: 'killer',
      status: 'alive',
    });
    await setDoc(doc(db, 'profiles/member'), { gameId: 'rules-game' });
    await setDoc(doc(db, 'gameCodes/123456'), { gameId: 'rules-game' });
  });
});
afterAll(async () => {
  await env?.cleanup();
});

describe('Firestore privacy and authorization', () => {
  it('lets members read game and player list but not strangers or anonymous unauthenticated clients', async () => {
    const member = env.authenticatedContext('member').firestore();
    await assertSucceeds(getDoc(doc(member, 'games/rules-game')));
    await assertSucceeds(
      getDocs(collection(member, 'games/rules-game/players')),
    );
    for (const db of [
      env.authenticatedContext('outsider').firestore(),
      env.unauthenticatedContext().firestore(),
    ]) {
      await assertFails(getDoc(doc(db, 'games/rules-game')));
      await assertFails(getDoc(doc(db, 'games/rules-game/players/member')));
    }
  });
  it('permits only own private role, not even creator can read others', async () => {
    await assertSucceeds(
      getDoc(
        doc(
          env.authenticatedContext('member').firestore(),
          'games/rules-game/privatePlayerData/member',
        ),
      ),
    );
    await assertFails(
      getDoc(
        doc(
          env.authenticatedContext('admin').firestore(),
          'games/rules-game/privatePlayerData/member',
        ),
      ),
    );
    await assertFails(
      getDocs(
        collection(
          env.authenticatedContext('member').firestore(),
          'games/rules-game/privatePlayerData',
        ),
      ),
    );
  });
  it('denies all client access to server state and code reservations', async () => {
    const db = env.authenticatedContext('admin').firestore();
    await assertFails(getDoc(doc(db, 'games/rules-game/server/state')));
    await assertFails(getDoc(doc(db, 'gameCodes/123456')));
    await assertFails(getDocs(collection(db, 'gameCodes')));
  });
  it('denies privileged writes including role changes, status changes and admin escalation', async () => {
    const db = env.authenticatedContext('admin').firestore();
    await assertFails(
      updateDoc(doc(db, 'games/rules-game'), { adminUid: 'member' }),
    );
    await assertFails(
      updateDoc(doc(db, 'games/rules-game/players/member'), { status: 'dead' }),
    );
    await assertFails(
      setDoc(doc(db, 'games/rules-game/privatePlayerData/admin'), {
        role: 'killer',
      }),
    );
    await assertFails(
      setDoc(doc(db, 'games/rules-game/log/fake'), { message: 'Someone died' }),
    );
  });
  it('makes profiles private and server-write-only', async () => {
    const member = env.authenticatedContext('member').firestore();
    await assertSucceeds(getDoc(doc(member, 'profiles/member')));
    await assertFails(
      getDoc(
        doc(env.authenticatedContext('admin').firestore(), 'profiles/member'),
      ),
    );
    await assertFails(
      setDoc(doc(member, 'profiles/member'), { gameId: 'other-game' }),
    );
  });
  it('allows private valid suspicions only for an existing target in own game', async () => {
    const member = env.authenticatedContext('member').firestore();
    const path = 'games/rules-game/owners/member/suspicions/admin';
    await assertSucceeds(
      setDoc(doc(member, path), {
        suspectedRole: 'killer',
        updatedAt: serverTimestamp(),
      }),
    );
    await assertSucceeds(getDoc(doc(member, path)));
    await assertFails(
      getDoc(doc(env.authenticatedContext('admin').firestore(), path)),
    );
    await assertFails(
      setDoc(doc(member, path), {
        suspectedRole: 'made-up',
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(
      setDoc(doc(member, path), {
        suspectedRole: 'good',
        updatedAt: serverTimestamp(),
        extra: 'secret',
      }),
    );
    await assertFails(
      setDoc(
        doc(member, 'games/rules-game/owners/member/suspicions/outsider'),
        { suspectedRole: 'killer', updatedAt: serverTimestamp() },
      ),
    );
    await assertFails(
      setDoc(
        doc(
          env.authenticatedContext('outsider').firestore(),
          'games/rules-game/owners/outsider/suspicions/admin',
        ),
        { suspectedRole: 'killer', updatedAt: serverTimestamp() },
      ),
    );
  });
});
