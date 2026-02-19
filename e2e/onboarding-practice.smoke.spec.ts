import { expect, test, type Page } from '@playwright/test';
import {
  dismissAnalyticsBanner,
  getVmBridgeStatus,
  sendVmCommand,
} from './helpers';

async function waitForVmReadyForSmoke(page: Page) {
  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          const bridge = (window as Window & {
            __tmuxwebVmBridge?: {
              isReady: () => boolean;
            };
          }).__tmuxwebVmBridge;
          return Boolean(bridge?.isReady());
        }),
      { timeout: 120_000 },
    )
    .toBe(true);

  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          const bridge = (window as Window & {
            __tmuxwebVmBridge?: {
              sendProbe: () => void;
              getStatus: () => {
                metrics: {
                  sessionCount: number | null;
                };
              };
            };
          }).__tmuxwebVmBridge;

          if (!bridge) {
            return false;
          }

          const status = bridge.getStatus();
          if (status.metrics.sessionCount !== null) {
            return true;
          }
          bridge.sendProbe();
          return false;
        }),
      { timeout: 30_000 },
    )
    .toBe(true);
}

test.describe('vm practice smoke', () => {
  test.setTimeout(120_000);

  test('learn entry opens practice with lesson context @smoke', async ({ page }) => {
    await page.goto('/learn');
    await dismissAnalyticsBanner(page);

    const entryLink = page.locator('main a[href="/practice?lesson=hello-tmux"]').first();
    await expect(entryLink).toBeVisible();
    await entryLink.click();

    await expect(page).toHaveURL(/\/practice\?.*lesson=hello-tmux/);
    await expect(page.locator('.vm-lesson-row.is-active')).toHaveCount(1);
    await expect(page.locator('.vm-mission-row.is-active')).toHaveCount(1);
  });

  test('practice keeps flow focused with inline achievement feed and mission/lesson navigator @smoke', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
    await page.goto('/practice?lesson=hello-tmux&mission=hello-tmux-version-check');
    await dismissAnalyticsBanner(page);
    await waitForVmReadyForSmoke(page);

    await sendVmCommand(page, 'tmux command-prompt -p "cmd"');
    await expect(page.locator('.vm-achievement-feed-card')).toBeVisible();
    await expect(page.locator('.vm-achievement-feed-card')).toContainText('명령 흐름 입문');
    await expect(page.locator('.vm-achievement-feed-item').first()).toBeVisible({ timeout: 10_000 });
    const unreadAchievementBadge = page.locator('.vm-achievement-feed-card button', { hasText: /새 업적 \d+/ });
    if ((await unreadAchievementBadge.count()) > 0) {
      await expect(unreadAchievementBadge.first()).toBeVisible();
    }
    await expect(page.locator('.vm-celebration-overlay')).toHaveCount(0);

    await sendVmCommand(page, 'tmux -V');
    await expect(page).toHaveURL(/\/practice\?.*mission=hello-tmux-session-list/);

    const missionNav = page.locator('.vm-learning-nav-card').first();
    await expect(missionNav).toBeVisible();
    await missionNav.getByRole('button', { name: '이전 미션' }).click();
    await expect(page).toHaveURL(/\/practice\?.*mission=hello-tmux-version-check/);
    const nextMissionButton = missionNav.getByRole('button', { name: '다음 미션' });
    await expect(nextMissionButton).toBeEnabled();
    await nextMissionButton.click();
    await expect(page).toHaveURL(/\/practice\?.*mission=hello-tmux-session-list/);

    await sendVmCommand(page, 'tmux list-sessions');
    const nextLessonButton = page.locator('.vm-next-action-card .vm-next-action-btn').first();
    await expect(nextLessonButton).toBeVisible({ timeout: 20_000 });
    await nextLessonButton.click();
    await expect(page).toHaveURL(/\/practice\?.*lesson=basics/);
    await expect(page.locator('.vm-learning-nav-card button', { hasText: '이전 레슨' }).first()).toBeVisible();

    await expect
      .poll(async () => {
        const status = await getVmBridgeStatus(page);
        return status.commandHistory.includes('tmux list-sessions');
      })
      .toBe(true);
  });
});
