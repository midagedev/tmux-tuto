import { expect, test } from '@playwright/test';
import { dismissAnalyticsBanner } from './helpers';

test('onboarding first mission flow completes @smoke', async ({ page }) => {
  await page.goto('/onboarding/start');
  await dismissAnalyticsBanner(page);

  await page.getByRole('button', { name: '온보딩 시작' }).click();
  await page.getByRole('button', { name: '업무용 기초 빨리 익히기' }).click();
  await page.getByRole('button', { name: '입력 선호 설정으로 이동' }).click();
  await page.getByRole('button', { name: '첫 미션 시작' }).click();
  const liveHintCard = page.locator('.onboarding-card').filter({ hasText: '실시간 힌트' });
  await expect(liveHintCard).toContainText('현재 가장 부족한 조건');

  await page.getByRole('button', { name: 'Prefix + % (세로 분할)' }).click();
  await expect(liveHintCard).toContainText('통과 조건을 만족');
  await page.getByRole('button', { name: '제출하고 채점하기' }).click();

  await expect(page).toHaveURL(/\/onboarding\/first-mission\/passed/);
  await page.getByRole('link', { name: '온보딩 완료 화면으로' }).click();
  await expect(page).toHaveURL('/onboarding/done');
});

test('practice pane split click-focus and pane-scroll works @smoke', async ({ page }) => {
  await page.goto('/practice');
  await dismissAnalyticsBanner(page);
  await page.getByRole('button', { name: 'Reset Simulator' }).click();

  await page.getByRole('button', { name: 'Split Vertical' }).click();
  const paneCards = page.locator('.sim-pane-card');
  await expect(paneCards).toHaveCount(2);
  await expect(page.locator('.sim-pane-geometry')).toHaveCount(2);
  await expect(page.locator('.sim-pane-geometry').first()).toContainText(/x:\d+ y:\d+ w:\d+ h:\d+/);

  const targetPane = paneCards.nth(1);
  await targetPane.click();
  await expect(targetPane).toHaveAttribute('data-active', 'true');
  await expect(targetPane.locator('.sim-pane-body')).toHaveClass(/is-active/);

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

test('practice state is restored after page reload @smoke', async ({ page }) => {
  await page.goto('/practice');
  await dismissAnalyticsBanner(page);
  await page.getByRole('button', { name: 'Reset Simulator' }).click();

  await page.getByRole('button', { name: 'Split Vertical' }).click();
  await expect(page.locator('.sim-pane-card')).toHaveCount(2);

  await page.waitForTimeout(500);
  await page.reload();

  const panesSummary = page.locator('.sim-summary p').filter({ hasText: 'Panes:' });
  await expect(panesSummary).toContainText('2');
});

test('practice command-mode overlay flow works @smoke', async ({ page }) => {
  await page.goto('/practice');
  await dismissAnalyticsBanner(page);
  await page.getByRole('button', { name: 'Reset Simulator' }).click();

  const modeIndicator = page.locator('.terminal-mode-indicator');
  await expect(modeIndicator).toContainText('NORMAL');

  await page.getByRole('button', { name: 'Prefix' }).click();
  await page.getByLabel('Manual key input').fill(':');
  await page.getByRole('button', { name: 'Send Key' }).click();

  await expect(modeIndicator).toContainText('COMMAND_MODE');
  await expect(page.locator('.terminal-command-preview')).toContainText('|');

  await page.getByLabel('Command mode input').fill('new-window');
  await page.getByRole('button', { name: 'Run Command' }).click();

  await expect(modeIndicator).toContainText('NORMAL');
  await expect(page.locator('.terminal-window-tab')).toHaveCount(2);
});

test('practice keyboard-only routing works @smoke', async ({ page }) => {
  await page.goto('/practice');
  await dismissAnalyticsBanner(page);
  await page.getByRole('button', { name: 'Reset Simulator' }).click();

  const terminalShell = page.locator('.terminal-shell');
  await terminalShell.focus();

  await page.keyboard.press('Control+b');
  await page.keyboard.press('c');
  await expect(page.locator('.terminal-window-tab')).toHaveCount(2);
  await expect(page.locator('.terminal-window-tab.is-active')).toHaveText('2');

  await page.keyboard.press('Control+b');
  await page.keyboard.press('p');
  await expect(page.locator('.terminal-window-tab.is-active')).toHaveText('1');

  await page.keyboard.press('Control+b');
  await page.keyboard.press('n');
  await expect(page.locator('.terminal-window-tab.is-active')).toHaveText('2');

  await expect(page.locator('.terminal-mode-indicator')).toContainText('NORMAL');
  await expect(page.getByLabel('Simulator live region')).toContainText('Mode NORMAL');
});

test('practice copy-mode search highlights and match navigation works @smoke', async ({ page }) => {
  await page.goto('/practice');
  await dismissAnalyticsBanner(page);
  await page.getByRole('button', { name: 'Reset Simulator' }).click();

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
