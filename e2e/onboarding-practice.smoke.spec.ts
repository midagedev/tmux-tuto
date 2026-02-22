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

    const entryLink = page.locator('main a[href="/practice/hello-tmux"]').first();
    await expect(entryLink).toBeVisible();
    await entryLink.click();

    await expect(page).toHaveURL(/\/practice\/hello-tmux/);
    await expect(page.locator('.vm-lesson-row.is-active')).toHaveCount(1);
    await expect(page.locator('.vm-mission-row.is-active')).toHaveCount(1);
  });

  test('practice mission completion keeps flow without completion dialog @smoke', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
    await page.goto('/practice/hello-tmux?mission=hello-tmux-version-check');
    await dismissAnalyticsBanner(page);
    await waitForVmReadyForSmoke(page);

    const completionDialog = page.getByRole('dialog', { name: /완료 피드백|Completion Feedback/ });

    await sendVmCommand(page, 'tmux command-prompt -p "cmd"');
    await expect(completionDialog).toHaveCount(0);

    await sendVmCommand(page, 'tmux -V');
    await expect(page.locator('.vm-mission-row.is-active .vm-mission-row-badge.is-complete')).toBeVisible();
    await page.getByRole('button', { name: /다음 미션|Next mission/ }).first().click();
    await expect(page).toHaveURL(/\/practice\/hello-tmux\?.*mission=hello-tmux-session-list/);

    await sendVmCommand(page, 'tmux list-sessions');
    await expect(page.locator('.vm-mission-row.is-active .vm-mission-row-badge.is-complete')).toBeVisible();
    await page.getByRole('button', { name: /다음 레슨|Next lesson/ }).first().click();
    await expect(page).toHaveURL(/\/practice\/basics/);

    await expect
      .poll(async () => {
        const status = await getVmBridgeStatus(page);
        return status.commandHistory.includes('tmux list-sessions');
      })
      .toBe(true);

    await expect(completionDialog).toHaveCount(0);
  });
});
