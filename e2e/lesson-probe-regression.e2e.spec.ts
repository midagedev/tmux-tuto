import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { dismissAnalyticsBanner, getVmBridgeStatus, sendVmCommand } from './helpers';

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

const RULE_TIMEOUT_MS = 7_000;
const TEST_TIMEOUT_MS = 120_000;
const PROBE_TRIGGER_COMMAND = '/usr/bin/tmux-tuto-probe >/dev/ttyS1 2>/dev/null';

const SEARCH_MATCHED_COMMAND =
  'tmux has-session -t lesson 2>/dev/null || tmux new-session -d -s lesson; tmux copy-mode -t lesson:0.0 2>/dev/null || tmux copy-mode 2>/dev/null || true; tmux send-keys -t lesson:0.0 -X search-backward "bin" 2>/dev/null || true; printf "[[TMUXWEB_PROBE:search:1]]\\n[[TMUXWEB_PROBE:searchMatched:1]]\\n" >/dev/ttyS1';

const SEARCH_NOT_MATCHED_COMMAND =
  'tmux has-session -t lesson 2>/dev/null || tmux new-session -d -s lesson; tmux copy-mode -t lesson:0.0 2>/dev/null || tmux copy-mode 2>/dev/null || true; tmux send-keys -t lesson:0.0 -X search-backward "__TMUXWEB_NOT_FOUND__" 2>/dev/null || true; printf "[[TMUXWEB_PROBE:search:1]]\\n[[TMUXWEB_PROBE:searchMatched:0]]\\n" >/dev/ttyS1';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const contentPath = path.resolve(__dirname, '../src/content/v1/content.json');
const content = JSON.parse(fs.readFileSync(contentPath, 'utf8')) as ContentShape;

const LESSON_PLANS: LessonPlan[] = content.lessons.map((lesson) => ({
  ...lesson,
  missions: content.missions.filter((mission) => mission.lessonSlug === lesson.slug),
}));

async function focusTerminal(page: Page) {
  const input = page.locator('.xterm textarea').first();
  await expect(input).toBeAttached({ timeout: RULE_TIMEOUT_MS });
  await input.focus();
}

async function triggerProbeFromTerminal(page: Page) {
  await focusTerminal(page);
  await page.keyboard.type(PROBE_TRIGGER_COMMAND);
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
      { timeout: 30_000 },
    )
    .toBe(true);
}

async function waitForWarmStart(page: Page) {
  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          const bridge = (window as Window & {
            __tmuxwebVmBridge?: {
              getLastEmulatorOptions: () => { initial_state?: unknown } | null;
            };
          }).__tmuxwebVmBridge;
          return Boolean(bridge?.getLastEmulatorOptions()?.initial_state);
        }),
      { timeout: RULE_TIMEOUT_MS },
    )
    .toBe(true);
}

async function waitForProbeMetricsReady(page: Page) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    await triggerProbeFromTerminal(page);
    const status = await getVmBridgeStatus(page);
    if (status.metrics.sessionCount !== null) {
      return;
    }
    await page.waitForTimeout(250);
  }
  throw new Error('probe metrics were not initialized within ~7s');
}

async function runCommandAndProbe(page: Page, command: string) {
  const debugLineCountBefore = (await getVmBridgeStatus(page)).debugLineCount;
  await sendVmCommand(page, command);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await page.waitForTimeout(120);
    await triggerProbeFromTerminal(page);

    if ((await getVmBridgeStatus(page)).debugLineCount > debugLineCountBefore) {
      return;
    }
  }
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
  await expect(row).toHaveClass(/is-active/, { timeout: RULE_TIMEOUT_MS });
}

async function isMissionCompleted(page: Page, missionSlug: string) {
  return page.evaluate(async (slug) => {
    const { useProgressStore } = await import('/src/features/progress/progressStore.ts');
    return useProgressStore.getState().completedMissionSlugs.includes(slug);
  }, missionSlug);
}

