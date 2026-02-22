import { describe, expect, it } from 'vitest';
import type { TFunction } from 'i18next';
import type { AppContent, AppMission } from '../../features/curriculum/contentSchema';
import {
  buildMetricStatusItems,
  buildMissionCommandSuggestions,
  buildMissionPreconditionItems,
  computeCompletedTrackSlugs,
  formatLayout,
  getMetricBadgeClass,
} from './practiceVmHelpers';

describe('practiceVmHelpers', () => {
  it('builds unique command suggestions from rules and hints', () => {
    const mission: AppMission = {
      id: 'm1',
      lessonSlug: 'hello-tmux',
      slug: 'm1',
      title: 'Mission 1',
      type: 'state-check',
      difficulty: 'beginner',
      initialScenario: 'single-pane',
      passRules: [
        { kind: 'paneCount', operator: '>=', value: 2 },
        { kind: 'actionHistoryText', operator: 'contains', value: 'sim.command.prompt' },
      ],
      hints: [
        '먼저 `tmux split-window` 실행',
        '필요하면 `tmux command-prompt -p "cmd"` 확인',
        '중복 `tmux split-window`',
      ],
    };

    expect(buildMissionCommandSuggestions(mission)).toEqual([
      'tmux split-window',
      'tmux command-prompt -p "cmd"',
    ]);
  });

  it('computes completed tracks from completed mission slugs', () => {
    const content: AppContent = {
      version: '1',
      generatedAt: '2026-02-21T00:00:00.000Z',
      tracks: [
        { id: 't1', slug: 'track-a', title: 'A', summary: 'A', order: 1, status: 'active' },
        { id: 't2', slug: 'track-b', title: 'B', summary: 'B', order: 2, status: 'active' },
      ],
      chapters: [
        { id: 'c1', slug: 'c1', trackSlug: 'track-a', title: 'C1', order: 1 },
        { id: 'c2', slug: 'c2', trackSlug: 'track-b', title: 'C2', order: 2 },
      ],
      lessons: [
        { id: 'l1', slug: 'l1', title: 'L1', trackSlug: 'track-a', chapterSlug: 'c1', estimatedMinutes: 5, objectives: [] },
        { id: 'l2', slug: 'l2', title: 'L2', trackSlug: 'track-b', chapterSlug: 'c2', estimatedMinutes: 5, objectives: [] },
      ],
      missions: [
        {
          id: 'm-a-1',
          lessonSlug: 'l1',
          slug: 'm-a-1',
          title: 'MA1',
          type: 'state-check',
          difficulty: 'beginner',
          initialScenario: 'single-pane',
          passRules: [],
          hints: [],
        },
        {
          id: 'm-b-1',
          lessonSlug: 'l2',
          slug: 'm-b-1',
          title: 'MB1',
          type: 'state-check',
          difficulty: 'beginner',
          initialScenario: 'single-pane',
          passRules: [],
          hints: [],
        },
      ],
      playbooks: [],
    };

    expect(computeCompletedTrackSlugs(content, ['m-a-1'])).toEqual(['track-a']);
    expect(computeCompletedTrackSlugs(content, ['m-a-1', 'm-b-1'])).toEqual(['track-a', 'track-b']);
  });

  it('formats layout and label helpers', () => {
    expect(formatLayout(null)).toBe('-');
    expect(formatLayout('abcd')).toBe('abcd');
    expect(formatLayout('12345678901234567890123456789012345')).toBe('1234567890123456789012345678...');

    expect(getMetricBadgeClass('running')).toBe('is-running');
    expect(getMetricBadgeClass('booting')).toBe('is-booting');
    expect(getMetricBadgeClass('error')).toBe('is-error');
    expect(getMetricBadgeClass('idle')).toBe('is-idle');
  });

  it('builds metric status items with expected labels and normalized values', () => {
    const metricStatusItems = buildMetricStatusItems({
      sessionCount: 1,
      windowCount: 2,
      paneCount: 3,
      scrollPosition: 4,
      modeIs: 'COPY_MODE',
      sessionName: 'lesson',
      windowName: 'dev',
      activeWindowIndex: 0,
      windowLayout: '123456789012345678901234567890',
      windowZoomed: true,
      paneSynchronized: false,
      searchExecuted: true,
      searchMatchFound: null,
    });

    expect(metricStatusItems).toEqual([
      { key: 'sessionCount', label: 'sessions', value: 1 },
      { key: 'sessionName', label: 'sessionName', value: 'lesson' },
      { key: 'windowName', label: 'windowName', value: 'dev' },
      { key: 'windowCount', label: 'windows', value: 2 },
      { key: 'paneCount', label: 'panes', value: 3 },
      { key: 'scrollPosition', label: 'scroll', value: 4 },
      { key: 'activeWindowIndex', label: 'activeWindow', value: 0 },
      { key: 'windowZoomed', label: 'zoom', value: 'yes' },
      { key: 'paneSynchronized', label: 'sync', value: 'no' },
      { key: 'windowLayout', label: 'layout', value: '1234567890123456789012345678...' },
      { key: 'modeIs', label: 'mode', value: 'COPY_MODE' },
      { key: 'searchExecuted', label: 'search', value: 'yes' },
      { key: 'searchMatchFound', label: 'match', value: '-' },
    ]);
  });

  it('builds precondition items for sessionName/windowName rules with measured values', () => {
    const mission: AppMission = {
      id: 'm2',
      lessonSlug: 'basics',
      slug: 'basics-window-open',
      title: 'Window name mission',
      type: 'state-check',
      difficulty: 'beginner',
      initialScenario: 'single-pane',
      passRules: [
        { kind: 'sessionName', operator: 'equals', value: 'lesson' },
        { kind: 'windowName', operator: 'equals', value: 'dev' },
        { kind: 'scrollPosition', operator: '>=', value: 1 },
      ],
      hints: [],
    };

    const snapshot = {
      sessionCount: 1,
      windowCount: 2,
      paneCount: 1,
      scrollPosition: 2,
      modeIs: null,
      sessionName: 'lesson',
      windowName: 'dev',
      activeWindowIndex: 1,
      windowLayout: null,
      windowZoomed: false,
      paneSynchronized: false,
      searchExecuted: false,
      searchMatchFound: false,
      actionHistory: [],
      commandHistory: [],
    };

    const t = ((key: string, params?: Record<string, unknown>) => {
      if (!params) {
        return key;
      }
      return key.replace(/{{(\w+)}}/g, (_, token) => String(params[token] ?? ''));
    }) as unknown as TFunction;

    const items = buildMissionPreconditionItems(t, mission, snapshot);
    const sessionItem = items.find((item) => item.key === 'sessionName-0');
    const windowItem = items.find((item) => item.key === 'windowName-1');
    const scrollItem = items.find((item) => item.key === 'scrollPosition-2');

    expect(sessionItem?.current).toContain('lesson');
    expect(sessionItem?.current).not.toBe('현재 상태 측정값 없음');
    expect(sessionItem?.satisfied).toBe(true);
    expect(windowItem?.current).toContain('dev');
    expect(windowItem?.current).not.toBe('현재 상태 측정값 없음');
    expect(windowItem?.satisfied).toBe(true);
    expect(scrollItem?.current).toContain('2');
    expect(scrollItem?.satisfied).toBe(true);
  });
});
