import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import {
  dismissAnalyticsBanner,
  getVmBridgeStatus,
  injectVmActionHistory,
  injectVmCommandHistory,
  injectVmProbeState,
  type VmProbeStateInput,
} from './helpers';

type MissionRule = {
  kind: string;
  operator: string;
  value: unknown;
};

type Mission = {
  slug: string;
  title: string;
  lessonSlug: string;
  passRules: MissionRule[];
};

type Lesson = {
  slug: string;
  title: string;
};

type ContentShape = {
  lessons: Lesson[];
  missions: Mission[];
};

type LessonPlan = Lesson & {
  missions: Mission[];
};

const RULE_TIMEOUT_MS = 4_500;
const VM_READY_TIMEOUT_MS = 8_000;
const SUITE_TIMEOUT_MS = 240_000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const contentPath = path.resolve(__dirname, '../src/content/v1/content.json');
const content = JSON.parse(fs.readFileSync(contentPath, 'utf8')) as ContentShape;

const LESSON_PLANS: LessonPlan[] = content.lessons.map((lesson) => ({
  ...lesson,
  missions: content.missions.filter((mission) => mission.lessonSlug === lesson.slug),
}));

async function waitForVmBridge(page: Page, timeout: number) {
  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          return Boolean((window as Window & { __tmuxwebVmBridge?: unknown }).__tmuxwebVmBridge);
        }),
      { timeout },
    )
    .toBe(true);
}

async function waitForVmReadyWithRetry(page: Page) {
  try {
    await waitForVmBridge(page, VM_READY_TIMEOUT_MS);
    return;
  } catch {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await dismissAnalyticsBanner(page);
    await waitForVmBridge(page, VM_READY_TIMEOUT_MS);
  }
}

async function setAutoProbeEnabled(page: Page, enabled: boolean) {
  const toggle = page.locator('#auto-probe-toggle');
  if (!(await toggle.isVisible().catch(() => false))) {
    return;
  }
  if (enabled) {
    await toggle.check({ force: true });
  } else {
    await toggle.uncheck({ force: true });
  }
}

async function injectProbeStatePatch(page: Page, patch: Partial<VmProbeStateInput>) {
  const status = await getVmBridgeStatus(page);
  const snapshot: VmProbeStateInput = {
    tmux: 1,
    session: status.metrics.sessionCount ?? -1,
    window: status.metrics.windowCount ?? -1,
    pane: status.metrics.paneCount ?? -1,
    mode: status.metrics.modeIs === 'COPY_MODE' ? 1 : 0,
    sessionName: status.metrics.sessionName ?? '',
    windowName: status.metrics.windowName ?? '',
    activeWindow: status.metrics.activeWindowIndex ?? -1,
    layout: status.metrics.windowLayout ?? '',
    zoomed: status.metrics.windowZoomed === true ? 1 : 0,
    sync: status.metrics.paneSynchronized === true ? 1 : 0,
    search: status.metrics.searchExecuted === true ? 1 : 0,
    searchMatched: status.metrics.searchMatchFound === true ? 1 : 0,
    ...patch,
  };

  await injectVmProbeState(page, snapshot);
  await page.waitForTimeout(80);
}

async function resetProgress(page: Page) {
  await page.evaluate(async () => {
    const { createInitialProgressSnapshot, useProgressStore, PROGRESS_PERSIST_KEY } = await import(
      '/src/features/progress/progressStore.ts'
    );
    useProgressStore.setState(createInitialProgressSnapshot());
    window.localStorage.removeItem(PROGRESS_PERSIST_KEY);
  });
}

async function selectLessonByTitle(page: Page, title: string) {
  const row = page.locator('.vm-lesson-row').filter({ hasText: title }).first();
  await expect(row).toBeVisible({ timeout: RULE_TIMEOUT_MS });
  await row.click();
  await expect(row).toHaveClass(/is-active/, { timeout: RULE_TIMEOUT_MS });
}

async function selectMissionByIndex(page: Page, missionIndex: number) {
  const row = page.locator('.vm-mission-list .vm-mission-row').nth(missionIndex);
  await expect(row).toBeVisible({ timeout: RULE_TIMEOUT_MS });
  const classes = (await row.getAttribute('class')) ?? '';
  if (!classes.includes('is-active')) {
    await row.click({ force: true });
  }
  await page.waitForTimeout(60);
}

async function isMissionCompleted(page: Page, missionSlug: string) {
  return page.evaluate(async (slug) => {
    const { useProgressStore } = await import('/src/features/progress/progressStore.ts');
    return useProgressStore.getState().completedMissionSlugs.includes(slug);
  }, missionSlug);
}

