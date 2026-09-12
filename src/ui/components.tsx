import {
  useRef,
  useState,
  type PropsWithChildren,
  type ReactNode,
} from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { friendlyError } from '../data/api';
import { useTheme } from './theme';

export function Title({
  children,
  small = false,
}: PropsWithChildren<{ small?: boolean }>) {
  const { colors } = useTheme();
  return (
    <Text
      accessibilityRole="header"
      style={{
        color: colors.text,
        fontFamily: Platform.OS === 'android' ? 'serif' : 'Georgia',
        fontSize: small ? 23 : 36,
        lineHeight: small ? 30 : 44,
      }}
    >
      {children}
    </Text>
  );
}
export function Body({
  children,
  muted = false,
  bold = false,
}: PropsWithChildren<{ muted?: boolean; bold?: boolean }>) {
  const { colors } = useTheme();
  return (
    <Text
      style={{
        color: muted ? colors.muted : colors.text,
        fontSize: 16,
        lineHeight: 24,
        fontWeight: bold ? '700' : '400',
      }}
    >
      {children}
    </Text>
  );
}
export function Eyebrow({ children }: PropsWithChildren) {
  const { colors } = useTheme();
  return (
    <Text
      style={{
        color: colors.muted,
        fontSize: 12,
        letterSpacing: 2,
        fontWeight: '700',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </Text>
  );
}
export function Card({ children }: PropsWithChildren) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 18,
        padding: 20,
        gap: 14,
      }}
    >
      {children}
    </View>
  );
}
export function Button({
  label,
  onPress,
  disabled = false,
  secondary = false,
  selected,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  selected?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 48,
        paddingVertical: 12,
        paddingHorizontal: 18,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        backgroundColor: secondary ? colors.raised : colors.accent,
        opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
        borderWidth: 1,
        borderColor: selected ? colors.accent : 'transparent',
      })}
    >
      <Text
        style={{
          color: secondary ? colors.text : colors.onAccent,
          fontSize: 15,
          fontWeight: '600',
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 7 }}>
      <Body>{label}</Body>
      <TextInput
        {...props}
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        style={[
          {
            color: colors.text,
            backgroundColor: colors.background,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 10,
            padding: 13,
            minHeight: 48,
            fontSize: 16,
          },
          props.style,
        ]}
      />
    </View>
  );
}
export function ErrorMessage({ message }: { message: string | null }) {
  const { colors } = useTheme();
  return message ? (
    <Text
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      style={{ color: colors.danger, fontSize: 15, lineHeight: 22 }}
    >
      {message}
    </Text>
  ) : null;
}
export function Loading({
  label = 'Connecting to the collective…',
}: {
  label?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 16, paddingVertical: 40, alignItems: 'center' }}>
      <ActivityIndicator color={colors.accent} />
      <Body muted>{label}</Body>
    </View>
  );
}

type CompactPlayer = {
  id: string;
  name: string;
  status: string;
  note?: ReactNode;
  action?: ReactNode;
  accessibilityLabel?: string;
};

export function CompactPlayerList({ players }: { players: CompactPlayer[] }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 0 }}>
      {players.map((player, index) => (
        <View
          key={player.id}
          accessibilityLabel={
            player.accessibilityLabel ?? `${player.name}, ${player.status}`
          }
          style={{
            gap: 8,
            paddingVertical: 10,
            borderTopWidth: index === 0 ? 0 : 1,
            borderTopColor: colors.border,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              gap: 10,
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <Body bold>{player.name}</Body>
              <Body muted>{player.status}</Body>
            </View>
            {player.action ? <View>{player.action}</View> : null}
          </View>
          {player.note ? <View>{player.note}</View> : null}
        </View>
      ))}
    </View>
  );
}

export const styles = StyleSheet.create({
  stack: { gap: 18 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
});

export function useAction() {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (task: () => Promise<unknown>) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      await task();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return { busy, error, run, clearError: () => setError(null) };
}
