import { z } from 'zod';

const trackSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  summary: z.string(),
  order: z.number().int(),
  status: z.enum(['active', 'preview']),
});

const chapterSchema = z.object({
  id: z.string(),
  trackSlug: z.string(),
  slug: z.string(),
  title: z.string(),
  order: z.number().int(),
});

const lessonSchema = z.object({
  id: z.string(),
  trackSlug: z.string(),
  chapterSlug: z.string(),
  slug: z.string(),
  title: z.string(),
  estimatedMinutes: z.number().int(),
  objectives: z.array(z.string()),
  overview: z.string().optional(),
  goal: z.string().optional(),
  successCriteria: z.array(z.string()).optional(),
});

const learningJourneySchema = z.object({
  title: z.string(),
  intro: z.string(),
  targetOutcome: z.string(),
  principles: z.array(z.string()),
});

const missionRuleSchema = z.object({
  kind: z.string(),
  operator: z.string(),
  value: z.unknown(),
});

const missionSchema = z.object({
  id: z.string(),
  lessonSlug: z.string(),
  slug: z.string(),
  title: z.string(),
  type: z.literal('state-check'),
  difficulty: z.enum(['beginner', 'daily', 'advanced', 'scenario']),
  initialScenario: z.string(),
  passRules: z.array(missionRuleSchema),
  hints: z.array(z.string()),
});

const playbookStepSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  command: z.string().optional(),
});

const playbookTroubleshootingSchema = z.object({
  issue: z.string(),
  resolution: z.string(),
});

const playbookSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  category: z.string(),
  estimatedMinutes: z.number().int(),
  prerequisites: z.array(z.string()),
  steps: z.array(playbookStepSchema),
  verification: z.array(z.string()),
  troubleshooting: z.array(playbookTroubleshootingSchema),
});

export const appContentSchema = z.object({
  version: z.string(),
  generatedAt: z.string(),
  learningJourney: learningJourneySchema.optional(),
  tracks: z.array(trackSchema),
  chapters: z.array(chapterSchema),
  lessons: z.array(lessonSchema),
  missions: z.array(missionSchema),
  playbooks: z.array(playbookSchema),
});

export type AppContent = z.infer<typeof appContentSchema>;
export type AppTrack = z.infer<typeof trackSchema>;
export type AppChapter = z.infer<typeof chapterSchema>;
export type AppLesson = z.infer<typeof lessonSchema>;
export type AppMission = z.infer<typeof missionSchema>;
export type AppPlaybook = z.infer<typeof playbookSchema>;

export function parseContent(raw: unknown) {
  return appContentSchema.parse(raw);
}
