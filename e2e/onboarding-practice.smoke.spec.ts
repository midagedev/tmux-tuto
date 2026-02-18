import { expect, test } from '@playwright/test';
import { dismissAnalyticsBanner } from './helpers';

test('onboarding first mission flow completes @smoke', async ({ page }) => {
  await page.goto('/onboarding/start');
  await dismissAnalyticsBanner(page);

  await page.getByRole('button', { name: '온보딩 시작' }).click();
  await page.getByRole('button', { name: '업무용 기초 빨리 익히기' }).click();
  await page.getByRole('button', { name: '입력 선호 설정으로 이동' }).click();
  await page.getByRole('button', { name: '첫 미션 시작' }).click();

  await page.getByRole('button', { name: 'Prefix + % (세로 분할)' }).click();
  await page.getByRole('button', { name: '제출하고 채점하기' }).click();

  await expect(page).toHaveURL(/\/onboarding\/first-mission\/passed/);
  await page.getByRole('link', { name: '온보딩 완료 화면으로' }).click();
  await expect(page).toHaveURL('/onboarding/done');
});

test('practice pane split click-focus and pane-scroll works @smoke', async ({ page }) => {
  await page.goto('/practice');
  await dismissAnalyticsBanner(page);

  await page.getByRole('button', { name: 'Split Vertical' }).click();
  const paneCards = page.locator('.sim-pane-card');
  await expect(paneCards).toHaveCount(2);

  const targetPane = paneCards.nth(1);
  await targetPane.click();
  await expect(targetPane).toHaveAttribute('data-active', 'true');

  const commandInput = page.getByLabel('Command mode input');
  const runCommandButton = page.getByRole('button', { name: 'Run Command' });
  for (let index = 0; index < 3; index += 1) {
    await commandInput.fill('cat logs/app.log');
    await runCommandButton.click();
  }

  const scrollInfo = targetPane.locator('.sim-pane-foot');
  const beforeScroll = Number((await scrollInfo.getAttribute('data-scroll-top')) ?? '0');
  await targetPane.dispatchEvent('wheel', { deltaY: -300 });

  await expect
    .poll(async () => Number((await scrollInfo.getAttribute('data-scroll-top')) ?? '0'))
    .toBeLessThan(beforeScroll);

  const panesSummary = page.locator('.sim-summary p').filter({ hasText: 'Panes:' });
  await expect(panesSummary).toContainText('2');
  await expect(page.getByText('Action History')).toBeVisible();
});

test('practice copy-mode search highlights and match navigation works @smoke', async ({ page }) => {
  await page.goto('/practice');
  await dismissAnalyticsBanner(page);

  const commandInput = page.getByLabel('Command mode input');
  const runCommandButton = page.getByRole('button', { name: 'Run Command' });
  for (let index = 0; index < 2; index += 1) {
    await commandInput.fill('cat logs/app.log');
    await runCommandButton.click();
  }

  await page.getByRole('button', { name: 'Enter Copy Mode' }).click();
  await page.getByLabel('Copy mode search query').fill('error');
  await page.getByRole('button', { name: 'Run Search' }).click();

  const copyModePanel = page.locator('.sim-log').getByText(/active:/);
  await expect(copyModePanel).toContainText('active: 1');
  await expect(page.locator('.sim-pane-line.is-match').first()).toBeVisible();

  await page.getByLabel('Manual key input').fill('n');
  await page.getByRole('button', { name: 'Send Key' }).click();
  await expect(copyModePanel).toContainText('active: 2');
});
