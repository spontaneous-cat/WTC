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
  CompactPlayerList,
  ErrorMessage,
  Eyebrow,
  styles,
  Title,
  useAction,
} from '../ui/components';
import { SetupForm } from '../ui/SetupForm';
import { DevFakePlayers } from '../ui/DevFakePlayers';
import { devModeRequested } from '../data/devMode';
import { GameRules, GameSettings } from './GameInfo';
import { useNestedScreen } from '../ui/navigation';

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
  const { screen, navigate, back } = useNestedScreen<
    'lobby' | 'menu' | 'settings' | 'rules' | 'setup'
  >('lobby');
  const { busy, error, run } = useAction();
  const admin = game.adminUid === uid;
  if (screen === 'setup' && admin)
    return (
      <View style={styles.stack}>
        <Button secondary label="Back to lobby" onPress={back} />
        <Card>
          <SetupForm
            initial={game.setup}
            onCancel={back}
            onSave={async (setup) => {
              await api.configure(game.id, setup);
              back();
            }}
          />
        </Card>
      </View>
    );
  if (screen === 'settings')
    return (
      <View style={styles.stack}>
        <Button secondary label="Back to lobby" onPress={back} />
        <GameSettings game={game} />
      </View>
    );
  if (screen === 'rules')
    return (
      <View style={styles.stack}>
        <Button secondary label="Back to lobby" onPress={back} />
        <GameRules />
      </View>
    );
  if (screen === 'menu')
    return (
      <View style={styles.stack}>
        <Button secondary label="Back to lobby" onPress={back} />
        <Card>
          <Title small>Menu</Title>
          <Body muted>Navigate without revealing hidden game information.</Body>
          <Button label="Game settings" onPress={() => navigate('settings')} />
          <Button
            secondary
            label="Game rules"
            onPress={() => navigate('rules')}
          />
          {admin && (
            <Button
              secondary
              label="Edit game setup"
              disabled={!connected}
              onPress={() => navigate('setup')}
            />
          )}
          {admin && devModeRequested && (
            <Body muted>
              Developer tools are available on the lobby screen.
            </Body>
          )}
        </Card>
      </View>
    );
  return (
    <View style={styles.stack}>
      <View style={{ ...styles.row, justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Eyebrow>The gathering</Eyebrow>
          <Title>Your circle is forming.</Title>
        </View>
        <Button secondary label="Open menu" onPress={() => navigate('menu')} />
      </View>
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
        <CompactPlayerList
          players={players.map((p) => ({
            id: p.uid,
            name: `${p.displayName}${p.uid === uid ? ' (you)' : ''}`,
            status:
              p.uid === game.adminUid
                ? 'Waiting in lobby · game creator'
                : 'Waiting in lobby',
            accessibilityLabel: `Lobby player ${p.displayName}`,
          }))}
        />
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
              onPress={() => navigate('setup')}
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
