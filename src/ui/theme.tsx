import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';
import { useColorScheme } from 'react-native';

const palettes = {
  light: {
    background: '#F3EAD8',
    surface: '#FFFAEF',
    raised: '#E9DDC5',
    text: '#30291E',
    muted: '#70614B',
    border: '#CDBB99',
    accent: '#425A44',
    onAccent: '#FFFFFF',
    danger: '#9B332A',
  },
  dark: {
    background: '#1C201C',
    surface: '#282E27',
    raised: '#343D32',
    text: '#F2E9D5',
    muted: '#C0B99F',
    border: '#505A47',
    accent: '#C5D4AB',
    onAccent: '#1C291C',
    danger: '#FFB4A8',
  },
};
type Theme = {
  colors: typeof palettes.light;
  dark: boolean;
  toggle: () => void;
};
const ThemeContext = createContext<Theme>({
  colors: palettes.light,
  dark: false,
  toggle: () => {},
});
export function ThemeProvider({ children }: PropsWithChildren) {
  const system = useColorScheme();
  const [mode, setMode] = useState<'light' | 'dark' | null>(null);
  useEffect(() => {
    let alive = true;
    void AsyncStorage.getItem('wtc.theme')
      .then((value) => {
        if (alive && (value === 'light' || value === 'dark')) setMode(value);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  const dark = (mode ?? system) === 'dark';
  const toggle = () => {
    const next = dark ? 'light' : 'dark';
    setMode(next);
    void AsyncStorage.setItem('wtc.theme', next).catch(() => {});
  };
  return (
    <ThemeContext.Provider
      value={{ colors: dark ? palettes.dark : palettes.light, dark, toggle }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
export const useTheme = () => useContext(ThemeContext);
