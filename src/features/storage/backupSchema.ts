import { z } from 'zod';

const profileSchema = z.object({
  id: z.literal('me'),
  nickname: z.string(),
  keymap: z.enum(['C-b', 'C-a']),
  locale: z.string(),
  updatedAt: z.string(),
});

const progressSchema = z.object({
  lessonId: z.string(),
  status: z.enum(['not_started', 'in_progress', 'completed']),
  bestScore: z.number(),
  completedMissions: z.array(z.string()),
  updatedAt: z.string(),
});

const missionAttemptSchema = z.object({
  id: z.number().optional(),
  missionSlug: z.string(),
  result: z.enum(['pass', 'fail']),
  score: z.number(),
  durationMs: z.number(),
  hintLevel: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  feedback: z.string(),
  createdAt: z.string(),
});

const bookmarkSchema = z.object({
  id: z.string(),
  type: z.enum(['lesson', 'mission', 'cheatsheet_item', 'action_pattern', 'playbook']),
  targetId: z.string(),
  title: z.string(),
  tags: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const noteSchema = z.object({
  id: z.string(),
  bookmarkId: z.string(),
  markdown: z.string(),
  updatedAt: z.string(),
});

const achievementSchema = z.object({
  id: z.string(),
  unlockedAt: z.string(),
  metadata: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .optional(),
});

const snapshotSchema = z.object({
  id: z.string(),
  mode: z.enum(['NORMAL', 'PREFIX_PENDING', 'COMMAND_MODE', 'COPY_MODE', 'SEARCH_MODE']),
  sessionGraph: z.record(z.string(), z.unknown()),
  savedAt: z.string(),
});

const backupMetaSchema = z.object({
  key: z.string(),
  value: z.string(),
  updatedAt: z.string(),
});

export const backupPayloadSchema = z.object({
  backup_format_version: z.literal(1),
  exported_at: z.string(),
  app_version: z.string(),
  stores: z.object({
    profile: z.array(profileSchema),
    progress: z.array(progressSchema),
    mission_attempts: z.array(missionAttemptSchema),
    bookmarks: z.array(bookmarkSchema),
    notes: z.array(noteSchema),
    achievements: z.array(achievementSchema),
    simulator_snapshots: z.array(snapshotSchema),
    backup_meta: z.array(backupMetaSchema),
  }),
});

export type BackupPayload = z.infer<typeof backupPayloadSchema>;
