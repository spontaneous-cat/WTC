import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import type {
  PrivatePlayerData,
  PublicGame,
  PublicPlayer,
} from '../../shared/contracts';
import { friendlyError } from '../data/api';
import {
  clearFakePlayerRecords,
  createFakePlayerRecord,
  devModeEnabled,
  DEV_MODE_DISABLED_REASON,
  fakeAction,
  fakePlayerClient,
  loadFakePlayerRecords,
  saveFakePlayerRecords,
  type FakePlayerRecord,
} from '../data/devMode';
import {
  Body,
  Button,
  Card,
  ErrorMessage,
  Eyebrow,
  Field,
  styles,
  Title,
} from './components';
import { useTheme } from './theme';

type RoleSnapshot = PrivatePlayerData & { uid: string };

export function DevFakePlayers({
  game,
  players,
}: {
  game: PublicGame;
  players: PublicPlayer[];
}) {
  const [records, setRecords] = useState<FakePlayerRecord[]>([]);
  const [draftName, setDraftName] = useState('Fake Player');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [roles, setRoles] = useState<Record<string, RoleSnapshot>>({});
  const byUid = useMemo(
    () => Object.fromEntries(players.map((player) => [player.uid, player])),
    [players],
  );

  useEffect(() => {
    let alive = true;
    void loadFakePlayerRecords()
      .then(async (loaded) => {
        const hydrated = await Promise.all(
          loaded.map(async (record) => {
            try {
              const client = await fakePlayerClient(record);
              return { ...record, uid: client.user.uid };
            } catch {
              return record;
            }
          }),
        );
        if (alive) setRecords(hydrated);
      })
      .catch((e) => alive && setError(friendlyError(e)));
    return () => {
      alive = false;
    };
  }, []);

  const persist = async (next: FakePlayerRecord[]) => {
    setRecords(next);
    await saveFakePlayerRecords(next);
  };
  const run = async (label: string, task: () => Promise<void>) => {
    if (busy) return;
    setBusy(label);
    setError(null);
    try {
      await task();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(null);
    }
  };
  const updateRecord = async (
    appName: string,
    update: (record: FakePlayerRecord) => FakePlayerRecord,
  ) => persist(records.map((r) => (r.appName === appName ? update(r) : r)));

  const refreshRoles = async (inputRecords = records) => {
    const snapshots: Record<string, RoleSnapshot> = {};
    await Promise.all(
      inputRecords.map(async (record) => {
        const client = await fakePlayerClient(record);
        const uid = client.user.uid;
        const snapshot = await getDoc(
          doc(client.db, `games/${game.id}/privatePlayerData/${uid}`),
        );
        if (snapshot.exists())
          snapshots[uid] = { ...(snapshot.data() as PrivatePlayerData), uid };
      }),
    );
    setRoles(snapshots);
  };

  if (!devModeEnabled) {
    return (
      <Card>
        <Eyebrow>Developer test mode</Eyebrow>
        <Body muted>{DEV_MODE_DISABLED_REASON}</Body>
      </Card>
    );
  }

  return (
    <Card>
      <Eyebrow>Developer test mode · emulators only</Eyebrow>
      <Title small>Fake players</Title>
      <Body muted>
        These controls create isolated anonymous Auth emulator users and call
        the same Cloud Functions as real devices. Never use them with staging or
        production Firebase projects.
      </Body>
      <ErrorMessage message={error} />
      <View style={styles.row}>
        <Field
          label="Fake player name"
          value={draftName}
          onChangeText={setDraftName}
          maxLength={40}
        />
        <Button
          label={busy === 'create' ? 'Creating…' : 'Create fake'}
          disabled={Boolean(busy) || !draftName.trim()}
          onPress={() =>
            void run('create', async () => {
              const record = await createFakePlayerRecord(draftName.trim());
              const client = await fakePlayerClient(record);
              const next = [...records, { ...record, uid: client.user.uid }];
              await persist(next);
              setDraftName(`Fake Player ${next.length + 1}`);
            })
          }
        />
      </View>
      <Eyebrow>Fake player list</Eyebrow>
      {!records.length ? (
        <Body muted>No fake players on this browser/device yet.</Body>
      ) : (
        <View style={styles.compactList}>
          {records.map((record) => {
            const uid = record.uid;
            const publicPlayer = uid ? byUid[uid] : undefined;
            const privateData = uid ? roles[uid] : undefined;
            const joined = Boolean(publicPlayer);
            return (
              <FakePlayerRow
                key={record.appName}
                record={record}
                joined={joined}
                publicPlayer={publicPlayer}
                privateData={privateData}
                busy={Boolean(busy)}
                gameStatus={game.status}
                onJoin={() =>
                  void run(`join-${record.appName}`, async () => {
                    const { client } = await fakeAction(record, 'joinGame', {
                      code: game.code,
                      displayName: record.displayName,
                    });
                    await updateRecord(record.appName, (r) => ({
                      ...r,
                      uid: client.user.uid,
                      lastResult: `Joined lobby ${game.code}.`,
                    }));
                  })
                }
                onRefresh={() => void run('refresh', () => refreshRoles())}
              />
            );
          })}
        </View>
      )}
      <View style={styles.row}>
        <Button
          secondary
          label="Refresh fake roles"
          disabled={Boolean(busy)}
          onPress={() => void run('refresh', () => refreshRoles())}
        />
        <Button
          secondary
          label="Reset local fake players"
          disabled={Boolean(busy)}
          onPress={() =>
            void run('reset', async () => {
              await clearFakePlayerRecords();
              setRecords([]);
              setRoles({});
            })
          }
        />
      </View>
      <Body muted>
        Gameplay controls for fake kills, nominations, ballots, alerts, and game
        completion will appear here when those authoritative actions are
        implemented. This tool currently exercises the real lobby/start paths.
      </Body>
    </Card>
  );
}

