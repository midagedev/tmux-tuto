import { describe, expect, it } from 'vitest';
import type { AppContent, AppMission } from '../../features/curriculum/contentSchema';
import {
  buildMetricStatusItems,
  buildMissionCommandSuggestions,
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
      modeIs: 'COPY_MODE',
      sessionName: 'lesson',
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
      { key: 'windowCount', label: 'windows', value: 2 },
      { key: 'paneCount', label: 'panes', value: 3 },
      { key: 'activeWindowIndex', label: 'activeWindow', value: 0 },
      { key: 'windowZoomed', label: 'zoom', value: 'yes' },
      { key: 'paneSynchronized', label: 'sync', value: 'no' },
      { key: 'windowLayout', label: 'layout', value: '1234567890123456789012345678...' },
      { key: 'modeIs', label: 'mode', value: 'COPY_MODE' },
      { key: 'searchExecuted', label: 'search', value: 'yes' },
      { key: 'searchMatchFound', label: 'match', value: '-' },
    ]);
  });
});