async function ensureSessionCountAtLeast(page: Page, minCount: number) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const current = (await getVmBridgeStatus(page)).metrics.sessionCount ?? 0;
    if (current >= minCount) {
      return;
    }

    if (minCount >= 1) {
      await runCommandAndProbe(page, 'tmux has-session -t lesson 2>/dev/null || tmux new-session -d -s lesson');
    }
    if (minCount >= 2) {
      await runCommandAndProbe(page, 'tmux has-session -t lesson2 2>/dev/null || tmux new-session -d -s lesson2');
    }
  }

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
  await runCommandAndProbe(
    page,
    'tmux new-window -t lesson -n win2 2>/dev/null || true; tmux new-window -t lesson -n win3 2>/dev/null || true; tmux select-window -t lesson:1 2>/dev/null || true',
  );

  await expect
    .poll(async () => (await getVmBridgeStatus(page)).metrics.windowCount ?? 0, { timeout: RULE_TIMEOUT_MS })
    .toBeGreaterThanOrEqual(minCount);
}

async function ensurePaneCountAtLeast(page: Page, minCount: number) {
  const current = (await getVmBridgeStatus(page)).metrics.paneCount ?? 0;
  if (current >= minCount) {
    return;
  }

  await ensureWindowCountAtLeast(page, 2);
  await runCommandAndProbe(
    page,
    'tmux split-window -t lesson:1 -h 2>/dev/null || true; tmux split-window -t lesson:1 -v 2>/dev/null || true',
  );

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
  await runCommandAndProbe(page, 'tmux select-window -t lesson:1 2>/dev/null || true');
  await expect
    .poll(async () => (await getVmBridgeStatus(page)).metrics.activeWindowIndex ?? -1, { timeout: RULE_TIMEOUT_MS })
    .toBeGreaterThanOrEqual(minIndex);
}

async function ensureShortcutAction(page: Page) {
  const status = await getVmBridgeStatus(page);
  if (status.actionHistory.includes('sim.shortcut.execute')) {
    return;
  }

  await focusTerminal(page);
  await page.keyboard.press('Control+b');
  await page.waitForTimeout(30);
  await page.keyboard.press('c');
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

  switch (action) {
    case 'sim.shortcut.execute':
      await ensureShortcutAction(page);
      break;
    case 'sim.pane.resize':
      await runCommandAndProbe(
        page,
        'tmux resize-pane -t lesson:1.0 -R 2 2>/dev/null || tmux resize-pane -R 2 2>/dev/null || true',
      );
      break;
    case 'sim.pane.select':
      await runCommandAndProbe(
        page,
        'tmux select-pane -R 2>/dev/null || tmux select-pane -t lesson:1.1 2>/dev/null || true',
      );
      break;
    case 'sim.layout.select':
      await runCommandAndProbe(
        page,
        'tmux select-layout -t lesson:1 even-horizontal 2>/dev/null || tmux select-layout even-horizontal 2>/dev/null || true',
      );
      break;
    case 'sim.pane.join':
      await runCommandAndProbe(
        page,
        'tmux join-pane -s lesson:0.0 -t lesson:1.0 2>/dev/null || tmux join-pane 2>/dev/null || true',
      );
      break;
    case 'sim.command.prompt':
      await runCommandAndProbe(page, 'tmux command-prompt -p "cmd" 2>/dev/null || true');
      break;
    case 'sim.choose.tree':
      await runCommandAndProbe(page, 'tmux choose-tree -Z 2>/dev/null || true');
      break;
    default:
      break;
  }

  await expect
    .poll(async () => (await getVmBridgeStatus(page)).actionHistory.includes(action), { timeout: RULE_TIMEOUT_MS })
    .toBe(true);
}

function toEchoCommand(text: string) {
  const escaped = text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `echo "${escaped}"`;
}

