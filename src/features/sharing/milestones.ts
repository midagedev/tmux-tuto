import { z } from 'zod';
import milestonesEn from '../../content/v1/i18n/en/share-meta.json';
import milestonesKo from '../../content/v1/i18n/ko/share-meta.json';
import milestonesJa from '../../content/v1/i18n/ja/share-meta.json';
import milestonesZh from '../../content/v1/i18n/zh/share-meta.json';
import { resolveLanguageFromRuntime } from '../../i18n/runtime';
export type MilestoneSlug = 'first-chapter-complete' | 'track-a-complete' | 'track-b-complete' | 'track-c-complete' | 'streak-7' | 'final-complete';
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
const milestonesByLanguage = {
    en: milestonesEn,
    ko: milestonesKo,
    ja: milestonesJa,
    zh: milestonesZh,
} as const;
const milestones = z
    .array(milestoneSchema)
    .parse(milestonesByLanguage[resolveLanguageFromRuntime()] ?? milestonesByLanguage.en) as MilestoneMeta[];
const MILESTONE_MAP = Object.fromEntries(milestones.map((entry) => [entry.slug, entry])) as Record<MilestoneSlug, MilestoneMeta>;
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
