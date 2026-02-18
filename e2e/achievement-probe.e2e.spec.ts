import { expect, test, type Page } from '@playwright/test';
import { dismissAnalyticsBanner, getVmBridgeStatus, sendVmCommand, sendVmProbe, waitForVmReady } from './helpers';

const SKILL_ACHIEVEMENT_TITLES = [
  '첫 분할',
  '트리플 스플릿',
  'Pane 러너',
  'Pane 백장',
  '윈도우 입문',
  '세션 스타터',
  '복사모드 입문',
  '레이아웃 장인',
  '줌 컨트롤',
  '동기화 지휘관',
  '프롬프트 소환사',
  '트리 탐험가',
  '미세조정',
  '패인 네비게이터',
  '자리 바꾸기',
  '회전문',
  '레슨 탐험가',
] as const;

const COURSE_ACHIEVEMENT_TITLES = [
  '첫 미션 완료',
  '7일 스트릭',
  'Track A 완료',
  'Track B 완료',
  'Track C 완료',
  '커리큘럼 완주',
] as const;

async function assertAchievementUnlocked(page: Page, title: string) {
  const card = page.locator('.achievement-card').filter({ hasText: title }).first();
  await expect(card, `${title} card should exist`).toBeVisible();
  await expect(card, `${title} should be unlocked`).toContainText('달성됨');
}

async function runCommandAndProbe(page: Page, command: string) {
  await sendVmCommand(page, command);
  await page.waitForTimeout(120);
  await sendVmProbe(page);
}

async function selectLessonByTitle(page: Page, title: string) {
  const row = page.locator('.vm-lesson-row').filter({ hasText: title }).first();
  await expect(row).toBeVisible();
  await row.click();
  await expect(row).toHaveClass(/is-active/);
}

test.describe('achievement + probe e2e', () => {
  test.setTimeout(180_000);

  test('skill achievements unlock and probe/action telemetry updates per tmux action', async ({ page }) => {
    await page.goto('/practice');
    await dismissAnalyticsBanner(page);
    await waitForVmReady(page);

    await runCommandAndProbe(page, 'tmux has-session -t lesson 2>/dev/null || tmux new-session -d -s lesson');
    await expect
      .poll(async () => {
        const status = await getVmBridgeStatus(page);
        return status.metrics.sessionName;
      })
      .not.toBeNull();

    await runCommandAndProbe(page, 'tmux split-window -t lesson');
    await expect
      .poll(async () => {
        const status = await getVmBridgeStatus(page);
        return status.metrics.paneCount ?? 0;
      })
      .toBeGreaterThanOrEqual(2);

    await runCommandAndProbe(page, 'tmux split-window -t lesson');
    await expect
      .poll(async () => {
        const status = await getVmBridgeStatus(page);
        return status.metrics.paneCount ?? 0;
      })
      .toBeGreaterThanOrEqual(3);

    await runCommandAndProbe(page, 'tmux new-window -t lesson -n win2');
    await expect
      .poll(async () => {
        const status = await getVmBridgeStatus(page);
        return status.metrics.windowCount ?? 0;
      })
      .toBeGreaterThanOrEqual(2);

    await runCommandAndProbe(page, 'tmux select-layout -t lesson:0 even-horizontal');
    await expect
      .poll(async () => {
        const status = await getVmBridgeStatus(page);
        return status.metrics.windowLayout;
      })
      .not.toBeNull();

    await runCommandAndProbe(page, 'tmux resize-pane -t lesson:0.0 -Z');
    await expect
      .poll(async () => {
        const status = await getVmBridgeStatus(page);
        return status.metrics.windowZoomed;
      })
      .not.toBeNull();

    await runCommandAndProbe(page, 'tmux set-window-option -t lesson:0 synchronize-panes on');
    await expect
      .poll(async () => {
        const status = await getVmBridgeStatus(page);
        return status.metrics.paneSynchronized;
      })
      .not.toBeNull();

    await runCommandAndProbe(page, 'tmux copy-mode -t lesson:0.0');
    await runCommandAndProbe(page, 'tmux command-prompt -p "cmd"');
    await runCommandAndProbe(page, 'tmux choose-tree -Z');
    await runCommandAndProbe(page, 'tmux swap-pane -s lesson:0.0 -t lesson:0.1');
    await runCommandAndProbe(page, 'tmux rotate-window -t lesson:0');

    for (let index = 0; index < 5; index += 1) {
      await sendVmCommand(page, 'tmux resize-pane -t lesson:0.0 -R 1');
    }

    for (let index = 0; index < 10; index += 1) {
      await sendVmCommand(page, index % 2 === 0 ? 'tmux select-pane -R' : 'tmux select-pane -L');
    }

    for (let index = 0; index < 98; index += 1) {
      await sendVmCommand(page, 'tmux split-window -t lesson; tmux kill-pane -a -t lesson:0.0');
    }

    await selectLessonByTitle(page, '첫 3분: tmux 맛보기');
    await sendVmCommand(page, 'tmux list-sessions');
    await selectLessonByTitle(page, '기본 조작: Session/Window/Pane');
    await sendVmCommand(page, 'tmux list-sessions');
    await selectLessonByTitle(page, '세션 유지 루틴');
    await sendVmCommand(page, 'tmux list-sessions');

    await page.getByRole('link', { name: '진행도' }).click();
    await expect(page).toHaveURL('/progress');

    for (const title of SKILL_ACHIEVEMENT_TITLES) {
      await assertAchievementUnlocked(page, title);
    }
  });

  test('course achievements unlock when mission progress and streak conditions are met', async ({ page }) => {
    await page.goto('/progress');
    await dismissAnalyticsBanner(page);

    await expect
      .poll(async () => {
        return page.locator('.achievement-card').count();
      })
      .toBeGreaterThan(0);

    await page.evaluate(async () => {
      const module = await import('/src/features/progress/progressStore.ts');
      const store = module.useProgressStore;
      const missionPass = store.getState().recordMissionPass;

      for (let day = 1; day <= 7; day += 1) {
        missionPass({
          missionSlug: `e2e-course-streak-${day}`,
          difficulty: 'beginner',
          hintLevel: 0,
          attemptNumber: 1,
          nowIso: `2026-02-${String(day).padStart(2, '0')}T09:00:00.000Z`,
          completedTrackSlugs: [],
        });
      }

      missionPass({
        missionSlug: 'e2e-track-a',
        difficulty: 'beginner',
        hintLevel: 0,
        attemptNumber: 1,
        nowIso: '2026-02-08T09:00:00.000Z',
        completedTrackSlugs: ['track-a-foundations'],
      });

      missionPass({
        missionSlug: 'e2e-track-b',
        difficulty: 'beginner',
        hintLevel: 0,
        attemptNumber: 1,
        nowIso: '2026-02-09T09:00:00.000Z',
        completedTrackSlugs: ['track-a-foundations', 'track-b-workflow'],
      });

      missionPass({
        missionSlug: 'e2e-track-c',
        difficulty: 'beginner',
        hintLevel: 0,
        attemptNumber: 1,
        nowIso: '2026-02-10T09:00:00.000Z',
        completedTrackSlugs: ['track-a-foundations', 'track-b-workflow', 'track-c-deepwork'],
      });
    });

    for (const title of COURSE_ACHIEVEMENT_TITLES) {
      await assertAchievementUnlocked(page, title);
    }
  });
});
