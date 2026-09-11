import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FirebaseApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';

// Firebase 12's public .d.ts points at web exports, while Metro resolves the RN
// implementation. Narrowly describe the native-only public API (no `any`).
const nativeAuth = FirebaseAuth as typeof FirebaseAuth & {
  getReactNativePersistence(
    storage: typeof AsyncStorage,
  ): FirebaseAuth.Persistence;
};
export function persistentAuth(app: FirebaseApp) {
  try {
    return FirebaseAuth.initializeAuth(app, {
      persistence: nativeAuth.getReactNativePersistence(AsyncStorage),
    });
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      error.code === 'auth/already-initialized'
    )
      return FirebaseAuth.getAuth(app);
    throw error;
  }
}
