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

export function getHintForMission(
  mission: AppMission,
  result: MissionGradeResult,
  attemptCount: number,
): HintPayload {
  const normalizedAttempt = Math.max(1, attemptCount);

  if (normalizedAttempt === 1) {
    return {
      hintLevel: 1,
      hintText: mission.hints[0] ?? '핵심 목표를 다시 확인해 보세요.',
    };
  }

  if (normalizedAttempt === 2) {
    return {
      hintLevel: 2,
      hintText: mission.hints[1] ?? `실패 조건: ${formatFailedRules(result)}`,
    };
  }

  return {
    hintLevel: 3,
    hintText: `정답 경로 요약: 먼저 목표 상태를 만들고, 마지막으로 제출하세요. 실패 조건: ${formatFailedRules(
      result,
    )}`,
  };
}