async function ensureSessionCountAtLeast(page: Page, minCount: number) {
  const current = (await getVmBridgeStatus(page)).metrics.sessionCount ?? 0;
  if (current >= minCount) {
    return;
  }

  await injectProbeStatePatch(page, { session: minCount });
  await expect
    .poll(async () => (await getVmBridgeStatus(page)).metrics.sessionCount ?? 0, { timeout: RULE_TIMEOUT_MS })
    .toBeGreaterThanOrEqual(minCount);
}

async function ensureWindowCountAtLeast(page: Page, minCount: number) {
  const current = (await getVmBridgeStatus(page)).metrics.windowCount ?? 0;
  if (current >= minCount) {
    return;
  }

  await ensureSessionCountAtLeast(page, 1);
  await injectProbeStatePatch(page, { window: minCount });
  await expect
    .poll(async () => (await getVmBridgeStatus(page)).metrics.windowCount ?? 0, { timeout: RULE_TIMEOUT_MS })
    .toBeGreaterThanOrEqual(minCount);
}

async function ensurePaneCountAtLeast(page: Page, minCount: number) {
  const current = (await getVmBridgeStatus(page)).metrics.paneCount ?? 0;
  if (current >= minCount) {
    return;
  }

  await ensureWindowCountAtLeast(page, 1);

  await injectProbeStatePatch(page, { pane: minCount });
  await expect
    .poll(async () => (await getVmBridgeStatus(page)).metrics.paneCount ?? 0, { timeout: RULE_TIMEOUT_MS })
    .toBeGreaterThanOrEqual(minCount);
}

async function ensureActiveWindowIndexAtLeast(page: Page, minIndex: number) {
  const current = (await getVmBridgeStatus(page)).metrics.activeWindowIndex ?? -1;
  if (current >= minIndex) {
    return;
  }

  await ensureWindowCountAtLeast(page, minIndex + 1);
  await injectProbeStatePatch(page, { activeWindow: minIndex });
  await expect
    .poll(async () => (await getVmBridgeStatus(page)).metrics.activeWindowIndex ?? -1, { timeout: RULE_TIMEOUT_MS })
    .toBeGreaterThanOrEqual(minIndex);
}

async function ensureWindowNameEquals(page: Page, expectedName: string) {
  const currentName = ((await getVmBridgeStatus(page)).metrics.windowName ?? '').trim();
  if (currentName === expectedName) {
    return;
  }

  await injectProbeStatePatch(page, { windowName: expectedName });

  await expect
    .poll(async () => ((await getVmBridgeStatus(page)).metrics.windowName ?? '').trim(), {
      timeout: RULE_TIMEOUT_MS,
    })
    .toBe(expectedName);
}

async function ensureSessionNameEquals(page: Page, expectedName: string) {
  const currentName = ((await getVmBridgeStatus(page)).metrics.sessionName ?? '').trim();
  if (currentName === expectedName) {
    return;
  }

  await injectProbeStatePatch(page, { sessionName: expectedName });

  await expect
    .poll(async () => ((await getVmBridgeStatus(page)).metrics.sessionName ?? '').trim(), {
      timeout: RULE_TIMEOUT_MS,
    })
    .toBe(expectedName);
}

async function ensureShortcutAction(page: Page) {
  const status = await getVmBridgeStatus(page);
  if (status.actionHistory.includes('sim.shortcut.execute')) {
    return;
  }

  await injectVmActionHistory(page, 'sim.shortcut.execute');
  await expect
    .poll(async () => (await getVmBridgeStatus(page)).actionHistory.includes('sim.shortcut.execute'), {
      timeout: RULE_TIMEOUT_MS,
    })
    .toBe(true);
}

async function ensureActionHistoryContains(page: Page, action: string) {
  if ((await getVmBridgeStatus(page)).actionHistory.includes(action)) {
    return;
  }

  if (action === 'sim.shortcut.execute') {
    await ensureShortcutAction(page);
  } else {
    await injectVmActionHistory(page, action);
  }

  await expect
    .poll(async () => (await getVmBridgeStatus(page)).actionHistory.includes(action), { timeout: RULE_TIMEOUT_MS })
    .toBe(true);
}

async function ensureShellHistoryContains(page: Page, expected: string) {
  if ((await getVmBridgeStatus(page)).commandHistory.join(' ').includes(expected)) {
    return;
  }

  await injectVmCommandHistory(page, expected);
  await expect
    .poll(async () => (await getVmBridgeStatus(page)).commandHistory.join(' ').includes(expected), {
      timeout: RULE_TIMEOUT_MS,
    })
    .toBe(true);
}

