import { describe, expect, it } from 'vitest';
import {
  advanceCompletionFeedback,
  enqueueCompletionFeedback,
  type CompletionFeedbackQueueState,
} from './completionFeedbackQueue';

function emptyQueue(): CompletionFeedbackQueueState {
  return {
    active: null,
    queue: [],
  };
}

describe('completionFeedbackQueue', () => {
  it('keeps mission/lesson/achievement priority order', () => {
    const withAchievement = enqueueCompletionFeedback(emptyQueue(), {
      key: 'achievement:a',
      kind: 'achievement',
      message: 'achievement',
      detail: 'detail',
    });

    const withLesson = enqueueCompletionFeedback(withAchievement, {
      key: 'lesson:l',
      kind: 'lesson',
      message: 'lesson',
      detail: 'detail',
    });

    const withMission = enqueueCompletionFeedback(withLesson, {
      key: 'mission:m',
      kind: 'mission',
      message: 'mission',
      detail: 'detail',
    });

    expect(withMission.active?.kind).toBe('mission');
    expect(withMission.queue.map((item) => item.kind)).toEqual(['lesson', 'achievement']);
  });

  it('advances queue in order and clears when empty', () => {
    const seeded = {
      active: {
        key: 'mission:m',
        kind: 'mission' as const,
        message: 'mission',
        detail: 'detail',
      },
      queue: [
        {
          key: 'lesson:l',
          kind: 'lesson' as const,
          message: 'lesson',
          detail: 'detail',
        },
      ],
    };

    const next = advanceCompletionFeedback(seeded);
    expect(next.active?.kind).toBe('lesson');
    expect(next.queue).toEqual([]);

    const cleared = advanceCompletionFeedback(next);
    expect(cleared.active).toBeNull();
    expect(cleared.queue).toEqual([]);
  });
});
