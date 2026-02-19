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

  test('practice completion feedback supports queue, esc dismiss, and CTA flow @smoke', async ({ page }) => {
    await page.goto('/practice?lesson=hello-tmux&mission=hello-tmux-version-check');
    await dismissAnalyticsBanner(page);
    await waitForVmReadyForSmoke(page);

    const feedback = page.locator('.vm-celebration').first();

    await sendVmCommand(page, 'tmux command-prompt -p "cmd"');
    await expect(feedback).toBeVisible();
    await expect(feedback).toContainText('명령 흐름 입문');
    await page.keyboard.press('Escape');
    await expect(feedback).toBeHidden();

    await sendVmCommand(page, 'tmux -V');
    await expect(page).toHaveURL(/\/practice\?.*mission=hello-tmux-session-list/);

    await sendVmCommand(page, 'tmux list-sessions');
    const nextLessonButton = page.locator('.vm-next-action-card .vm-next-action-btn').first();
    await expect(nextLessonButton).toBeVisible({ timeout: 20_000 });
    const celebrationOverlay = page.locator('.vm-celebration-overlay');
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const visible = await celebrationOverlay.isVisible().catch(() => false);
      if (!visible) {
        break;
      }
      await page.keyboard.press('Escape');
      await page.waitForTimeout(80);
    }
    await nextLessonButton.click();
    await expect(page).toHaveURL(/\/practice\?.*lesson=basics/);

    await expect
      .poll(async () => {
        const status = await getVmBridgeStatus(page);
        return status.commandHistory.includes('tmux list-sessions');
      })
      .toBe(true);
  });
});
