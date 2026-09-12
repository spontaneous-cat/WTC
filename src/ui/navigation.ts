import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, Platform } from 'react-native';

export function useNestedScreen<T extends string>(initial: T) {
  const [screen, setScreen] = useState<T>(initial);
  const screenRef = useRef(screen);
  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);

  const back = useCallback(() => setScreen(initial), [initial]);
  const navigate = useCallback(
    (next: T) => {
      if (next === screenRef.current) return;
      if (
        Platform.OS === 'web' &&
        next !== initial &&
        typeof window !== 'undefined'
      ) {
        const method =
          screenRef.current === initial ? 'pushState' : 'replaceState';
        window.history[method](
          { wtcNestedScreen: next },
          '',
          window.location.href,
        );
      }
      setScreen(next);
    },
    [initial],
  );

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const onPopState = () => {
        if (screenRef.current !== initial) setScreen(initial);
      };
      window.addEventListener('popstate', onPopState);
      return () => window.removeEventListener('popstate', onPopState);
    }
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (screenRef.current === initial) return false;
        setScreen(initial);
        return true;
      },
    );
    return () => subscription.remove();
  }, [initial]);

  return { screen, navigate, back };
}
