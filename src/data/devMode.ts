import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  connectAuthEmulator,
  getAuth,
  signInAnonymously,
  type Auth,
  type User,
} from 'firebase/auth';
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from 'firebase/firestore';
import {
  connectFunctionsEmulator,
  getFunctions,
  httpsCallable,
  type Functions,
} from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isDevModeEnabled } from '../../shared/devMode';
import { emulatorMode } from './firebase';

export const devModeRequested = process.env.EXPO_PUBLIC_DEV_MODE === 'true';
export const devModeEnabled = isDevModeEnabled({
  emulatorMode,
  requested: devModeRequested,
});
export const DEV_MODE_DISABLED_REASON = emulatorMode
  ? 'Set EXPO_PUBLIC_DEV_MODE=true and restart Expo to enable fake-player controls.'
  : 'Fake-player controls are disabled outside Firebase emulator mode.';

export interface FakePlayerRecord {
  appName: string;
  displayName: string;
  uid?: string;
  lastResult?: string;
}

export interface FakePlayerClient {
  record: FakePlayerRecord;
  user: User;
  auth: Auth;
  db: Firestore;
  functions: Functions;
}

const STORAGE_KEY = 'wtc.dev.fakePlayers';
const cache = globalThis as typeof globalThis & {
  __wtcDevFakeConnected?: Set<string>;
};
const connected = (cache.__wtcDevFakeConnected ??= new Set<string>());

function assertDevMode() {
  if (!devModeEnabled) throw new Error(DEV_MODE_DISABLED_REASON);
}

function configuredHost() {
  const host = process.env.EXPO_PUBLIC_EMULATOR_HOST;
  return !host || host === 'auto' ? '127.0.0.1' : host;
}

function fakeApp(appName: string): FirebaseApp {
  const existing = getApps().find((app) => app.name === appName);
  return (
    existing ??
    initializeApp(
      {
        projectId: 'demo-wtc',
        apiKey: 'demo-key',
        authDomain: 'demo-wtc.firebaseapp.com',
        appId: `demo-wtc-${appName}`,
      },
      appName,
    )
  );
}

export async function loadFakePlayerRecords(): Promise<FakePlayerRecord[]> {
  if (!devModeEnabled) return [];
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  const parsed = JSON.parse(raw) as FakePlayerRecord[];
  return Array.isArray(parsed) ? parsed : [];
}

export async function saveFakePlayerRecords(records: FakePlayerRecord[]) {
  assertDevMode();
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export async function clearFakePlayerRecords() {
  assertDevMode();
  await AsyncStorage.removeItem(STORAGE_KEY);
}

export async function createFakePlayerRecord(
  displayName: string,
): Promise<FakePlayerRecord> {
  assertDevMode();
  return {
    appName: `wtc-fake-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    displayName,
    lastResult: 'Created local fake identity.',
  };
}

export async function fakePlayerClient(
  record: FakePlayerRecord,
): Promise<FakePlayerClient> {
  assertDevMode();
  const app = fakeApp(record.appName);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const functions = getFunctions(app, 'us-central1');
  if (!connected.has(record.appName)) {
    const host = configuredHost();
    connectAuthEmulator(auth, `http://${host}:9099`, {
      disableWarnings: true,
    });
    connectFirestoreEmulator(db, host, 8080);
    connectFunctionsEmulator(functions, host, 5001);
    connected.add(record.appName);
  }
  await auth.authStateReady();
  const user = auth.currentUser ?? (await signInAnonymously(auth)).user;
  return { record: { ...record, uid: user.uid }, user, auth, db, functions };
}

export async function fakeAction(
  record: FakePlayerRecord,
  name: string,
  input: unknown,
) {
  const client = await fakePlayerClient(record);
  return {
    client,
    data: await httpsCallable<unknown, { gameId: string | null }>(
      client.functions,
      name,
    )(input).then((result) => result.data),
  };
}
