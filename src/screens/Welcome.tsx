import { useState } from 'react';
import { View } from 'react-native';
import { DEFAULT_SETUP } from '../../shared/lobby';
import { gameCodeSchema } from '../../shared/contracts';
import { api } from '../data/api';
import {
  Body,
  Button,
  Card,
  ErrorMessage,
  Eyebrow,
  Field,
  styles,
  Title,
  useAction,
} from '../ui/components';
import { SetupForm } from '../ui/SetupForm';

export function Welcome({ displayName }: { displayName: string }) {
  const [creating, setCreating] = useState(false);
  const [code, setCode] = useState('');
  const { busy, error, run } = useAction();
  if (creating)
    return (
      <Card>
        <SetupForm
          initial={DEFAULT_SETUP}
          submitLabel="Create lobby"
          onCancel={() => setCreating(false)}
          onSave={(setup) => api.create(displayName, setup)}
        />
      </Card>
    );
  return (
    <View style={styles.stack}>
      <Eyebrow>Within the Collective</Eyebrow>
      <Title>{'Everyone belongs.\nNot everyone can be trusted.'}</Title>
      <Body muted>
        A game of quiet alliances, hidden intentions, and difficult choices.
        Played together, over days.
      </Body>
      <Card>
        <Title small>Enter the circle</Title>
        <Body muted>Ask the game creator for your six-digit code.</Body>
        <Field
          label="Game code"
          placeholder="000000"
          keyboardType="number-pad"
          maxLength={6}
          value={code}
          onChangeText={setCode}
        />
        <ErrorMessage message={error} />
        <Button
          label={busy ? 'Joining…' : 'Join game'}
          disabled={busy || !gameCodeSchema.safeParse(code).success}
          onPress={() => void run(() => api.join(displayName, code))}
        />
      </Card>
      <Card>
        <Title small>Gather your collective</Title>
        <Body muted>
          Create a lobby for 4–20 players. You will play with the same
          information as everyone else.
        </Body>
        <Button
          secondary
          label="Create a game"
          onPress={() => setCreating(true)}
        />
      </Card>
      <Body muted>
        No accounts. Your identity stays on this device. Do not clear app data
        during a game—recovery is not available.
      </Body>
    </View>
  );
}
