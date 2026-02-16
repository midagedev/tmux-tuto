import { expect, test } from '@playwright/test';
import { dismissAnalyticsBanner } from './helpers';

test('cheatsheet search can jump to quick practice @smoke', async ({ page }) => {
  await page.goto('/cheatsheet');
  await dismissAnalyticsBanner(page);

  await page.getByLabel('Cheatsheet search').fill('split');
  await page.getByRole('link', { name: '바로 실습' }).first().click();

  await expect(page).toHaveURL('/practice');
  const panesSummary = page.locator('.sim-summary p').filter({ hasText: 'Panes:' });
  await expect(panesSummary).toContainText('2');
});

test('bookmark persists after page reload @smoke', async ({ page }) => {
  await page.goto('/bookmarks');
  await dismissAnalyticsBanner(page);

  await page.getByLabel('Bookmark title').fill('e2e bookmark');
  await page.getByLabel('Bookmark target id').fill('mission-e2e');
  await page.getByLabel('Bookmark tags').fill('e2e,smoke');
  await page.getByRole('button', { name: '북마크 저장' }).click();

  await expect(page.getByText('e2e bookmark')).toBeVisible();

  await page.reload();
  await expect(page.getByText('e2e bookmark')).toBeVisible();
});

test('milestone share page can be opened from progress @smoke', async ({ page }) => {
  await page.goto('/progress');
  await dismissAnalyticsBanner(page);

  page.on('dialog', async (dialog) => {
    await dialog.accept();
  });

  await page.getByRole('button', { name: '샘플 통과 처리' }).first().click();

  await page.getByRole('link', { name: /공유 페이지 열기/ }).first().click();
  await expect(page).toHaveURL(/\/share\//);
  await expect(page.getByText('Preview')).toBeVisible();
});
