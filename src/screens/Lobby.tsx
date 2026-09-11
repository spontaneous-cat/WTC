import { useState } from 'react';
import { Share, View } from 'react-native';
import {
  ROLES,
  type PublicGame,
  type PublicPlayer,
} from '../../shared/contracts';
import { api } from '../data/api';
import {
  Body,
  Button,
  Card,
  ErrorMessage,
  Eyebrow,
  styles,
  Title,
  useAction,
} from '../ui/components';
import { SetupForm } from '../ui/SetupForm';
import { DevFakePlayers } from '../ui/DevFakePlayers';
import { devModeRequested } from '../data/devMode';

export function Lobby({
  game,
  players,
  uid,
  connected,
}: {
  game: PublicGame;
  players: PublicPlayer[];
  uid: string;
  connected: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const { busy, error, run } = useAction();
  const admin = game.adminUid === uid;
  if (editing && admin)
    return (
      <Card>
        <SetupForm
          initial={game.setup}
          onCancel={() => setEditing(false)}
          onSave={async (setup) => {
            await api.configure(game.id, setup);
            setEditing(false);
          }}
        />
      </Card>
    );
  return (
    <View style={styles.stack}>
      <Eyebrow>The gathering</Eyebrow>
      <Title>Your circle is forming.</Title>
      <Card>
        <Eyebrow>Game code</Eyebrow>
        <Title>{game.code}</Title>
        <Body muted>Share this code privately with your group.</Body>
        <Button
          secondary
          label="Share game code"
          onPress={() =>
            void run(() =>
              Share.share({ message: `Join my WTC game. Code: ${game.code}` }),
            )
          }
        />
      </Card>
      <Card>
        <Title small>
          Players · {players.length}/{game.setup.playerCount}
        </Title>
        {players.map((p) => (
          <View key={p.uid} style={{ gap: 3 }}>
            <Body>
              {p.displayName}
              {p.uid === uid ? ' (you)' : ''}
            </Body>
            {p.uid === game.adminUid && (
              <Body muted>Game creator · settings only</Body>
            )}
          </View>
        ))}
      </Card>
      <Card>
        <Title small>The roles in play</Title>
        {Object.entries(game.setup.roles)
          .filter(([, count]) => count > 0)
          .map(([role, count]) => (
            <Body key={role}>
              {count} × {ROLES[role as keyof typeof ROLES].name}
            </Body>
          ))}
        <Body muted>
          Roles are assigned randomly and privately when the game begins.
          Nobody, including the creator, can see anyone else’s role.
        </Body>
        <ErrorMessage message={error} />
        {admin ? (
          <>
            <Button
              secondary
              label="Edit game setup"
              disabled={busy || !connected}
              onPress={() => setEditing(true)}
            />
            <Button
              label={busy ? 'Starting…' : 'Begin the game'}
              disabled={
                busy || !connected || players.length !== game.setup.playerCount
              }
              onPress={() => void run(() => api.start(game.id))}
            />
          </>
        ) : (
          <Body muted>Waiting for the creator to begin.</Body>
        )}
      </Card>
      {admin && devModeRequested && (
        <DevFakePlayers game={game} players={players} />
      )}
    </View>
  );
}
