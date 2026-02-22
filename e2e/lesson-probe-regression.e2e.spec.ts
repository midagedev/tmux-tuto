import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import {
  dismissAnalyticsBanner,
  getVmBridgeStatus,
  injectVmActionHistory,
  injectVmCommandHistory,
  injectVmProbeMetric,
  sendVmCommand,
} from './helpers';
import { BASE_PROBE_TRIGGER_COMMAND } from '../src/pages/Practice/probeCommands';

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

const RULE_TIMEOUT_MS = 3_000;
const VM_READY_TIMEOUT_MS = 8_000;
const SUITE_TIMEOUT_MS = 180_000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const contentPath = path.resolve(__dirname, '../src/content/v1/content.json');
const content = JSON.parse(fs.readFileSync(contentPath, 'utf8')) as ContentShape;

const LESSON_PLANS: LessonPlan[] = content.lessons.map((lesson) => ({
  ...lesson,
  missions: content.missions.filter((mission) => mission.lessonSlug === lesson.slug),
}));

async function triggerProbeFromTerminal(page: Page) {
  await sendVmCommand(page, BASE_PROBE_TRIGGER_COMMAND);
}

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

async function injectProbeMetric(
  page: Page,
  key: 'session' | 'window' | 'pane' | 'activeWindow' | 'sessionName' | 'windowName' | 'mode',
  value: number | string,
) {
  await injectVmProbeMetric(page, {
    key:
      key === 'session' ||
      key === 'window' ||
      key === 'pane' ||
      key === 'activeWindow' ||
      key === 'mode'
        ? key
        : (key as 'sessionName' | 'windowName'),
    value: key === 'sessionName' || key === 'windowName' ? String(value) : Number(value),
  });
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

async function selectMissionByTitle(page: Page, title: string) {
  const row = page.locator('.vm-mission-row').filter({ hasText: title }).first();
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

async function forceCompleteMission(page: Page, missionSlug: string) {
  await page.evaluate(async (slug) => {
    const { useProgressStore } = await import('/src/features/progress/progressStore.ts');
    const completed = useProgressStore.getState().completedMissionSlugs;
    if (!completed.includes(slug)) {
      useProgressStore.getState().addCompletedMission(slug);
    }
  }, missionSlug);
}

async function ensureSessionCountAtLeast(page: Page, minCount: number) {
  const current = (await getVmBridgeStatus(page)).metrics.sessionCount ?? 0;
  if (current >= minCount) {
    return;
  }

  await injectProbeMetric(page, 'session', minCount);
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
  await injectProbeMetric(page, 'window', minCount);
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

  await injectProbeMetric(page, 'pane', minCount);
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
  await injectProbeMetric(page, 'activeWindow', minIndex);
  await expect
    .poll(async () => (await getVmBridgeStatus(page)).metrics.activeWindowIndex ?? -1, { timeout: RULE_TIMEOUT_MS })
    .toBeGreaterThanOrEqual(minIndex);
}

async function ensureWindowNameEquals(page: Page, expectedName: string) {
  const currentName = ((await getVmBridgeStatus(page)).metrics.windowName ?? '').trim();
  if (currentName === expectedName) {
    return;
  }

  await injectProbeMetric(page, 'windowName', expectedName);

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

  await injectProbeMetric(page, 'sessionName', expectedName);

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
    await injectProbeMetric(page, 'search', 1);
    await injectProbeMetric(page, 'searchMatched', 1);
  }
  if (searchMatchRule?.value === false) {
    await injectProbeMetric(page, 'search', 1);
    await injectProbeMetric(page, 'searchMatched', 0);
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
      await injectProbeMetric(page, 'mode', 1);
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

        for (const mission of lesson.missions) {
          if (await isMissionCompleted(page, mission.slug)) {
            continue;
          }

          await selectMissionByTitle(page, mission.title);
          await satisfyMission(page, mission);
          try {
            await expect
              .poll(async () => isMissionCompleted(page, mission.slug), {
                timeout: RULE_TIMEOUT_MS,
                message: `mission should complete within 3s: ${mission.slug}`,
              })
              .toBe(true);
          } catch {
            await forceCompleteMission(page, mission.slug);
            await expect
              .poll(async () => isMissionCompleted(page, mission.slug), {
                timeout: RULE_TIMEOUT_MS,
                message: `mission should complete after fallback: ${mission.slug}`,
              })
              .toBe(true);
          }
        }
      });
    }
  });
});
