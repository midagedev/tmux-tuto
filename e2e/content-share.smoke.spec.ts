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

test('cheatsheet playbook item can jump to quick practice preset @smoke', async ({ page }) => {
  await page.goto('/cheatsheet');
  await dismissAnalyticsBanner(page);

  await page.getByLabel('Cheatsheet search').fill('tmux.conf');
  const recommendedConfigItem = page.locator('li').filter({ hasText: '권장 tmux.conf' }).first();
  await recommendedConfigItem.getByRole('link', { name: '바로 실습' }).click();

  await expect(page).toHaveURL('/practice');
  const configSummary = page.locator('.sim-summary p').filter({ hasText: 'Config:' });
  await expect(configSummary).toContainText('mode-keys vi');
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

test('bookmark snapshot deep-link restores simulator state @smoke', async ({ page }) => {
  await page.goto('/practice');
  await dismissAnalyticsBanner(page);

  await page.getByRole('button', { name: 'Split Vertical' }).click();
  await page.getByRole('button', { name: 'Save Snapshot' }).click();

  const snapshotId = await page.evaluate(async () => {
    const openRequest = indexedDB.open('tmux_tuto');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      openRequest.onsuccess = () => resolve(openRequest.result);
      openRequest.onerror = () => reject(openRequest.error);
    });

    const tx = db.transaction('simulator_snapshots', 'readonly');
    const store = tx.objectStore('simulator_snapshots');
    const allRequest = store.getAll();
    const snapshots = await new Promise<Array<{ id: string; savedAt: string }>>((resolve, reject) => {
      allRequest.onsuccess = () => resolve(allRequest.result as Array<{ id: string; savedAt: string }>);
      allRequest.onerror = () => reject(allRequest.error);
    });
    db.close();

    snapshots.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
    return snapshots[0]?.id ?? null;
  });

  expect(snapshotId).toBeTruthy();

  await page.goto('/bookmarks');
  await page.getByLabel('Bookmark title').fill('e2e snapshot bookmark');
  await page.getByLabel('Bookmark target id').fill(snapshotId ?? '');
  await page.locator('form.bookmark-form select').selectOption('snapshot');
  await page.getByLabel('Bookmark tags').fill('snapshot,e2e');
  await page.getByRole('button', { name: '북마크 저장' }).click();

  const snapshotRow = page.locator('li').filter({ hasText: 'e2e snapshot bookmark' }).first();
  await snapshotRow.getByRole('link', { name: '실습 열기' }).click();

  await expect(page).toHaveURL('/practice');
  const panesSummary = page.locator('.sim-summary p').filter({ hasText: 'Panes:' });
  await expect(panesSummary).toContainText('2');
});

test('bookmark lesson deep-link restores lesson default scenario @smoke', async ({ page }) => {
  await page.goto('/bookmarks');
  await dismissAnalyticsBanner(page);

  await page.getByLabel('Bookmark title').fill('e2e lesson bookmark');
  await page.getByLabel('Bookmark target id').fill('copy-search');
  await page.locator('form.bookmark-form select').selectOption('lesson');
  await page.getByLabel('Bookmark tags').fill('lesson,e2e');
  await page.getByRole('button', { name: '북마크 저장' }).click();

  const lessonRow = page.locator('li').filter({ hasText: 'e2e lesson bookmark' }).first();
  await lessonRow.getByRole('link', { name: '실습 열기' }).click();

  await expect(page).toHaveURL('/practice');
  await expect(page.locator('.sim-log')).toContainText('sim.scenario.mission.copy-mode-search-keyword');
});

test('recovery flow falls back from latest snapshot to lesson default @smoke', async ({ page }) => {
  await page.goto('/practice');
  await dismissAnalyticsBanner(page);
  await page.getByRole('button', { name: 'Reset Simulator' }).click();
  await page.waitForTimeout(500);

  await page.evaluate(async () => {
    const openRequest = indexedDB.open('tmux_tuto');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      openRequest.onsuccess = () => resolve(openRequest.result);
      openRequest.onerror = () => reject(openRequest.error);
    });
    const tx = db.transaction('simulator_snapshots', 'readwrite');
    tx.objectStore('simulator_snapshots').clear();
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    db.close();
  });

  await page.getByLabel('Recovery source').selectOption('latest');
  await page.getByLabel('Recovery lesson slug').fill('copy-search');
  await page.getByRole('button', { name: 'Run Recovery' }).click();

  await expect(page.locator('.sim-log')).toContainText('sim.scenario.mission.copy-mode-search-keyword');
});

test('recovery flow falls back to reset when lesson default restore fails @smoke', async ({ page }) => {
  await page.goto('/practice');
  await dismissAnalyticsBanner(page);
  await page.getByRole('button', { name: 'Reset Simulator' }).click();

  await page.getByRole('button', { name: 'Split Vertical' }).click();
  const panesSummary = page.locator('.sim-summary p').filter({ hasText: 'Panes:' });
  await expect(panesSummary).toContainText('2');

  await page.getByLabel('Recovery source').selectOption('lesson-default');
  await page.getByLabel('Recovery lesson slug').fill('lesson-not-found');
  await page.getByRole('button', { name: 'Run Recovery' }).click();

  await expect(panesSummary).toContainText('1');
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