async function satisfyMission(page: Page, mission: Mission) {
  const searchMatchRule = mission.passRules.find(
    (rule) => rule.kind === 'searchMatchFound' && rule.operator === 'equals' && typeof rule.value === 'boolean',
  );

  if (searchMatchRule?.value === true) {
    await injectProbeStatePatch(page, { search: 1, searchMatched: 1 });
  }
  if (searchMatchRule?.value === false) {
    await injectProbeStatePatch(page, { search: 1, searchMatched: 0 });
  }

  for (const rule of mission.passRules) {
    if (rule.kind === 'searchExecuted' || rule.kind === 'searchMatchFound') {
      continue;
    }

    if (rule.kind === 'sessionCount' && rule.operator === '>=' && typeof rule.value === 'number') {
      await ensureSessionCountAtLeast(page, rule.value);
      continue;
    }
    if (rule.kind === 'windowCount' && rule.operator === '>=' && typeof rule.value === 'number') {
      await ensureWindowCountAtLeast(page, rule.value);
      continue;
    }
    if (rule.kind === 'paneCount' && rule.operator === '>=' && typeof rule.value === 'number') {
      await ensurePaneCountAtLeast(page, rule.value);
      continue;
    }
    if (rule.kind === 'activeWindowIndex' && rule.operator === '>=' && typeof rule.value === 'number') {
      await ensureActiveWindowIndexAtLeast(page, rule.value);
      continue;
    }
    if (rule.kind === 'windowName' && rule.operator === 'equals' && typeof rule.value === 'string') {
      await ensureWindowNameEquals(page, rule.value);
      continue;
    }
    if (rule.kind === 'sessionName' && rule.operator === 'equals' && typeof rule.value === 'string') {
      await ensureSessionNameEquals(page, rule.value);
      continue;
    }
    if (rule.kind === 'shellHistoryText' && rule.operator === 'contains' && typeof rule.value === 'string') {
      await ensureShellHistoryContains(page, rule.value);
      continue;
    }
    if (rule.kind === 'actionHistoryText' && rule.operator === 'contains' && typeof rule.value === 'string') {
      await ensureActionHistoryContains(page, rule.value);
      continue;
    }
    if (rule.kind === 'modeIs' && rule.operator === 'equals' && rule.value === 'COPY_MODE') {
      await injectProbeStatePatch(page, { mode: 1 });
    }
  }
}

test.describe('lesson probe regression e2e', () => {
  test.describe.configure({ mode: 'serial' });

  test('all lessons probe', async ({ page }) => {
    test.setTimeout(SUITE_TIMEOUT_MS);

    await page.goto('/practice?lang=ko&lesson=hello-tmux');
    await dismissAnalyticsBanner(page);
    await waitForVmReadyWithRetry(page);
    await setAutoProbeEnabled(page, false);
    await resetProgress(page);

    expect(LESSON_PLANS).toHaveLength(20);

    for (const lesson of LESSON_PLANS) {
      await test.step(`lesson:${lesson.slug}`, async () => {
        await selectLessonByTitle(page, lesson.title);

        for (const [missionIndex, mission] of lesson.missions.entries()) {
          if (await isMissionCompleted(page, mission.slug)) {
            continue;
          }

          await selectMissionByIndex(page, missionIndex);
          await satisfyMission(page, mission);
          try {
            await expect
              .poll(async () => isMissionCompleted(page, mission.slug), {
                timeout: RULE_TIMEOUT_MS,
                message: `mission should complete via snapshot probe flow: ${mission.slug}`,
              })
              .toBe(true);
          } catch (error) {
            const status = await getVmBridgeStatus(page);
            const activeMissionText = await page
              .locator('.vm-mission-row.is-active')
              .first()
              .innerText()
              .catch(() => '');
            const activeMissionSlug = await page.evaluate(() => {
              const params = new URLSearchParams(window.location.search);
              return params.get('mission');
            });
            const debugSummary = JSON.stringify({
              mission: mission.slug,
              activeMissionSlug,
              activeMissionText,
              rules: mission.passRules,
              metrics: status.metrics,
              actionHistoryTail: status.actionHistory.slice(-12),
              commandHistoryTail: status.commandHistory.slice(-8),
            });
            throw new Error(`mission completion timeout: ${debugSummary}\n${String(error)}`);
          }
        }
      });
    }
  });
});
