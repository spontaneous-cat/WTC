import { useState } from 'react';
import { Switch, View } from 'react-native';
import {
  ROLE_IDS,
  ROLES,
  setupSchema,
  type Setup,
} from '../../shared/contracts';
import {
  Body,
  Button,
  ErrorMessage,
  Field,
  styles,
  Title,
  useAction,
} from './components';
import { useTheme } from './theme';

export function SetupForm({
  initial,
  onSave,
  onCancel,
  submitLabel = 'Save settings',
}: {
  initial: Setup;
  onSave: (setup: Setup) => Promise<unknown>;
  onCancel: () => void;
  submitLabel?: string;
}) {
  const [draft, setDraft] = useState(initial);
  const { busy, error, run } = useAction();
  const { colors } = useTheme();
  const validation = setupSchema.safeParse(draft);
  const number = (text: string) => (text === '' ? NaN : Number(text));
  const numericValue = (value: number) =>
    Number.isNaN(value) ? '' : String(value);
  return (
    <View style={styles.stack}>
      <Title small>Shape your game</Title>
      <Body muted>
        Setup locks when the game begins. The creator plays without privileged
        role knowledge.
      </Body>
      <Field
        label="Players (4–20)"
        keyboardType="number-pad"
        value={numericValue(draft.playerCount)}
        onChangeText={(text) =>
          setDraft({ ...draft, playerCount: number(text) })
        }
      />
      <Body muted>
        Exactly one killer. At least half the group, rounded up, must start
        good. Role counts must add up to the player count.
      </Body>
      {ROLE_IDS.map((role) => (
        <Field
          key={role}
          label={`${ROLES[role].name} count`}
          keyboardType="number-pad"
          editable={role !== 'killer'}
          value={numericValue(draft.roles[role])}
          onChangeText={(text) =>
            setDraft({
              ...draft,
              roles: { ...draft.roles, [role]: number(text) },
            })
          }
        />
      ))}
      <Title small>Timing</Title>
      {(['cooldown', 'discussion', 'voting', 'grace'] as const).map((timer) => (
        <Field
          key={timer}
          label={`${{ cooldown: 'Vote cooldown', discussion: 'Discussion', voting: 'Voting', grace: 'Grace period' }[timer]} (seconds)`}
          keyboardType="number-pad"
          value={numericValue(draft.timers[timer])}
          onChangeText={(text) =>
            setDraft({
              ...draft,
              timers: { ...draft.timers, [timer]: number(text) },
            })
          }
        />
      ))}
      <View style={styles.row}>
        <Switch
          accessibilityLabel="Visible live voting"
          value={draft.visibleLiveVoting}
          onValueChange={(value) =>
            setDraft({ ...draft, visibleLiveVoting: value })
          }
          trackColor={{ true: colors.accent }}
        />
        <Body>Visible live voting</Body>
      </View>
      <View style={styles.row}>
        <Switch
          accessibilityLabel="Manual admin corrections"
          value={draft.manualCorrectionsEnabled}
          onValueChange={(value) =>
            setDraft({ ...draft, manualCorrectionsEnabled: value })
          }
          trackColor={{ true: colors.accent }}
        />
        <Body>Manual admin corrections</Body>
      </View>
      <Body muted>
        Timing and correction options are saved now; their gameplay controls
        arrive in later implementation slices.
      </Body>
      <ErrorMessage
        message={
          !validation.success
            ? validation.error.issues
                .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
                .join('\n')
            : error
        }
      />
      <Button
        label={busy ? 'Saving…' : submitLabel}
        disabled={busy || !validation.success}
        onPress={() => {
          if (validation.success) void run(() => onSave(validation.data));
        }}
      />
      <Button secondary label="Cancel" disabled={busy} onPress={onCancel} />
    </View>
  );
}
