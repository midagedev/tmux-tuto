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
  type: z.enum(['lesson', 'mission', 'cheatsheet_item', 'action_pattern', 'playbook', 'snapshot']),
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
  schemaVersion: z.literal(2),
  mode: z.enum(['NORMAL', 'PREFIX_PENDING', 'COMMAND_MODE', 'COPY_MODE', 'SEARCH_MODE']),
  sessionGraph: z.object({
    schemaVersion: z.literal(2),
    simulatorState: z.unknown(),
  }),
  savedAt: z.string(),
});

const backupMetaSchema = z.object({
  key: z.string(),
  value: z.string(),
  updatedAt: z.string(),
});

const storesSchema = z.object({
  profile: z.array(profileSchema),
  progress: z.array(progressSchema),
  mission_attempts: z.array(missionAttemptSchema),
  bookmarks: z.array(bookmarkSchema),
  notes: z.array(noteSchema),
  achievements: z.array(achievementSchema),
  simulator_snapshots: z.array(snapshotSchema),
  backup_meta: z.array(backupMetaSchema),
});

const simulatorDefaultsSchema = z.object({
  latestSnapshotId: z.string().nullable(),
  snapshotSchemaVersion: z.literal(2),
});

export const backupPayloadV1Schema = z.object({
  backup_format_version: z.literal(1),
  exported_at: z.string(),
  app_version: z.string(),
  stores: storesSchema,
});

export const backupPayloadSchema = z.object({
  backup_format_version: z.literal(2),
  exported_at: z.string(),
  app_version: z.string(),
  simulator_defaults: simulatorDefaultsSchema,
  stores: storesSchema,
});

export type BackupPayload = z.infer<typeof backupPayloadSchema>;
export type BackupPayloadV1 = z.infer<typeof backupPayloadV1Schema>;

export function normalizeBackupPayload(rawPayload: unknown): BackupPayload {
  const parsedV2 = backupPayloadSchema.safeParse(rawPayload);
  if (parsedV2.success) {
    return parsedV2.data;
  }

  const parsedV1 = backupPayloadV1Schema.parse(rawPayload);
  const sortedSnapshots = [...parsedV1.stores.simulator_snapshots].sort((a, b) =>
    b.savedAt.localeCompare(a.savedAt),
  );

  return {
    backup_format_version: 2,
    exported_at: parsedV1.exported_at,
    app_version: parsedV1.app_version,
    simulator_defaults: {
      latestSnapshotId: sortedSnapshots[0]?.id ?? null,
      snapshotSchemaVersion: 2,
    },
    stores: parsedV1.stores,
  };
}
