import type { AppMission } from '../curriculum/contentSchema';
import type { MissionGradeResult } from './ruleEngine';
export type HintPayload = {
    hintLevel: 1 | 2 | 3;
    hintText: string;
};
function formatFailedRules(result: MissionGradeResult) {
    if (result.failedRules.length === 0) {
        return __tx("\uC2E4\uD328 \uB8F0 \uC5C6\uC74C");
    }
    return result.failedRules
        .map((rule) => `${rule.kind} ${rule.operator} ${JSON.stringify(rule.expected)}`)
        .join(', ');
}
function formatPrimaryRule(result: MissionGradeResult) {
    const firstRule = result.failedRules[0];
    if (!firstRule) {
        return __tx("\uC2E4\uD328 \uB8F0 \uC5C6\uC74C");
    }
    return `${firstRule.kind} ${firstRule.operator} ${JSON.stringify(firstRule.expected)}`;
}
function getRuleActionHint(rule: MissionGradeResult['failedRules'][number]) {
    switch (rule.kind) {
        case 'paneCount':
            return __tx("\uD328\uC778 \uBD84\uD560(prefix + % \uB610\uB294 prefix + \")\uC744 \uC2E4\uD589\uD574 pane \uC218\uB97C \uB298\uB9AC\uC138\uC694.");
        case 'windowCount':
            return __tx("\uC0C8 \uC708\uB3C4\uC6B0(prefix + c \uB610\uB294 :new-window)\uB97C \uB9CC\uB4E4\uC5B4 window \uC218\uB97C \uCDA9\uC871\uD558\uC138\uC694.");
        case 'sessionCount':
            return __tx("\uC0C8 \uC138\uC158(prefix + s \uB610\uB294 :new-session) \uC0DD\uC131 \uD6C4 \uB2E4\uC2DC \uCC44\uC810\uD558\uC138\uC694.");
        case 'modeIs':
            return __tx("\uC694\uAD6C \uBAA8\uB4DC\uB85C \uBA3C\uC800 \uC9C4\uC785\uD55C \uB4A4 \uD544\uC694\uD55C \uB3D9\uC791\uC744 \uC218\uD589\uD558\uC138\uC694.");
        case 'searchExecuted':
            return __tx("copy-mode\uC5D0\uC11C \uAC80\uC0C9(`/` \uB610\uB294 \uAC80\uC0C9 \uC785\uB825) \uD55C \uBC88\uC744 \uC2E4\uD589\uD558\uC138\uC694.");
        case 'searchMatchFound':
            return __tx("\uAC80\uC0C9\uC5B4\uB97C \uC870\uC815\uD574 \uB9E4\uCE58 \uC874\uC7AC/\uBD80\uC7AC \uC870\uAC74\uC744 \uC815\uD655\uD788 \uB9DE\uCD94\uC138\uC694.");
        case 'actionHistoryText':
            return __tx("\uC694\uAD6C\uB41C tmux \uB3D9\uC791 \uB85C\uADF8\uAC00 \uB0A8\uC544\uC57C \uD569\uB2C8\uB2E4. \uB2E8\uCD95\uD0A4 \uB3D9\uC791\uC744 \uC2E4\uC81C\uB85C \uC2E4\uD589\uD558\uC138\uC694.");
        case 'shellHistoryText':
            return __tx("\uBA85\uB839\uC904\uC5D0\uC11C \uC694\uAD6C \uBA85\uB839\uC744 \uC9C1\uC811 \uC2E4\uD589\uD574 shell history \uC870\uAC74\uC744 \uB9CC\uC871\uC2DC\uD0A4\uC138\uC694.");
        default:
            return __tx("\uC2E4\uD328 \uC870\uAC74\uC5D0 \uB9DE\uCDB0 \uC0C1\uD0DC\uB97C \uAC31\uC2E0\uD55C \uB4A4 \uB2E4\uC2DC \uC81C\uCD9C\uD558\uC138\uC694.");
    }
}
export function getLiveHintForMission(mission: AppMission, result: MissionGradeResult): HintPayload {
    if (result.passed) {
        return {
            hintLevel: 1,
            hintText: __tx("\uD604\uC7AC \uC0C1\uD0DC\uAC00 \uD1B5\uACFC \uC870\uAC74\uC744 \uB9CC\uC871\uD569\uB2C8\uB2E4. \uC81C\uCD9C\uD558\uACE0 \uCC44\uC810\uD574 \uBCF4\uC138\uC694."),
        };
    }
    const firstRule = result.failedRules[0];
    if (!firstRule) {
        return {
            hintLevel: 1,
            hintText: mission.hints[0] ?? __tx("\uD575\uC2EC \uBAA9\uD45C\uB97C \uB2E4\uC2DC \uD655\uC778\uD574 \uBCF4\uC138\uC694."),
        };
    }
    return {
        hintLevel: 1,
        hintText: `현재 가장 부족한 조건: ${formatPrimaryRule(result)}. ${getRuleActionHint(firstRule)}`,
    };
}
export function getHintForMission(mission: AppMission, result: MissionGradeResult, attemptCount: number): HintPayload {
    const normalizedAttempt = Math.max(1, attemptCount);
    const firstRule = result.failedRules[0];
    const actionHint = firstRule ? getRuleActionHint(firstRule) : mission.hints[0] ?? __tx("\uD575\uC2EC \uBAA9\uD45C\uB97C \uB2E4\uC2DC \uD655\uC778\uD574 \uBCF4\uC138\uC694.");
    if (normalizedAttempt === 1) {
        return {
            hintLevel: 1,
            hintText: `${mission.hints[0] ?? __tx("\uD575\uC2EC \uBAA9\uD45C\uB97C \uB2E4\uC2DC \uD655\uC778\uD574 \uBCF4\uC138\uC694.")} ${actionHint}`,
        };
    }
    if (normalizedAttempt === 2) {
        return {
            hintLevel: 2,
            hintText: `${mission.hints[1] ?? `실패 조건: ${formatFailedRules(result)}`} 현재 핵심 조건: ${formatPrimaryRule(result)}`,
        };
    }
    return {
        hintLevel: 3,
        hintText: `정답 경로 요약: 먼저 목표 상태를 만들고, 마지막으로 제출하세요. 실패 조건: ${formatFailedRules(result)}. 우선순위: ${actionHint}`,
    };
}
