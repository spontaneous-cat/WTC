import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETUP,
  createLobby,
  joinLobby,
  renamePlayer,
  startGame,
  updateSetup,
  projectGame,
  type LobbyState,
} from './lobby';
import { setupSchema, displayNameSchema, gameCodeSchema } from './contracts';

const setup = {
  ...DEFAULT_SETUP,
  playerCount: 4,
  roles: { killer: 1, minion: 0, good: 2, neutral_exile: 1 },
};
const create = () => createLobby('g1', '000123', 'a', 'Alice', setup, 1000);
const fullLobby = () =>
  ['b', 'c', 'd'].reduce(
    (state, uid) => joinLobby(state, uid, uid.toUpperCase(), 2000),
    create(),
  );
const start = (state: LobbyState) => startGame(state, 'a', 3000, () => 0);

describe('setup validation', () => {
  it('defaults to eight players and the approved timings', () => {
    expect(setupSchema.parse(DEFAULT_SETUP)).toEqual(DEFAULT_SETUP);
    expect(DEFAULT_SETUP.playerCount).toBe(8);
    expect(DEFAULT_SETUP.timers).toEqual({
      cooldown: 3600,
      discussion: 120,
      voting: 30,
      grace: 60,
    });
    expect(DEFAULT_SETUP.manualCorrectionsEnabled).toBe(true);
    expect(DEFAULT_SETUP.visibleLiveVoting).toBe(true);
  });
  it.each([3, 21, 4.5])('rejects player count %s', (playerCount) => {
    expect(setupSchema.safeParse({ ...setup, playerCount }).success).toBe(
      false,
    );
  });
  it.each([0, 2, -1, 1.5])('requires exactly one killer (got %s)', (killer) => {
    expect(
      setupSchema.safeParse({ ...setup, roles: { ...setup.roles, killer } })
        .success,
    ).toBe(false);
  });
  it('requires exact role totals', () => {
    expect(
      setupSchema.safeParse({ ...setup, roles: { ...setup.roles, minion: 1 } })
        .success,
    ).toBe(false);
  });
  it.each([
    [4, 2],
    [5, 3],
    [6, 3],
    [20, 10],
  ])('accepts %s players with %s good', (playerCount, good) => {
    expect(
      setupSchema.safeParse({
        ...setup,
        playerCount,
        roles: {
          killer: 1,
          good,
          minion: playerCount - good - 1,
          neutral_exile: 0,
        },
      }).success,
    ).toBe(true);
  });
  it('rejects less than ceil(n/2) good', () => {
    expect(
      setupSchema.safeParse({
        ...setup,
        roles: { killer: 1, good: 1, minion: 2, neutral_exile: 0 },
      }).success,
    ).toBe(false);
  });
  it('rejects negative, fractional, and unbounded timers', () => {
    for (const voting of [-1, 0, 0.1, 999999999]) {
      expect(
        setupSchema.safeParse({ ...setup, timers: { ...setup.timers, voting } })
          .success,
      ).toBe(false);
    }
  });
  it('trims names, disallows blank/control characters, and bounds length', () => {
    expect(displayNameSchema.parse(' Alice ')).toBe('Alice');
    for (const name of ['', '   ', 'a\nb', 'a'.repeat(41)])
      expect(displayNameSchema.safeParse(name).success).toBe(false);
  });
  it('preserves leading zeroes in exactly six numeric digits', () => {
    expect(gameCodeSchema.parse('000123')).toBe('000123');
    for (const code of ['12345', '1234567', 'ABC123', 123456])
      expect(gameCodeSchema.safeParse(code).success).toBe(false);
  });
});

describe('lobby lifecycle', () => {
  it('adds creator as a normal lobby player without a role', () => {
    const state = create();
    expect(state.adminUid).toBe('a');
    expect(state.players.a?.role).toBeUndefined();
    expect(Object.keys(state.players)).toEqual(['a']);
  });
  it('joins without mutating the previous state and allows duplicate names', () => {
    const state = create();
    expect(joinLobby(state, 'b', 'Alice', 2000).players.b?.displayName).toBe(
      'Alice',
    );
    expect(Object.keys(state.players)).toHaveLength(1);
  });
  it('makes repeat joins idempotent even when full or started', () => {
    expect(joinLobby(fullLobby(), 'a', 'Other name', 4000)).toEqual(
      fullLobby(),
    );
    const active = start(fullLobby());
    expect(joinLobby(active, 'a', 'Other name', 4000)).toEqual(active);
  });
  it('rejects a new player when full or already started', () => {
    expect(() => joinLobby(fullLobby(), 'e', 'E', 2000)).toThrow(/full/i);
    expect(() => joinLobby(start(fullLobby()), 'e', 'E', 4000)).toThrow(
      /lobby/i,
    );
  });
  it('requires creator and exact attendance to start', () => {
    expect(() => start(create())).toThrow(/4 players/i);
    expect(() => startGame(fullLobby(), 'b', 3000, () => 0)).toThrow(
      /creator/i,
    );
  });
  it('assigns each configured role exactly once with correct teams', () => {
    const active = start(fullLobby());
    expect(active.status).toBe('active');
    expect(active.startedAt).toBe(3000);
    expect(
      Object.values(active.players)
        .map((p) => p.role)
        .sort(),
    ).toEqual(['good', 'good', 'killer', 'neutral_exile']);
    for (const p of Object.values(active.players)) {
      expect(p.currentTeam).toBe(
        p.role === 'killer' ? 'evil' : p.role === 'good' ? 'good' : 'neutral',
      );
      expect(p.status).toBe('alive');
    }
  });
  it('never rerolls roles on a repeated start', () => {
    const active = start(fullLobby());
    expect(startGame(active, 'a', 9000, () => 0.99)).toEqual(active);
  });
  it('allows only creator to edit setup, and locks setup after start', () => {
    expect(() => updateSetup(create(), 'b', setup)).toThrow(/creator/i);
    expect(() => updateSetup(start(fullLobby()), 'a', setup)).toThrow(
      /locked/i,
    );
    expect(updateSetup(create(), 'a', DEFAULT_SETUP).setup.playerCount).toBe(8);
  });
  it('allows members to change their own name during active play', () => {
    const active = start(fullLobby());
    expect(renamePlayer(active, 'b', ' New Name ').players.b?.displayName).toBe(
      'New Name',
    );
    expect(() => renamePlayer(active, 'outsider', 'X')).toThrow(/member/i);
  });
  it('projects only publicly revealed status, never hidden roles or deaths', () => {
    const active = start(fullLobby());
    const victim = active.players.b!;
    victim.status = 'dead';
    victim.currentTeam = 'evil';
    const projected = projectGame(active);
    expect(projected.players.b?.status).toBe('alive');
    expect(
      JSON.stringify({ game: projected.game, players: projected.players }),
    ).not.toContain('currentTeam');
    expect(projected.privatePlayers.b?.status).toBe('dead');
    expect(projected.players.b).not.toHaveProperty('role');
    expect(projected.game).not.toHaveProperty('players');
  });
});
