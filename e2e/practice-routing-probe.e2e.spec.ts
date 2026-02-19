import { expect, test, type Page } from '@playwright/test';
import { dismissAnalyticsBanner, getVmBridgeStatus, sendVmCommand } from './helpers';

const PROBE_COMMAND = '/usr/bin/tmux-tuto-probe >/dev/ttyS1 2>/dev/null';
const RULE_TIMEOUT_MS = 7_000;

async function waitForLessonCatalog(page: Page) {
  await expect
    .poll(async () => page.locator('.vm-lesson-row').count(), {
      timeout: RULE_TIMEOUT_MS,
    })
    .toBeGreaterThan(0);
}

async function activeLessonText(page: Page) {
  return (await page.locator('.vm-lesson-row.is-active').first().innerText()).trim();
}

async function activeMissionText(page: Page) {
  return (await page.locator('.vm-mission-row.is-active').first().innerText()).trim();
}

async function currentPracticeQuery(page: Page) {
  return page.evaluate(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      lesson: params.get('lesson'),
      mission: params.get('mission'),
    };
  });
}

async function triggerProbeFromTerminal(page: Page) {
  const terminalInput = page.locator('.xterm textarea').first();
  await expect(terminalInput).toBeAttached({ timeout: RULE_TIMEOUT_MS });
  await terminalInput.focus();
  await page.keyboard.type(PROBE_COMMAND);
  await page.keyboard.press('Enter');
}

async function waitForVmBridgeReady(page: Page) {
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
}

async function waitForProbeMetricsReady(page: Page) {
  for (let index = 0; index < 120; index += 1) {
    await triggerProbeFromTerminal(page);
    const status = await getVmBridgeStatus(page);
    if (status.metrics.sessionCount !== null) {
      return;
    }
    await page.waitForTimeout(500);
  }
  throw new Error('probe metrics did not initialize');
}

async function completedMissions(page: Page) {
  return page.evaluate(async () => {
    const { useProgressStore } = await import('/src/features/progress/progressStore.ts');
    return useProgressStore.getState().completedMissionSlugs;
  });
}

test.describe('practice routing + probe', () => {
  test('mission query only should resolve lesson and keep mission active', async ({ page }) => {
    await page.goto('/practice?lang=ko&mission=hello-tmux-session-list');
    await dismissAnalyticsBanner(page);
    await waitForLessonCatalog(page);

    await expect.poll(async () => activeLessonText(page), { timeout: RULE_TIMEOUT_MS }).toContain('첫 3분: tmux 맛보기');
    await expect.poll(async () => activeMissionText(page), { timeout: RULE_TIMEOUT_MS }).toContain('세션 상태 한 번 확인');

    await expect
      .poll(async () => currentPracticeQuery(page), {
        timeout: RULE_TIMEOUT_MS,
      })
      .toEqual({
        lesson: 'hello-tmux',
        mission: 'hello-tmux-session-list',
      });
  });

  test('mission query should win when lesson and mission mismatch', async ({ page }) => {
    await page.goto('/practice?lang=ko&lesson=basics&mission=hello-tmux-session-list');
    await dismissAnalyticsBanner(page);
    await waitForLessonCatalog(page);

    await expect.poll(async () => activeLessonText(page), { timeout: RULE_TIMEOUT_MS }).toContain('첫 3분: tmux 맛보기');
    await expect.poll(async () => activeMissionText(page), { timeout: RULE_TIMEOUT_MS }).toContain('세션 상태 한 번 확인');

    await expect
      .poll(async () => currentPracticeQuery(page), {
        timeout: RULE_TIMEOUT_MS,
      })
      .toEqual({
        lesson: 'hello-tmux',
        mission: 'hello-tmux-session-list',
      });
  });

  test('invalid mission should fall back to selected lesson default mission', async ({ page }) => {
    await page.goto('/practice?lang=ko&lesson=basics&mission=does-not-exist');
    await dismissAnalyticsBanner(page);
    await waitForLessonCatalog(page);

    await expect.poll(async () => activeLessonText(page), { timeout: RULE_TIMEOUT_MS }).toContain('기본 조작: Session/Window/Pane');
    await expect.poll(async () => activeMissionText(page), { timeout: RULE_TIMEOUT_MS }).toContain('첫 세션 만들기');

    await expect
      .poll(async () => currentPracticeQuery(page), {
        timeout: RULE_TIMEOUT_MS,
      })
      .toEqual({
        lesson: 'basics',
        mission: 'session-create',
      });
  });

  test('first mission completion auto-advances and second mission completion is detected', async ({ page }) => {
    test.setTimeout(120_000);

    await page.goto('/practice?lang=ko&lesson=hello-tmux&mission=hello-tmux-version-check');
    await dismissAnalyticsBanner(page);
    await waitForVmBridgeReady(page);

    await waitForProbeMetricsReady(page);

    await sendVmCommand(page, 'tmux -V');
    await expect
      .poll(
        async () => {
          const missions = await completedMissions(page);
          return missions.includes('hello-tmux-version-check');
        },
        { timeout: RULE_TIMEOUT_MS },
      )
      .toBe(true);

    await expect
      .poll(async () => (await currentPracticeQuery(page)).mission, {
        timeout: RULE_TIMEOUT_MS,
      })
      .toBe('hello-tmux-session-list');

    await sendVmCommand(page, 'tmux list-sessions');
    await expect
      .poll(
        async () => {
          const missions = await completedMissions(page);
          return missions.includes('hello-tmux-session-list');
        },
        { timeout: RULE_TIMEOUT_MS },
      )
      .toBe(true);
  });
});
