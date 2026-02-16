import { z } from 'zod';
import rawMilestones from '../../content/v1/share-meta.json';

export type MilestoneSlug =
  | 'first-chapter-complete'
  | 'track-a-complete'
  | 'track-b-complete'
  | 'track-c-complete'
  | 'streak-7'
  | 'final-complete';

type MilestoneMeta = {
  slug: MilestoneSlug;
  title: string;
  description: string;
  badge: string;
  ogImage: string;
};

const milestoneSchema = z.object({
  slug: z.enum([
    'first-chapter-complete',
    'track-a-complete',
    'track-b-complete',
    'track-c-complete',
    'streak-7',
    'final-complete',
  ]),
  title: z.string().min(1),
  description: z.string().min(1),
  badge: z.string().min(1),
  ogImage: z.string().min(1),
});

const milestones = z.array(milestoneSchema).parse(rawMilestones) as MilestoneMeta[];

const MILESTONE_MAP = Object.fromEntries(
  milestones.map((entry) => [entry.slug, entry]),
) as Record<MilestoneSlug, MilestoneMeta>;

export function getMilestoneMeta(slug: string): MilestoneMeta | null {
  if (slug in MILESTONE_MAP) {
    return MILESTONE_MAP[slug as MilestoneSlug];
  }

  return null;
}

export function listMilestoneSlugs() {
  return milestones.map((entry) => entry.slug);
}

export function isMilestoneSlug(slug: string): slug is MilestoneSlug {
  return slug in MILESTONE_MAP;
}
