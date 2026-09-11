import { getAuth } from 'firebase/auth';
import type { FirebaseApp } from 'firebase/app';

// Web uses Firebase's browser persistence. Metro picks the native file on phones.
export function persistentAuth(app: FirebaseApp) {
  return getAuth(app);
}