function resolveShellHistoryCommand(expected: string) {
  if (expected.includes('tmux -V')) {
    return 'tmux -V';
  }
  if (expected.includes('tmux list-sessions')) {
    return 'tmux list-sessions';
  }
  if (expected.includes('tmux list-windows')) {
    return 'tmux list-windows -a 2>/dev/null || tmux list-windows 2>/dev/null || true';
  }
  if (expected.includes('tmux detach-client')) {
    return 'tmux detach-client 2>/dev/null || true';
  }
  if (expected.includes('tmux attach')) {
    return toEchoCommand('tmux attach -t lesson');
  }
  if (expected.includes('split-window -h')) {
    return 'tmux split-window -t lesson:1 -h 2>/dev/null || tmux split-window -h 2>/dev/null || true';
  }
  if (expected.includes('split-window -v')) {
    return 'tmux split-window -t lesson:1 -v 2>/dev/null || tmux split-window -v 2>/dev/null || true';
  }
  if (expected.includes('join-pane')) {
    return 'tmux join-pane -s lesson:0.0 -t lesson:1.0 2>/dev/null || tmux join-pane 2>/dev/null || true';
  }
  if (expected.includes('link-window')) {
    return 'tmux has-session -t lesson2 2>/dev/null || tmux new-session -d -s lesson2; tmux link-window -s lesson:1 -t lesson2:2 2>/dev/null || tmux link-window 2>/dev/null || true';
  }
  return toEchoCommand(expected);
}

async function ensureShellHistoryContains(page: Page, expected: string) {
  if ((await getVmBridgeStatus(page)).commandHistory.join(' ').includes(expected)) {
    return;
  }

  await runCommandAndProbe(page, resolveShellHistoryCommand(expected));
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
    await runCommandAndProbe(page, SEARCH_MATCHED_COMMAND);
  }
  if (searchMatchRule?.value === false) {
    await runCommandAndProbe(page, SEARCH_NOT_MATCHED_COMMAND);
  }

  for (const rule of mission.passRules) {
    if (rule.kind === 'searchExecuted' || rule.kind === 'searchMatchFound') {
      continue;
    }
    if (rule.kind === 'modeIs' && searchMatchRule) {
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
    if (rule.kind === 'shellHistoryText' && rule.operator === 'contains' && typeof rule.value === 'string') {
      await ensureShellHistoryContains(page, rule.value);
      continue;
    }
    if (rule.kind === 'actionHistoryText' && rule.operator === 'contains' && typeof rule.value === 'string') {
      await ensureActionHistoryContains(page, rule.value);
      continue;
    }
    if (rule.kind === 'modeIs' && rule.operator === 'equals' && rule.value === 'COPY_MODE') {
      await runCommandAndProbe(page, 'tmux copy-mode -t lesson:0.0 2>/dev/null || tmux copy-mode 2>/dev/null || true');
    }
  }

  await triggerProbeFromTerminal(page);
}

test.describe('lesson probe regression e2e', () => {
  test.describe.configure({ mode: 'parallel' });

  for (const lesson of LESSON_PLANS) {
    test(`lesson:${lesson.slug} probe`, async ({ page }) => {
      test.setTimeout(TEST_TIMEOUT_MS);

      const missionFailures: string[] = [];
      await page.goto(`/practice?lang=ko&lesson=${lesson.slug}`);
      await dismissAnalyticsBanner(page);
      await waitForVmBridgeReady(page);
      await waitForWarmStart(page);
      await waitForProbeMetricsReady(page);
      await resetProgress(page);
      await selectLessonByTitle(page, lesson.title);

      for (const mission of lesson.missions) {
        if (await isMissionCompleted(page, mission.slug)) {
          continue;
        }

        console.log(`[e2e][${lesson.slug}] mission start: ${mission.slug}`);
        await selectMissionByTitle(page, mission.title);
        await satisfyMission(page, mission);

        try {
          await expect
            .poll(async () => isMissionCompleted(page, mission.slug), {
              timeout: RULE_TIMEOUT_MS,
              message: `mission should complete within 7s: ${mission.slug}`,
            })
            .toBe(true);
          console.log(`[e2e][${lesson.slug}] mission pass: ${mission.slug}`);
        } catch {
          missionFailures.push(`${lesson.slug}/${mission.slug}: timeout(7s)`);
          console.log(`[e2e][${lesson.slug}] mission fail: ${mission.slug} -> timeout(7s)`);
        }
      }

      expect(missionFailures, `probe 판정 실패(${lesson.slug}):\n${missionFailures.join('\n')}`).toEqual([]);
    });
  }
});
