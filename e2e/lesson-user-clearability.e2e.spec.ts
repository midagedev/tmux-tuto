import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import {
  dismissAnalyticsBanner,
  getVmBridgeStatus,
  sendVmCommand,
  sendVmInput,
  sendVmProbe,
  setVmAutoProbe,
  waitForVmReady,
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

const PROBE_POLL_INTERVAL_MS = 1_050;
const PROBE_SETTLE_TIMEOUT_MS = 18_000;
const MISSION_TIMEOUT_MS = 40_000;
const SUITE_TIMEOUT_MS = 720_000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const contentPath = path.resolve(__dirname, '../src/content/v1/content.json');
const content = JSON.parse(fs.readFileSync(contentPath, 'utf8')) as ContentShape;

const LESSON_PLANS: LessonPlan[] = content.lessons.map((lesson) => ({
  ...lesson,
  missions: content.missions.filter((mission) => mission.lessonSlug === lesson.slug),
}));

async function waitForInitialProbeSnapshot(page: Page) {
  const start = Date.now();
  while (Date.now() - start < PROBE_SETTLE_TIMEOUT_MS) {
    const status = await getVmBridgeStatus(page);
    if (status.metrics.sessionCount !== null) {
      return;
    }
    await sendVmProbe(page);
    await page.waitForTimeout(PROBE_POLL_INTERVAL_MS);
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

async function selectLessonByTitle(page: Page, title: string, lessonSlug: string) {
  const row = page.locator('.vm-lesson-row').filter({ hasText: title }).first();
  await expect(row).toBeVisible({ timeout: MISSION_TIMEOUT_MS });
  await row.click();
  await expect(row).toHaveClass(/is-active/, { timeout: MISSION_TIMEOUT_MS });
  await expect
    .poll(async () => {
      const params = new URLSearchParams(await page.evaluate(() => window.location.search));
      return params.get('lesson');
    })
    .toBe(lessonSlug);
}

async function selectMissionByIndex(page: Page, missionIndex: number, missionSlug: string) {
  await page.evaluate((index) => {
    const rows = document.querySelectorAll<HTMLButtonElement>('.vm-mission-list .vm-mission-row');
    const row = rows.item(index);
    if (row) {
      row.click();
    }
  }, missionIndex);

  await expect
    .poll(async () => {
      const params = new URLSearchParams(await page.evaluate(() => window.location.search));
      return params.get('mission');
    })
    .toBe(missionSlug);
}

async function isMissionCompleted(page: Page, missionSlug: string) {
  return page.evaluate(async (slug) => {
    const { useProgressStore } = await import('/src/features/progress/progressStore.ts');
    return useProgressStore.getState().completedMissionSlugs.includes(slug);
  }, missionSlug);
}

async function runCommand(page: Page, command: string) {
  await sendVmCommand(page, command);
  await page.waitForTimeout(60);
}

async function runShortcut(page: Page, key: string) {
  const token = key === ':' ? ';' : key;
  await sendVmInput(page, `\u0002${token}`);
  await page.waitForTimeout(80);
}

async function ensureShortcutAction(page: Page) {
  const status = await getVmBridgeStatus(page);
  if (status.actionHistory.includes('sim.shortcut.execute')) {
    return;
  }

  const candidates = ['c', 'n', 'w'];
  for (const candidate of candidates) {
    await runShortcut(page, candidate);
    await page.waitForTimeout(140);
    const current = await getVmBridgeStatus(page);
    if (current.actionHistory.includes('sim.shortcut.execute')) {
      return;
    }
  }

  throw new Error('failed to emit shortcut action (sim.shortcut.execute)');
}

function commandsForShellHistoryRule(expected: string): string[] {
  if (expected.includes('tmux rename-session')) {
    return [
      'tmux has-session -t main 2>/dev/null || tmux new-session -d -s main',
      'tmux rename-session -t main work 2>/dev/null || true',
    ];
  }
  if (expected.includes('tmux detach-client')) {
    return ['tmux detach-client 2>/dev/null || true'];
  }
  if (expected.includes('tmux attach -t work')) {
    return ['tmux attach -t work 2>/dev/null || true'];
  }
  if (expected.includes('split-window -h')) {
    return ['tmux split-window -h 2>/dev/null || true'];
  }
  if (expected.includes('split-window -v')) {
    return ['tmux split-window -v 2>/dev/null || true'];
  }
  if (expected.includes('join-pane')) {
    return [
      'tmux has-session -t main 2>/dev/null || tmux new-session -d -s main',
      'tmux list-windows -t main -F "#I" | grep -qx "1" || tmux new-window -t main -n logs',
      'tmux join-pane -h -s main:1.0 -t main:0.0 2>/dev/null || tmux join-pane -h -s :1.0 -t :0.0 2>/dev/null || true',
    ];
  }
  if (expected.includes('link-window')) {
    return [
      'tmux has-session -t main 2>/dev/null || tmux new-session -d -s main',
      'tmux has-session -t aux 2>/dev/null || tmux new-session -d -s aux',
      'tmux list-windows -t aux -F "#I" | grep -qx "1" || tmux new-window -t aux -n audit',
      'tmux link-window -s aux:1 -t main: 2>/dev/null || true',
    ];
  }

  return [expected];
}

function commandsForActionRule(action: string): string[] {
  switch (action) {
    case 'sim.window.rename':
      return [
        'tmux has-session -t main 2>/dev/null || tmux new-session -d -s main',
        'tmux rename-window -t main:0 dev 2>/dev/null || tmux rename-window dev 2>/dev/null || true',
      ];
    case 'sim.pane.resize':
      return ['tmux resize-pane -R 5 2>/dev/null || true'];
    case 'sim.pane.select':
      return ['tmux select-pane -R 2>/dev/null || tmux select-pane -L 2>/dev/null || true'];
    case 'sim.layout.select':
      return ['tmux select-layout tiled 2>/dev/null || true'];
    case 'sim.pane.join':
      return [
        'tmux has-session -t main 2>/dev/null || tmux new-session -d -s main',
        'tmux list-windows -t main -F "#I" | grep -qx "1" || tmux new-window -t main -n logs',
        'tmux join-pane -h -s main:1.0 -t main:0.0 2>/dev/null || tmux join-pane -h -s :1.0 -t :0.0 2>/dev/null || true',
      ];
    case 'sim.command.prompt':
      return ['tmux command-prompt -p "cmd" 2>/dev/null || true'];
    case 'sim.choose.tree':
      return ['tmux choose-tree -Z 2>/dev/null || true'];
    default:
      return [];
  }
}

function commandsForMetricRule(rule: MissionRule): string[] {
  if (rule.kind === 'sessionCount' && rule.operator === '>=' && typeof rule.value === 'number') {
    const commands = ['tmux has-session -t main 2>/dev/null || tmux new-session -d -s main'];
    if (rule.value >= 2) {
      commands.push('tmux has-session -t aux 2>/dev/null || tmux new-session -d -s aux');
    }
    return commands;
  }

  if (rule.kind === 'windowCount' && rule.operator === '>=' && typeof rule.value === 'number') {
    const commands = [
      'tmux has-session -t main 2>/dev/null || tmux new-session -d -s main',
      'tmux list-windows -t main -F "#{window_name}" | grep -qx "work" || tmux new-window -t main -n work',
    ];
    if (rule.value >= 3) {
      commands.push('tmux list-windows -t main -F "#{window_name}" | grep -qx "logs" || tmux new-window -t main -n logs');
    }
    return commands;
  }

  if (rule.kind === 'paneCount' && rule.operator === '>=' && typeof rule.value === 'number') {
    return [
      'tmux has-session -t main 2>/dev/null || tmux new-session -d -s main',
      `while [ "$(tmux list-panes -a 2>/dev/null | wc -l | tr -d ' ')" -lt ${rule.value} ]; do tmux split-window -t main:0 -h 2>/dev/null || tmux split-window -h 2>/dev/null || true; done`,
    ];
  }

  if (rule.kind === 'activeWindowIndex' && rule.operator === '>=' && typeof rule.value === 'number') {
    return [
      'tmux has-session -t main 2>/dev/null || tmux new-session -d -s main',
      'tmux list-windows -t main -F "#{window_name}" | grep -qx "work" || tmux new-window -t main -n work',
      'tmux switch-client -t main 2>/dev/null || true',
      `tmux select-window -t main:${rule.value} 2>/dev/null || true`,
    ];
  }

  if (rule.kind === 'windowName' && rule.operator === 'equals' && typeof rule.value === 'string') {
    return [
      'tmux has-session -t main 2>/dev/null || tmux new-session -d -s main',
      `tmux rename-window -t main:0 ${rule.value} 2>/dev/null || tmux rename-window ${rule.value} 2>/dev/null || true`,
      'tmux select-window -t main:0 2>/dev/null || true',
    ];
  }

  if (rule.kind === 'sessionName' && rule.operator === 'equals' && typeof rule.value === 'string') {
    return [
      'tmux has-session -t main 2>/dev/null || tmux new-session -d -s main',
      `tmux rename-session -t main ${rule.value} 2>/dev/null || true`,
      `tmux switch-client -t ${rule.value} 2>/dev/null || true`,
    ];
  }

  if (rule.kind === 'modeIs' && rule.operator === 'equals' && rule.value === 'COPY_MODE') {
    return ['tmux copy-mode 2>/dev/null || true'];
  }

  return [];
}

function buildSearchPrepCommands(expectMatch: boolean) {
  if (!expectMatch) {
    return [];
  }

  return ['printf "TMUXWEB_E2E_MATCH_TOKEN\\n"'];
}

async function runCopyModeSearchFlow(page: Page, expectMatch: boolean) {
  const query = expectMatch ? 'TMUXWEB_E2E_MATCH_TOKEN' : 'TMUXWEB_E2E_NEVER_MATCH_TOKEN';
  await sendVmInput(page, '\u0002[');
  await page.waitForTimeout(120);
  await sendVmInput(page, `/${query}\r`);
  await page.waitForTimeout(140);
}

async function satisfyMission(page: Page, mission: Mission) {
  const queuedCommands = new Set<string>();
  let needsShortcutAction = false;

  const searchMatchRule = mission.passRules.find(
    (rule) => rule.kind === 'searchMatchFound' && rule.operator === 'equals' && typeof rule.value === 'boolean',
  );

  if (searchMatchRule) {
    buildSearchPrepCommands(searchMatchRule.value).forEach((command) => queuedCommands.add(command));
  }

  for (const rule of mission.passRules) {
    if (rule.kind === 'searchExecuted' || rule.kind === 'searchMatchFound') {
      continue;
    }

    if (rule.kind === 'shellHistoryText' && rule.operator === 'contains' && typeof rule.value === 'string') {
      commandsForShellHistoryRule(rule.value).forEach((command) => queuedCommands.add(command));
      continue;
    }

    if (rule.kind === 'actionHistoryText' && rule.operator === 'contains' && typeof rule.value === 'string') {
      if (rule.value === 'sim.shortcut.execute') {
        needsShortcutAction = true;
      } else {
        commandsForActionRule(rule.value).forEach((command) => queuedCommands.add(command));
      }
      continue;
    }

    commandsForMetricRule(rule).forEach((command) => queuedCommands.add(command));
  }

  for (const command of queuedCommands) {
    await runCommand(page, command);
  }

  if (searchMatchRule) {
    await runCopyModeSearchFlow(page, searchMatchRule.value);
  }

  if (needsShortcutAction) {
    await ensureShortcutAction(page);
  }
}

async function waitForMissionCompletion(page: Page, mission: Mission) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < MISSION_TIMEOUT_MS) {
    if (await isMissionCompleted(page, mission.slug)) {
      return;
    }

    await sendVmProbe(page);
    await page.waitForTimeout(PROBE_POLL_INTERVAL_MS);
  }

  const status = await getVmBridgeStatus(page);
  const activeMissionSlug = await page.evaluate(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('mission');
  });

  throw new Error(
    `mission completion timeout (${mission.slug}): ${JSON.stringify({
      activeMissionSlug,
      rules: mission.passRules,
      metrics: status.metrics,
      actionHistoryTail: status.actionHistory.slice(-12),
      commandHistoryTail: status.commandHistory.slice(-10),
      scheduler: status.probeScheduler,
    })}`,
  );
}

test.describe('lesson user clearability e2e', () => {
  test.describe.configure({ mode: 'serial' });

  test('all lessons can be completed through command/shortcut flow', async ({ page }) => {
    test.setTimeout(SUITE_TIMEOUT_MS);

    await page.goto('/practice?lang=ko&lesson=hello-tmux');
    await dismissAnalyticsBanner(page);
    await waitForVmReady(page, { timeout: 120_000 });
    await setVmAutoProbe(page, false);
    await resetProgress(page);
    await waitForInitialProbeSnapshot(page);

    expect(LESSON_PLANS).toHaveLength(20);

    for (const lesson of LESSON_PLANS) {
      await test.step(`lesson:${lesson.slug}`, async () => {
        await selectLessonByTitle(page, lesson.title, lesson.slug);

        for (const [missionIndex, mission] of lesson.missions.entries()) {
          await selectMissionByIndex(page, missionIndex, mission.slug);

          if (await isMissionCompleted(page, mission.slug)) {
            continue;
          }

          await satisfyMission(page, mission);
          await waitForMissionCompletion(page, mission);
        }
      });
    }
  });
});
