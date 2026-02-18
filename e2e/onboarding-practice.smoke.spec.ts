import { expect, test } from '@playwright/test';
import {
  dismissAnalyticsBanner,
  getVmBridgeStatus,
  sendVmCommand,
  waitForVmReady,
} from './helpers';

test.describe('vm practice smoke', () => {
  test.setTimeout(120_000);

  test('learn entry opens practice with lesson context @smoke', async ({ page }) => {
    await page.goto('/learn');
    await dismissAnalyticsBanner(page);

    await page.getByRole('link', { name: '초급 실습 바로 시작' }).click();

    await expect(page).toHaveURL(/\/practice\?.*lesson=hello-tmux/);
    await expect(page.locator('.vm-lesson-row.is-active')).toContainText('첫 3분: tmux 맛보기');
    await expect(page.locator('.vm-mission-row.is-active')).toBeVisible();
  });

  test('practice completion feedback supports queue, esc dismiss, and CTA flow @smoke', async ({ page }) => {
    await page.goto('/practice?lesson=hello-tmux&mission=hello-tmux-version-check');
    await dismissAnalyticsBanner(page);
    await waitForVmReady(page);

    const feedback = page.getByRole('dialog', { name: '완료 피드백' });

    await sendVmCommand(page, 'tmux command-prompt -p "cmd"');
    await expect(feedback).toContainText('업적 달성: 명령 흐름 입문');
    await page.keyboard.press('Escape');
    await expect(feedback).toBeHidden();

    await sendVmCommand(page, 'tmux -V');
    await expect(feedback).toContainText('미션 완료: tmux 명령 첫 실행');
    await feedback.getByRole('button', { name: '다음 미션' }).click();
    await expect(page).toHaveURL(/\/practice\?.*mission=hello-tmux-session-list/);

    await sendVmCommand(page, 'tmux list-sessions');
    await expect(feedback).toContainText('미션 완료: 세션 상태 한 번 확인');
    await page.keyboard.press('Escape');
    await expect(feedback).toContainText('레슨 완료: 첫 3분: tmux 맛보기');
    await feedback.getByRole('button', { name: '다음 레슨' }).click();
    await expect(page).toHaveURL(/\/practice\?.*lesson=basics/);

    await expect
      .poll(async () => {
        const status = await getVmBridgeStatus(page);
        return status.commandHistory.includes('tmux list-sessions');
      })
      .toBe(true);
  });
});
