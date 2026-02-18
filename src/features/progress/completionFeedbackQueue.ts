export type CompletionFeedbackKind = 'mission' | 'lesson' | 'achievement';

export type CompletionFeedbackItem = {
  key: string;
  kind: CompletionFeedbackKind;
  message: string;
  detail: string;
  achievementId?: string;
};

export type CompletionFeedbackQueueState = {
  active: CompletionFeedbackItem | null;
  queue: CompletionFeedbackItem[];
};

const FEEDBACK_PRIORITY: Record<CompletionFeedbackKind, number> = {
  mission: 0,
  lesson: 1,
  achievement: 2,
};

function byPriority(a: CompletionFeedbackItem, b: CompletionFeedbackItem) {
  return FEEDBACK_PRIORITY[a.kind] - FEEDBACK_PRIORITY[b.kind];
}

export function enqueueCompletionFeedback(
  state: CompletionFeedbackQueueState,
  nextItem: CompletionFeedbackItem,
): CompletionFeedbackQueueState {
  if (!state.active) {
    return {
      active: nextItem,
      queue: state.queue,
    };
  }

  if (FEEDBACK_PRIORITY[nextItem.kind] < FEEDBACK_PRIORITY[state.active.kind]) {
    return {
      active: nextItem,
      queue: [...state.queue, state.active].sort(byPriority),
    };
  }

  return {
    active: state.active,
    queue: [...state.queue, nextItem].sort(byPriority),
  };
}

export function advanceCompletionFeedback(state: CompletionFeedbackQueueState): CompletionFeedbackQueueState {
  if (state.queue.length === 0) {
    return {
      active: null,
      queue: [],
    };
  }

  const [nextActive, ...rest] = state.queue;
  return {
    active: nextActive,
    queue: rest,
  };
}
