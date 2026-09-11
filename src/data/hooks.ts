import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  limit,
} from 'firebase/firestore';
import { ensureIdentity, services } from './firebase';
import { friendlyError } from './api';

export function useForeground() {
  const [active, setActive] = useState(AppState.currentState !== 'background');
  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) =>
      setActive(state === 'active'),
    );
    return () => listener.remove();
  }, []);
  return active;
}
export function useIdentity(retry: number) {
  const [state, setState] = useState<{
    user: User | null;
    loading: boolean;
    error: string | null;
  }>({ user: null, loading: true, error: null });
  useEffect(() => {
    let alive = true;
    let unsubscribe: (() => void) | undefined;
    setState({ user: null, loading: true, error: null });
    try {
      unsubscribe = onAuthStateChanged(services().auth, (user) => {
        if (user && alive) setState({ user, loading: false, error: null });
      });
      void ensureIdentity().catch((error) => {
        if (alive)
          setState({ user: null, loading: false, error: friendlyError(error) });
      });
    } catch (error) {
      setState({ user: null, loading: false, error: friendlyError(error) });
    }
    return () => {
      alive = false;
      unsubscribe?.();
    };
  }, [retry]);
  return state;
}
interface SnapshotState<T> {
  path: string | null;
  data: T | null;
  loading: boolean;
  error: string | null;
  cached: boolean;
}

export function useDocument<T>(path: string | null, active = true, retry = 0) {
  const [state, setState] = useState<SnapshotState<T>>({
    path,
    data: null,
    loading: true,
    error: null,
    cached: true,
  });
  useEffect(() => {
    if (!path || !active) return;
    setState((s) => ({ ...s, error: null }));
    return onSnapshot(
      doc(services().db, path),
      { includeMetadataChanges: true },
      (snapshot) => {
        setState({
          path,
          data: snapshot.exists() ? (snapshot.data() as T) : null,
          loading: false,
          error: null,
          cached: snapshot.metadata.fromCache,
        });
      },
      (error) =>
        setState({
          path,
          data: null,
          loading: false,
          error: friendlyError(error),
          cached: true,
        }),
    );
  }, [path, active, retry]);
  return state.path === path
    ? state
    : { path, data: null, loading: true, error: null, cached: true };
}
export function useCollection<T>(
  path: string,
  active = true,
  history = false,
  retry = 0,
) {
  const [state, setState] = useState<SnapshotState<(T & { id: string })[]>>({
    path,
    data: null,
    loading: true,
    error: null,
    cached: true,
  });
  useEffect(() => {
    if (!active) return;
    const ref = collection(services().db, path);
    const q = history
      ? query(ref, orderBy('createdAt', 'desc'), limit(100))
      : ref;
    return onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snapshot) => {
        setState({
          path,
          data: snapshot.docs.map((d) => ({ ...(d.data() as T), id: d.id })),
          loading: false,
          error: null,
          cached: snapshot.metadata.fromCache,
        });
      },
      (error) =>
        setState({
          path,
          data: null,
          loading: false,
          error: friendlyError(error),
          cached: true,
        }),
    );
  }, [path, active, history, retry]);
  return state.path === path
    ? state
    : { path, data: null, loading: true, error: null, cached: true };
}
