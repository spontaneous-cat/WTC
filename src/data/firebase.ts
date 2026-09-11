import { getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator, signInAnonymously } from 'firebase/auth';
import { NativeModules, Platform } from 'react-native';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import { persistentAuth } from './persistentAuth';

export const emulatorMode = process.env.EXPO_PUBLIC_USE_EMULATORS !== 'false';

function hostFromUrl(value: string | undefined) {
  if (!value) return undefined;
  try {
    return new URL(value).hostname || undefined;
  } catch {
    return undefined;
  }
}

function hostFromExpoRuntime() {
  if (Platform.OS === 'web') {
    return typeof window === 'undefined'
      ? undefined
      : hostFromUrl(window.location.href);
  }
  const sourceCode = NativeModules.SourceCode as
    { scriptURL?: string; scriptUrl?: string } | undefined;
  return hostFromUrl(sourceCode?.scriptURL ?? sourceCode?.scriptUrl);
}

function emulatorHost() {
  const configured = process.env.EXPO_PUBLIC_EMULATOR_HOST;
  if (configured && configured !== 'auto') return configured;
  const runtimeHost = hostFromExpoRuntime();
  if (runtimeHost && runtimeHost !== 'localhost') return runtimeHost;
  return '127.0.0.1';
}

function initializeServices() {
  const projectId = emulatorMode
    ? 'demo-wtc'
    : process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
  const apiKey = emulatorMode
    ? 'demo-key'
    : process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
  if (
    !projectId ||
    !apiKey ||
    (!emulatorMode && projectId.startsWith('demo-'))
  ) {
    throw new Error(
      'Firebase configuration is missing. See .env.example and docs/SETUP.md.',
    );
  }
  const app =
    getApps()[0] ??
    initializeApp({
      projectId,
      apiKey,
      authDomain: emulatorMode
        ? 'demo-wtc.firebaseapp.com'
        : process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      appId: emulatorMode
        ? 'demo-wtc-app'
        : process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    });
  const auth = persistentAuth(app);
  const db = getFirestore(app);
  const functions = getFunctions(app, 'us-central1');
  if (emulatorMode) {
    const host = emulatorHost();
    connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, host, 8080);
    connectFunctionsEmulator(functions, host, 5001);
  }
  return { auth, db, functions };
}
// Keep service initialization outside render and survive Fast Refresh.
const cache = globalThis as typeof globalThis & {
  __wtcServices?: ReturnType<typeof initializeServices>;
};
export function services() {
  return (cache.__wtcServices ??= initializeServices());
}
let signingIn: Promise<void> | undefined;
export function ensureIdentity() {
  return (signingIn ??= (async () => {
    const { auth } = services();
    await auth.authStateReady();
    if (!auth.currentUser) await signInAnonymously(auth);
  })().finally(() => {
    signingIn = undefined;
  }));
}
