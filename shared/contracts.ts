import { z } from 'zod';

export const ROLE_IDS = ['killer', 'minion', 'good', 'neutral_exile'] as const;
export type RoleId = (typeof ROLE_IDS)[number];
export type Team = 'good' | 'evil' | 'neutral';
export type PlayerStatus = 'alive' | 'dead' | 'votedOut';

export const ROLES: Record<
  RoleId,
  { name: string; team: Team; description: string; winCondition: string }
> = {
  killer: {
    name: 'Killer',
    team: 'evil',
    description: 'Work in secret. Physical kills happen outside the app.',
    winCondition: 'Kill or vote out every non-evil player.',
  },
  minion: {
    name: 'Minion',
    team: 'evil',
    description: 'Support the killer without revealing your allegiance.',
    winCondition: 'Kill or vote out every non-evil player.',
  },
  good: {
    name: 'Collective',
    team: 'good',
    description: 'Watch closely, share your suspicions, and find the killer.',
    winCondition: 'Vote out the killer.',
  },
  neutral_exile: {
    name: 'Exile',
    team: 'neutral',
    description:
      'Your objective is your own. Convince the group to vote you out.',
    winCondition: 'Be voted out to win immediately.',
  },
};

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, 'Enter a display name.')
  .max(40, 'Use at most 40 characters.')
  .refine(
    (name) =>
      ![...name].some(
        (char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127,
      ),
    'Names cannot contain control characters.',
  );
export const gameCodeSchema = z
  .string()
  .regex(/^\d{6}$/, 'Enter a six-digit game code.');
export const setupSchema = z
  .object({
    playerCount: z.number().int().min(4).max(20),
    roles: z
      .object({
        killer: z.literal(1),
        minion: z.number().int().min(0).max(19),
        good: z.number().int().min(2).max(19),
        neutral_exile: z.number().int().min(0).max(19),
      })
      .strict(),
    timers: z
      .object({
        cooldown: z.number().int().min(0).max(604800),
        discussion: z.number().int().min(1).max(86400),
        voting: z.number().int().min(1).max(86400),
        grace: z.number().int().min(1).max(86400),
      })
      .strict(),
    manualCorrectionsEnabled: z.boolean(),
    visibleLiveVoting: z.boolean(),
  })
  .strict()
  .superRefine((setup, ctx) => {
    if (
      Object.values(setup.roles).reduce((sum, count) => sum + count, 0) !==
      setup.playerCount
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'Role counts must equal the configured player count.',
        path: ['roles'],
      });
    }
    if (setup.roles.good < Math.ceil(setup.playerCount / 2)) {
      ctx.addIssue({
        code: 'custom',
        message: 'At least half of players (rounded up) must start good.',
        path: ['roles', 'good'],
      });
    }
  });
export type Setup = z.infer<typeof setupSchema>;

export interface PublicGame {
  id: string;
  code: string;
  adminUid: string;
  status: 'lobby' | 'active' | 'ended';
  setup: Setup;
  playerIds: string[];
  createdAt: number;
  startedAt?: number;
}
export interface PublicPlayer {
  uid: string;
  displayName: string;
  status: PlayerStatus;
  joinedAt: number;
}
export interface PrivatePlayerData {
  role: RoleId;
  startingTeam: Team;
  currentTeam: Team;
  status: PlayerStatus;
}
export interface Profile {
  displayName: string;
  gameId: string | null;
}
export interface PublicLogEntry {
  type: 'game_started';
  message: string;
  createdAt: number;
}
export type SuspectedRole = RoleId | 'unknown';

export const createGameSchema = z
  .object({ displayName: displayNameSchema, setup: setupSchema })
  .strict();
export const joinGameSchema = z
  .object({ code: gameCodeSchema, displayName: displayNameSchema })
  .strict();
export const gameIdSchema = z.string().uuid();
export const gameActionSchema = z.object({ gameId: gameIdSchema }).strict();
export const updateSetupSchema = gameActionSchema.extend({
  setup: setupSchema,
});
export const renameSchema = z
  .object({ displayName: displayNameSchema })
  .strict();

// Events are separate from presentation/delivery so future push delivery can reuse them.
export interface GameAlert {
  id: string;
  gameId: string;
  type:
    | 'vote_called'
    | 'kill_confirmation_requested'
    | 'kill_disputed'
    | 'disputed_kill_escalated'
    | 'game_ended'
    | 'admin_action_required';
  audience: { kind: 'game' } | { kind: 'player'; uid: string };
  createdAt: number;
}
