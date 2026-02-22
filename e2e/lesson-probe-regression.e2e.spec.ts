import { expect, test, type Page } from '@playwright/test';
import {
  dismissAnalyticsBanner,
  getVmBridgeStatus,
  injectVmActionHistory,
  injectVmCommandHistory,
  injectVmProbeState,
  setVmAutoProbe,
  waitForVmReady,
} from './helpers';

const RULE_TIMEOUT_MS = 6_000;

async function resetProgress(page: Page) {
  await page.evaluate(async () => {
    const { createInitialProgressSnapshot, useProgressStore, PROGRESS_PERSIST_KEY } = await import(
      '/src/features/progress/progressStore.ts'
    );
    useProgressStore.setState(createInitialProgressSnapshot());
    window.localStorage.removeItem(PROGRESS_PERSIST_KEY);
  });
}

async function isMissionCompleted(page: Page, missionSlug: string) {
  return page.evaluate(async (slug) => {
    const { useProgressStore } = await import('/src/features/progress/progressStore.ts');
    return useProgressStore.getState().completedMissionSlugs.includes(slug);
  }, missionSlug);
}

test.describe('lesson probe bridge regression e2e', () => {
  test.describe.configure({ mode: 'serial' });

  test('injectProbeState updates VM metrics snapshot', async ({ page }) => {
    await page.goto('/practice?lang=ko&lesson=hello-tmux&mission=hello-tmux-version-check');
    await dismissAnalyticsBanner(page);
    await waitForVmReady(page, { timeout: 120_000 });
    await setVmAutoProbe(page, false);

    await injectVmProbeState(page, {
      tmux: 1,
      session: 2,
      window: 3,
      pane: 4,
      mode: 1,
      sessionName: 'work',
      windowName: 'dev',
      activeWindow: 2,
      layout: 'abcd,100x30,0,0,0',
      zoomed: 1,
      sync: 1,
      search: 1,
      searchMatched: 1,
    });

    await expect
      .poll(
        async () => {
          const status = await getVmBridgeStatus(page);
          return status.metrics;
        },
        { timeout: RULE_TIMEOUT_MS },
      )
      .toMatchObject({
        sessionCount: 2,
        windowCount: 3,
        paneCount: 4,
        modeIs: 'COPY_MODE',
        sessionName: 'work',
        windowName: 'dev',
        activeWindowIndex: 2,
        windowLayout: 'abcd,100x30,0,0,0',
        windowZoomed: true,
        paneSynchronized: true,
        searchExecuted: true,
        searchMatchFound: true,
      });
  });

  test('injectCommandHistory can complete shell-history mission rule', async ({ page }) => {
    await page.goto('/practice?lang=ko&lesson=hello-tmux&mission=hello-tmux-version-check');
    await dismissAnalyticsBanner(page);
    await waitForVmReady(page, { timeout: 120_000 });
    await setVmAutoProbe(page, false);
    await resetProgress(page);

    await injectVmCommandHistory(page, 'tmux -V');

    await expect
      .poll(async () => isMissionCompleted(page, 'hello-tmux-version-check'), {
        timeout: RULE_TIMEOUT_MS,
        message: 'hello-tmux-version-check should complete by command history injection',
      })
      .toBe(true);
  });

  test('injectActionHistory appends shortcut telemetry entry', async ({ page }) => {
    await page.goto('/practice?lang=ko&lesson=basics-shortcuts&mission=session-create-shortcuts');
    await dismissAnalyticsBanner(page);
    await waitForVmReady(page, { timeout: 120_000 });
    await setVmAutoProbe(page, false);

    await injectVmActionHistory(page, 'sim.shortcut.execute');

    await expect
      .poll(async () => (await getVmBridgeStatus(page)).actionHistory.includes('sim.shortcut.execute'), {
        timeout: RULE_TIMEOUT_MS,
        message: 'action history should include injected shortcut telemetry',
      })
      .toBe(true);
  });
});
