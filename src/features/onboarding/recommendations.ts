import type { OnboardingGoal } from './onboardingStore';
type Recommendation = {
    trackSlug: string;
    trackReason: string;
    playbookSlug: string;
    playbookReason: string;
};
const GOAL_RECOMMENDATIONS: Record<OnboardingGoal, Recommendation> = {
    'fast-foundations': {
        trackSlug: 'track-a-foundations',
        trackReason: __tx("\uC138\uC158/\uC708\uB3C4\uC6B0/\uD328\uC778 \uAE30\uBCF8 \uC870\uC791\uC744 \uAC00\uC7A5 \uBE60\uB974\uAC8C \uC775\uD799\uB2C8\uB2E4."),
        playbookSlug: 'recommended-config',
        playbookReason: __tx("\uCD08\uAE30 tmux.conf\uB97C \uBA3C\uC800 \uB9DE\uCD94\uBA74 \uC774\uD6C4 \uC2E4\uC2B5\uC774 \uC548\uC815\uC801\uC785\uB2C8\uB2E4."),
    },
    'shortcut-review': {
        trackSlug: 'track-b-workflow',
        trackReason: __tx("\uC790\uC8FC \uC4F0\uB294 \uC774\uB3D9/\uC804\uD658 \uB8E8\uD2F4\uC744 \uBCF5\uC2B5 \uC911\uC2EC\uC73C\uB85C \uC775\uD799\uB2C8\uB2E4."),
        playbookSlug: 'session-persistence',
        playbookReason: __tx("\uC138\uC158 \uC720\uC9C0 \uC2B5\uAD00\uC744 \uBD99\uC774\uBA74 \uBCF5\uC2B5 \uB8E8\uD2F4\uC774 \uB04A\uAE30\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4."),
    },
    'advanced-routine': {
        trackSlug: 'track-c-deepwork',
        trackReason: __tx("\uBCF5\uD569 \uC2DC\uB098\uB9AC\uC624\uC640 command-mode \uB8E8\uD2F4\uAE4C\uC9C0 \uD655\uC7A5\uD569\uB2C8\uB2E4."),
        playbookSlug: 'tailscale-ssh-workflow',
        playbookReason: __tx("\uC6D0\uACA9 \uD658\uACBD\uC5D0\uC11C \uC7A5\uC2DC\uAC04 tmux \uC138\uC158 \uC6B4\uC601 \uD750\uB984\uC744 \uBC14\uB85C \uC801\uC6A9\uD569\uB2C8\uB2E4."),
    },
};
export function getGoalLabel(goal: OnboardingGoal) {
    switch (goal) {
        case 'fast-foundations':
            return __tx("\uC5C5\uBB34\uC6A9 \uAE30\uCD08 \uBE68\uB9AC \uC775\uD788\uAE30");
        case 'shortcut-review':
            return __tx("\uB2E8\uCD95\uD0A4 \uBCF5\uC2B5 \uC911\uC2EC");
        case 'advanced-routine':
            return __tx("\uACE0\uAE09 \uB8E8\uD2F4\uAE4C\uC9C0 \uC644\uC8FC");
        default:
            return goal;
    }
}
export function getRecommendationByGoal(goal: OnboardingGoal | null) {
    if (!goal) {
        return GOAL_RECOMMENDATIONS['fast-foundations'];
    }
    return GOAL_RECOMMENDATIONS[goal];
}