function FakePlayerRow({
  record,
  joined,
  publicPlayer,
  privateData,
  busy,
  gameStatus,
  onJoin,
  onRefresh,
}: {
  record: FakePlayerRecord;
  joined: boolean;
  publicPlayer: PublicPlayer | undefined;
  privateData: RoleSnapshot | undefined;
  busy: boolean;
  gameStatus: PublicGame['status'];
  onJoin: () => void;
  onRefresh: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityLabel={`Fake player row for ${record.displayName}`}
      style={{
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        gap: 8,
        backgroundColor: colors.raised,
      }}
    >
      <View style={{ ...styles.row, justifyContent: 'space-between' }}>
        <View style={{ flex: 1, minWidth: 150 }}>
          <Body>{record.displayName}</Body>
          <Body muted>
            {record.uid ? `UID ${record.uid.slice(0, 8)}…` : 'No UID yet'}
          </Body>
        </View>
        <StatusPill label={joined ? 'Joined' : 'Not joined'} />
      </View>
      <View style={styles.row}>
        <CompactFact label="Public" value={publicPlayer?.status ?? '—'} />
        <CompactFact
          label="Private"
          value={
            privateData
              ? `${privateData.role} · ${privateData.currentTeam} · ${privateData.status}`
              : '—'
          }
        />
      </View>
      {record.lastResult && <Body muted>Last: {record.lastResult}</Body>}
      <View style={styles.row}>
        <Button
          secondary
          label={`Join ${record.displayName}`}
          disabled={busy || joined || gameStatus !== 'lobby'}
          onPress={onJoin}
        />
        <Button
          secondary
          label={`Refresh ${record.displayName}`}
          disabled={busy}
          onPress={onRefresh}
        />
      </View>
    </View>
  );
}

function CompactFact({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ minWidth: 120, flex: 1 }}>
      <Eyebrow>{label}:</Eyebrow>
      <Body>{value}</Body>
    </View>
  );
}

function StatusPill({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 5,
        backgroundColor: colors.surface,
      }}
    >
      <Body muted>{label}</Body>
    </View>
  );
}
