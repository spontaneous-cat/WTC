import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  type Profile,
  type PublicGame,
  type PublicPlayer,
  displayNameSchema,
} from './shared/contracts';
import { api } from './src/data/api';
import { emulatorMode } from './src/data/firebase';
import {
  useCollection,
  useDocument,
  useForeground,
  useIdentity,
} from './src/data/hooks';
import { Dashboard } from './src/screens/Dashboard';
import { Lobby } from './src/screens/Lobby';
import { Welcome } from './src/screens/Welcome';
import {
  Body,
  Button,
  Card,
  ErrorMessage,
  Eyebrow,
  Field,
  Loading,
  styles,
  useAction,
} from './src/ui/components';
import { ThemeProvider, useTheme } from './src/ui/theme';

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Shell />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
function Shell() {
  const { colors, dark, toggle } = useTheme();
  const [retry, setRetry] = useState(0);
  const identity = useIdentity(retry);
  const active = useForeground();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            padding: 20,
            paddingBottom: 48,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 640,
              alignSelf: 'center',
              gap: 24,
            }}
          >
            <View style={{ ...styles.row, justifyContent: 'space-between' }}>
              <Eyebrow>
                WTC · {emulatorMode ? 'Local preview' : 'Within the Collective'}
              </Eyebrow>
              <Button
                secondary
                label={dark ? 'Light mode' : 'Dark mode'}
                onPress={toggle}
              />
            </View>
            {identity.error ? (
              <Card>
                <ErrorMessage message={identity.error} />
                <Button
                  label="Retry connection"
                  onPress={() => setRetry((x) => x + 1)}
                />
              </Card>
            ) : identity.loading || !identity.user ? (
              <Loading />
            ) : (
              <PlayerSpace
                key={identity.user.uid}
                uid={identity.user.uid}
                active={active}
                retry={retry}
                reconnect={() => setRetry((x) => x + 1)}
              />
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
function PlayerSpace({
  uid,
  active,
  retry,
  reconnect,
}: {
  uid: string;
  active: boolean;
  retry: number;
  reconnect: () => void;
}) {
  const profile = useDocument<Profile>(`profiles/${uid}`, active, retry);
  const [nickname, setNickname] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  useEffect(() => {
    let alive = true;
    const generated = `${['Quiet', 'Amber', 'Silver', 'Wandering', 'Hidden'][Math.floor(Math.random() * 5)]} ${['Raven', 'Willow', 'Fox', 'Scribe', 'Oak'][Math.floor(Math.random() * 5)]} ${Math.floor(Math.random() * 90) + 10}`;
    void AsyncStorage.getItem('wtc.nickname')
      .then(async (saved) => {
        if (alive) setNickname(saved || generated);
        if (!saved) await AsyncStorage.setItem('wtc.nickname', generated);
      })
      .catch(() => {
        if (alive) setNickname(generated);
      });
    return () => {
      alive = false;
    };
  }, []);
  if (profile.error)
    return (
      <Card>
        <ErrorMessage message={profile.error} />
        <Button label="Retry connection" onPress={reconnect} />
      </Card>
    );
  if (profile.loading || !nickname) return <Loading />;
  const name = profile.data?.displayName ?? nickname;
  return (
    <View style={styles.stack}>
      <NameEditor
        name={name}
        editing={editingName}
        setEditing={setEditingName}
      />
      {!editingName &&
        (profile.data?.gameId ? (
          <GameSpace
            key={profile.data.gameId}
            gameId={profile.data.gameId}
            uid={uid}
            active={active}
            retry={retry}
            reconnect={reconnect}
          />
        ) : (
          <Welcome displayName={name} />
        ))}
    </View>
  );
}
function NameEditor({
  name,
  editing,
  setEditing,
}: {
  name: string;
  editing: boolean;
  setEditing: (value: boolean) => void;
}) {
  const [draft, setDraft] = useState(name);
  const { busy, error, run } = useAction();
  return (
    <View style={styles.stack}>
      {editing ? (
        <Card>
          <Field
            label="Display name"
            maxLength={40}
            value={draft}
            onChangeText={setDraft}
            autoCapitalize="words"
          />
          <ErrorMessage message={error} />
          <Button
            label={busy ? 'Saving…' : 'Save name'}
            disabled={busy || !displayNameSchema.safeParse(draft).success}
            onPress={() =>
              void run(async () => {
                await api.rename(draft);
                setEditing(false);
              })
            }
          />
          <Button
            secondary
            label="Cancel name change"
            disabled={busy}
            onPress={() => setEditing(false)}
          />
        </Card>
      ) : (
        <View style={{ ...styles.row, justifyContent: 'space-between' }}>
          <Body>{name}</Body>
          <Button
            secondary
            label="Change name"
            onPress={() => {
              setDraft(name);
              setEditing(true);
            }}
          />
        </View>
      )}
    </View>
  );
}
function GameSpace({
  gameId,
  uid,
  active,
  retry,
  reconnect,
}: {
  gameId: string;
  uid: string;
  active: boolean;
  retry: number;
  reconnect: () => void;
}) {
  const game = useDocument<PublicGame>(`games/${gameId}`, active, retry);
  const players = useCollection<PublicPlayer>(
    `games/${gameId}/players`,
    active,
    false,
    retry,
  );
  if (game.error || players.error)
    return (
      <Card>
        <ErrorMessage message={game.error ?? players.error} />
        <Button label="Retry connection" onPress={reconnect} />
      </Card>
    );
  if (game.loading || players.loading) return <Loading />;
  if (!game.data)
    return (
      <Card>
        <Body>
          This game could not be loaded. If local emulators were reset, clear
          this development app’s storage and reconnect.
        </Body>
        <Button label="Retry connection" onPress={reconnect} />
      </Card>
    );
  const sortedPlayers = [...(players.data ?? [])].sort(
    (a, b) => a.joinedAt - b.joinedAt || a.uid.localeCompare(b.uid),
  );
  const connected = !game.cached && !players.cached;
  return (
    <View style={styles.stack}>
      {!connected && (
        <Card>
          <Body muted>
            Waiting for the server. Displayed information may be out of date.
          </Body>
        </Card>
      )}
      {game.data.status === 'lobby' ? (
        <Lobby
          game={game.data}
          players={sortedPlayers}
          uid={uid}
          connected={connected}
        />
      ) : (
        <Dashboard
          game={game.data}
          players={sortedPlayers}
          uid={uid}
          active={active}
          retry={retry}
        />
      )}
    </View>
  );
}
