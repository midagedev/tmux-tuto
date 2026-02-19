import { expect, test, type Page } from '@playwright/test';
import { dismissAnalyticsBanner } from './helpers';

async function unlockFirstChapterMilestone(page: Page) {
  await page.evaluate(async () => {
    const [{ loadAppContent }, { useProgressStore }] = await Promise.all([
      import('/src/features/curriculum/contentLoader.ts'),
      import('/src/features/progress/progressStore.ts'),
    ]);

    const content = await loadAppContent();
    const lessonBySlug = new Map(content.lessons.map((lesson) => [lesson.slug, lesson]));

    const firstTrackAChapter = content.chapters
      .filter((chapter) => chapter.trackSlug === 'track-a-foundations')
      .sort((left, right) => left.order - right.order)[0];

    if (!firstTrackAChapter) {
      throw new Error('track-a first chapter not found');
    }

    const firstChapterMissions = content.missions.filter(
      (mission) => lessonBySlug.get(mission.lessonSlug)?.chapterSlug === firstTrackAChapter.slug,
    );

    const recordMissionPass = useProgressStore.getState().recordMissionPass;

    firstChapterMissions.forEach((mission, index) => {
      recordMissionPass({
        missionSlug: mission.slug,
        difficulty: mission.difficulty,
        hintLevel: 0,
        attemptNumber: 1,
        nowIso: `2026-02-${String(index + 1).padStart(2, '0')}T09:00:00.000Z`,
        completedTrackSlugs: [],
      });
    });
  });
}

test('progress milestone link opens share preview page @smoke', async ({ page }) => {
  await page.goto('/progress');
  await dismissAnalyticsBanner(page);

  await unlockFirstChapterMilestone(page);

  const shareLink = page.locator('main a[href*="/share/first-chapter-complete"]').first();
  await expect(shareLink).toBeVisible();
  await shareLink.click();

  await expect(page).toHaveURL(/\/share\/first-chapter-complete/);
  await expect(page.locator('.share-preview-card')).toBeVisible();
  await expect(page.locator('.share-preview-card .page-eyebrow')).toBeVisible();
});
