import { useState } from 'react';
import { View } from 'react-native';
import {
  ROLE_IDS,
  ROLES,
  type PrivatePlayerData,
  type PublicGame,
  type PublicLogEntry,
  type PublicPlayer,
  type PublicVoteRound,
  type SuspectedRole,
} from '../../shared/contracts';
import { api } from '../data/api';
import { devModeRequested } from '../data/devMode';
import { DevFakePlayers } from '../ui/DevFakePlayers';
import { useCollection, useDocument } from '../data/hooks';
import { GameRules, GameSettings } from './GameInfo';
import { useNestedScreen } from '../ui/navigation';
import {
  Body,
  Button,
  Card,
  CompactPlayerList,
  ErrorMessage,
  Eyebrow,
  Loading,
  styles,
  Title,
  useAction,
} from '../ui/components';

type Screen = 'role' | 'players' | 'history' | 'settings' | 'rules' | 'menu';
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
  const { screen, navigate, back } = useNestedScreen<Screen>('role');
  return (
    <View style={styles.stack}>
      <View style={{ ...styles.row, justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Eyebrow>The game is underway · {game.code}</Eyebrow>
          <Title>Trust carefully.</Title>
        </View>
        <Button secondary label="Open menu" onPress={() => navigate('menu')} />
      </View>
      <View style={styles.row}>
        <Button
          secondary
          selected={screen === 'role'}
          label="Role"
          onPress={() => navigate('role')}
        />
        <Button
          secondary
          selected={screen === 'players'}
          label="Players"
          onPress={() => navigate('players')}
        />
      </View>
      {screen !== 'role' && (
        <Button secondary label="Back to dashboard" onPress={back} />
      )}
      {screen === 'role' && (
        <>
          <RoleCard
            key={String(active)}
            gameId={game.id}
            uid={uid}
            active={active}
            retry={retry}
          />
          <VotePanel
            game={game}
            players={players}
            uid={uid}
            active={active}
            retry={retry}
          />
        </>
      )}
      {screen === 'players' && (
        <Players
          game={game}
          players={players}
          uid={uid}
          active={active}
          retry={retry}
        />
      )}
      {screen === 'history' && (
        <History gameId={game.id} active={active} retry={retry} />
      )}
      {screen === 'settings' && <GameSettings game={game} />}
      {screen === 'rules' && <GameRules />}
      {screen === 'menu' && (
        <Card>
          <Title small>Menu</Title>
          <Body muted>Secondary screens and reference information.</Body>
          <Button label="Game settings" onPress={() => navigate('settings')} />
          <Button
            secondary
            label="Game rules"
            onPress={() => navigate('rules')}
          />
          <Button
            secondary
            label="History"
            onPress={() => navigate('history')}
          />
          {game.adminUid === uid && devModeRequested && (
            <Body muted>Developer tools remain on the dashboard.</Body>
          )}
        </Card>
      )}
      {game.adminUid === uid && devModeRequested && (
        <DevFakePlayers game={game} players={players} />
      )}
      <Card>
        <Eyebrow>Development preview</Eyebrow>
        <Body muted>
          This slice supports lobbies, private roles, suspicion markers,
          nomination voting, and an emulator-only fake-player harness. Kill
          reports, game-end results, and admin gameplay controls are not
          implemented yet. Do not use it to run a full game.
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
function VotePanel({
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
  const rounds = useCollection<PublicVoteRound>(
    `games/${game.id}/voteRounds`,
    active,
    true,
    retry,
  );
  const { busy, error, run } = useAction();
  const activeRound = rounds.data?.find(
    (round) => round.id === game.activeVoteRoundId,
  );
  const latestNomination = activeRound?.nominations.at(-1);
  return (
    <Card>
      <Eyebrow>Voting</Eyebrow>
      <Title small>
        {activeRound ? 'Active nomination round' : 'Call a nomination'}
      </Title>
      <ErrorMessage message={rounds.error ?? error} />
      {activeRound && latestNomination ? (
        <View style={styles.stack}>
          <Body>
            Nominee:{' '}
            {players.find((p) => p.uid === latestNomination.nomineePlayerId)
              ?.displayName ?? latestNomination.nomineePlayerId}
          </Body>
          <Body muted>
            Phase: {latestNomination.phase}. Threshold:{' '}
            {latestNomination.majorityRequired} yes votes.
          </Body>
          {latestNomination.yesCount !== undefined && (
            <Body>
              Yes: {latestNomination.yesCount} · No:{' '}
              {latestNomination.noCount ?? 0}
            </Body>
          )}
          {latestNomination.phase === 'voting' && (
            <View style={styles.row}>
              <Button
                label="Vote yes"
                disabled={busy}
                onPress={() =>
                  void run(() =>
                    api.castVote(
                      game.id,
                      activeRound.id,
                      latestNomination.id,
                      true,
                    ),
                  )
                }
              />
              <Button
                secondary
                label="Vote no"
                disabled={busy}
                onPress={() =>
                  void run(() =>
                    api.castVote(
                      game.id,
                      activeRound.id,
                      latestNomination.id,
                      false,
                    ),
                  )
                }
              />
            </View>
          )}
          <Button
            secondary
            label="Refresh vote deadline"
            disabled={busy}
            onPress={() =>
              void run(() => api.resolveVote(game.id, activeRound.id))
            }
          />
        </View>
      ) : (
        <View style={styles.stack}>
          <Body muted>
            Living players may nominate any living player, including themselves.
          </Body>
          <View style={styles.row}>
            {players
              .filter((p) => p.status === 'alive')
              .map((player) => (
                <Button
                  key={player.uid}
                  secondary
                  disabled={busy}
                  label={`Nominate ${player.uid === uid ? 'yourself' : player.displayName}`}
                  onPress={() =>
                    void run(() => api.nominate(game.id, player.uid))
                  }
                />
              ))}
          </View>
        </View>
      )}
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
      <Card>
        <Title small>Players</Title>
        <CompactPlayerList
          players={players.map((p) => {
            const suspected =
              suspicions.data?.find((s) => s.id === p.uid)?.suspectedRole ??
              'unknown';
            const suspicionLabel =
              suspected === 'unknown' ? 'Unknown' : ROLES[suspected].name;
            const publicStatus =
              p.status === 'alive'
                ? 'Alive · last public status'
                : p.status === 'dead'
                  ? 'Killed'
                  : 'Voted out';
            return {
              id: p.uid,
              name: `${p.displayName}${p.uid === uid ? ' (you)' : ''}`,
              status: publicStatus,
              accessibilityLabel: `Player row ${p.displayName}, ${publicStatus}`,
              action:
                p.uid === uid ? undefined : (
                  <Button
                    secondary
                    label={`Set suspicion for ${p.displayName}`}
                    onPress={() =>
                      setSelected(selected === p.uid ? null : p.uid)
                    }
                  />
                ),
              note:
                p.uid === uid ? (
                  <Body muted>Your own private role stays hidden here.</Body>
                ) : (
                  <View style={{ gap: 8 }}>
                    <Body>Your guess: {suspicionLabel}</Body>
                    {selected === p.uid && (
                      <View style={styles.row}>
                        {(['unknown', ...ROLE_IDS] as SuspectedRole[]).map(
                          (role) => (
                            <Button
                              key={role}
                              secondary
                              selected={role === suspected}
                              disabled={busy}
                              label={
                                role === 'unknown'
                                  ? 'Unknown'
                                  : ROLES[role].name
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
                  </View>
                ),
            };
          })}
        />
      </Card>
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
