import type { AppMission } from '../curriculum/contentSchema';
import type { MissionGradeResult } from './ruleEngine';

export type HintPayload = {
  hintLevel: 1 | 2 | 3;
  hintText: string;
};

function formatFailedRules(result: MissionGradeResult) {
  if (result.failedRules.length === 0) {
    return '실패 룰 없음';
  }

  return result.failedRules
    .map((rule) => `${rule.kind} ${rule.operator} ${JSON.stringify(rule.expected)}`)
    .join(', ');
}

function formatPrimaryRule(result: MissionGradeResult) {
  const firstRule = result.failedRules[0];
  if (!firstRule) {
    return '실패 룰 없음';
  }

  return `${firstRule.kind} ${firstRule.operator} ${JSON.stringify(firstRule.expected)}`;
}

function getRuleActionHint(rule: MissionGradeResult['failedRules'][number]) {
  switch (rule.kind) {
    case 'paneCount':
      return '패인 분할(prefix + % 또는 prefix + ")을 실행해 pane 수를 늘리세요.';
    case 'windowCount':
      return '새 윈도우(prefix + c 또는 :new-window)를 만들어 window 수를 충족하세요.';
    case 'sessionCount':
      return '새 세션(prefix + s 또는 :new-session) 생성 후 다시 채점하세요.';
    case 'modeIs':
      return '요구 모드로 먼저 진입한 뒤 필요한 동작을 수행하세요.';
    case 'searchExecuted':
      return 'copy-mode에서 검색(`/` 또는 검색 입력) 한 번을 실행하세요.';
    case 'searchMatchFound':
      return '검색어를 조정해 매치 존재/부재 조건을 정확히 맞추세요.';
    case 'actionHistoryText':
      return '요구된 tmux 동작 로그가 남아야 합니다. 단축키 동작을 실제로 실행하세요.';
    case 'shellHistoryText':
      return '명령줄에서 요구 명령을 직접 실행해 shell history 조건을 만족시키세요.';
    default:
      return '실패 조건에 맞춰 상태를 갱신한 뒤 다시 제출하세요.';
  }
}

export function getLiveHintForMission(
  mission: AppMission,
  result: MissionGradeResult,
): HintPayload {
  if (result.passed) {
    return {
      hintLevel: 1,
      hintText: '현재 상태가 통과 조건을 만족합니다. 제출하고 채점해 보세요.',
    };
  }

  const firstRule = result.failedRules[0];
  if (!firstRule) {
    return {
      hintLevel: 1,
      hintText: mission.hints[0] ?? '핵심 목표를 다시 확인해 보세요.',
    };
  }

  return {
    hintLevel: 1,
    hintText: `현재 가장 부족한 조건: ${formatPrimaryRule(result)}. ${getRuleActionHint(firstRule)}`,
  };
}

export function getHintForMission(
  mission: AppMission,
  result: MissionGradeResult,
  attemptCount: number,
): HintPayload {
  const normalizedAttempt = Math.max(1, attemptCount);
  const firstRule = result.failedRules[0];
  const actionHint = firstRule ? getRuleActionHint(firstRule) : mission.hints[0] ?? '핵심 목표를 다시 확인해 보세요.';

  if (normalizedAttempt === 1) {
    return {
      hintLevel: 1,
      hintText: `${mission.hints[0] ?? '핵심 목표를 다시 확인해 보세요.'} ${actionHint}`,
    };
  }

  if (normalizedAttempt === 2) {
    return {
      hintLevel: 2,
      hintText: `${mission.hints[1] ?? `실패 조건: ${formatFailedRules(result)}`} 현재 핵심 조건: ${formatPrimaryRule(
        result,
      )}`,
    };
  }

  return {
    hintLevel: 3,
    hintText: `정답 경로 요약: 먼저 목표 상태를 만들고, 마지막으로 제출하세요. 실패 조건: ${formatFailedRules(
      result,
    )}. 우선순위: ${actionHint}`,
  };
}
