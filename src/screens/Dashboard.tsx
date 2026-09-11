import { useState } from 'react';
import { View } from 'react-native';
import {
  ROLE_IDS,
  ROLES,
  type PrivatePlayerData,
  type PublicGame,
  type PublicLogEntry,
  type PublicPlayer,
  type SuspectedRole,
} from '../../shared/contracts';
import { api } from '../data/api';
import { useCollection, useDocument } from '../data/hooks';
import {
  Body,
  Button,
  Card,
  ErrorMessage,
  Eyebrow,
  Loading,
  styles,
  Title,
  useAction,
} from '../ui/components';

type Tab = 'Role' | 'Players' | 'History' | 'Settings';
export function Dashboard({
  game,
  players,
  uid,
  active,
  retry,
}: {
  game: PublicGame;
  players: PublicPlayer[];
  uid: string;
  active: boolean;
  retry: number;
}) {
  const [tab, setTab] = useState<Tab>('Role');
  return (
    <View style={styles.stack}>
      <Eyebrow>The game is underway · {game.code}</Eyebrow>
      <Title>Trust carefully.</Title>
      <View style={styles.row}>
        {(['Role', 'Players', 'History', 'Settings'] as Tab[]).map((item) => (
          <Button
            key={item}
            secondary
            selected={item === tab}
            label={item}
            onPress={() => setTab(item)}
          />
        ))}
      </View>
      {tab === 'Role' && (
        <RoleCard
          key={String(active)}
          gameId={game.id}
          uid={uid}
          active={active}
          retry={retry}
        />
      )}
      {tab === 'Players' && (
        <Players
          game={game}
          players={players}
          uid={uid}
          active={active}
          retry={retry}
        />
      )}
      {tab === 'History' && (
        <History gameId={game.id} active={active} retry={retry} />
      )}
      {tab === 'Settings' && <Settings game={game} />}
      <Card>
        <Eyebrow>Development preview</Eyebrow>
        <Body muted>
          This slice supports lobbies, private roles, and suspicion markers.
          Kill reports, voting, game-end results, and admin gameplay controls
          are not implemented yet. Do not use it to run a full game.
        </Body>
      </Card>
    </View>
  );
}
function RoleCard({
  gameId,
  uid,
  active,
  retry,
}: {
  gameId: string;
  uid: string;
  active: boolean;
  retry: number;
}) {
  const [revealed, setRevealed] = useState(false);
  const role = useDocument<PrivatePlayerData>(
    `games/${gameId}/privatePlayerData/${uid}`,
    active,
    retry,
  );
  if (role.error) return <ErrorMessage message={role.error} />;
  if (role.loading || !role.data)
    return <Loading label="Preparing your private role…" />;
  const definition = ROLES[role.data.role];
  return (
    <Card>
      <Eyebrow>For your eyes only</Eyebrow>
      {revealed && active ? (
        <>
          <Title>{definition.name}</Title>
          <Body>{definition.description}</Body>
          <Eyebrow>Your objective</Eyebrow>
          <Body>{definition.winCondition}</Body>
          <Body muted>
            Team: {role.data.currentTeam} · Status: {role.data.status}
          </Body>
        </>
      ) : (
        <>
          <Title small>A secret to keep.</Title>
          <Body muted>
            Make sure nobody is looking before revealing your role.
          </Body>
        </>
      )}
      <Button
        label={revealed ? 'Hide my role' : 'Reveal my role'}
        onPress={() => setRevealed(!revealed)}
      />
    </Card>
  );
}
function Players({
  game,
  players,
  uid,
  active,
  retry,
}: {
  game: PublicGame;
  players: PublicPlayer[];
  uid: string;
  active: boolean;
  retry: number;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const suspicions = useCollection<{ suspectedRole: SuspectedRole }>(
    `games/${game.id}/owners/${uid}/suspicions`,
    active,
    false,
    retry,
  );
  const { busy, error, run } = useAction();
  return (
    <View style={styles.stack}>
      <Body muted>
        Your guesses are private, never confirmed roles. Statuses reflect only
        publicly revealed information.
      </Body>
      <ErrorMessage message={suspicions.error ?? error} />
      {players.map((p) => {
        const suspected =
          suspicions.data?.find((s) => s.id === p.uid)?.suspectedRole ??
          'unknown';
        return (
          <Card key={p.uid}>
            <Title small>
              {p.displayName}
              {p.uid === uid ? ' (you)' : ''}
            </Title>
            <Body muted>
              {p.status === 'alive'
                ? 'Alive · last public status'
                : p.status === 'dead'
                  ? 'Killed'
                  : 'Voted out'}
            </Body>
            {p.uid !== uid && (
              <>
                <Body>
                  Your guess:{' '}
                  {suspected === 'unknown' ? 'Unknown' : ROLES[suspected].name}
                </Body>
                <Button
                  secondary
                  label={`Set suspicion for ${p.displayName}`}
                  onPress={() => setSelected(selected === p.uid ? null : p.uid)}
                />
                {selected === p.uid && (
                  <View style={styles.stack}>
                    {(['unknown', ...ROLE_IDS] as SuspectedRole[]).map(
                      (role) => (
                        <Button
                          key={role}
                          secondary
                          selected={role === suspected}
                          disabled={busy}
                          label={
                            role === 'unknown' ? 'Unknown' : ROLES[role].name
                          }
                          onPress={() =>
                            void run(async () => {
                              await api.suspect(game.id, uid, p.uid, role);
                              setSelected(null);
                            })
                          }
                        />
                      ),
                    )}
                  </View>
                )}
              </>
            )}
          </Card>
        );
      })}
    </View>
  );
}
function History({
  gameId,
  active,
  retry,
}: {
  gameId: string;
  active: boolean;
  retry: number;
}) {
  const history = useCollection<PublicLogEntry>(
    `games/${gameId}/log`,
    active,
    true,
    retry,
  );
  return (
    <Card>
      <Title small>The chronicle</Title>
      <Body muted>Public events only. Most recent first.</Body>
      <ErrorMessage message={history.error} />
      {history.loading ? (
        <Loading />
      ) : !history.data?.length ? (
        <Body muted>No public events yet.</Body>
      ) : (
        history.data.map((entry) => (
          <View key={entry.id} style={{ gap: 4 }}>
            <Body>{entry.message}</Body>
            <Body muted>{new Date(entry.createdAt).toLocaleString()}</Body>
          </View>
        ))
      )}
    </Card>
  );
}
function Settings({ game }: { game: PublicGame }) {
  return (
    <Card>
      <Title small>Game settings</Title>
      <Body muted>Read-only. Initial role composition is locked.</Body>
      <Body>Players: {game.setup.playerCount}</Body>
      {ROLE_IDS.map((role) => (
        <Body key={role}>
          {ROLES[role].name}: {game.setup.roles[role]}
        </Body>
      ))}
      <Body>Vote cooldown: {game.setup.timers.cooldown} seconds</Body>
      <Body>Discussion: {game.setup.timers.discussion} seconds</Body>
      <Body>Voting: {game.setup.timers.voting} seconds</Body>
      <Body>Grace period: {game.setup.timers.grace} seconds</Body>
      <Body>
        Visible live voting: {game.setup.visibleLiveVoting ? 'On' : 'Off'}
      </Body>
      <Body>
        Manual corrections:{' '}
        {game.setup.manualCorrectionsEnabled ? 'Enabled' : 'Disabled'}
      </Body>
    </Card>
  );
}
