export type AchievementCategory = 'core' | 'fun';
export type AchievementDefinition = {
    id: string;
    category: AchievementCategory;
    title: string;
    description: string;
    shareText: string;
};
const ACHIEVEMENTS: AchievementDefinition[] = [
    {
        id: 'first_mission_passed',
        category: 'core',
        title: __tx("\uCCAB \uBBF8\uC158 \uC644\uB8CC"),
        description: __tx("\uCCAB \uC2E4\uC2B5 \uBBF8\uC158\uC744 \uD1B5\uACFC\uD588\uC2B5\uB2C8\uB2E4."),
        shareText: __tx("\uCCAB \uBBF8\uC158\uC744 \uD1B5\uACFC\uD588\uC5B4\uC694."),
    },
    {
        id: 'workspace_bootstrap',
        category: 'core',
        title: __tx("\uC6CC\uD06C\uC2A4\uD398\uC774\uC2A4 \uBD80\uD2B8\uC2A4\uD2B8\uB7A9"),
        description: __tx("\uC138\uC158/\uC708\uB3C4\uC6B0/\uBD84\uD560 \uAE30\uBCF8\uAE30\uB97C \uD55C \uBC88\uC5D0 \uC644\uC131\uD588\uC2B5\uB2C8\uB2E4."),
        shareText: __tx("\uC138\uC158/\uC708\uB3C4\uC6B0/\uBD84\uD560 \uAE30\uBCF8 \uB8E8\uD2F4\uC744 \uC644\uC131\uD588\uC5B4\uC694."),
    },
    {
        id: 'copy_mode_starter',
        category: 'core',
        title: __tx("Copy \uBAA8\uB4DC \uC785\uBB38"),
        description: __tx("copy-mode\uB97C \uC2E4\uD589\uD574 \uB85C\uADF8 \uD0D0\uC0C9 \uB8E8\uD2F4\uC5D0 \uC9C4\uC785\uD588\uC2B5\uB2C8\uB2E4."),
        shareText: __tx("Copy \uBAA8\uB4DC \uC785\uBB38 \uC5C5\uC801\uC744 \uB2EC\uC131\uD588\uC5B4\uC694."),
    },
    {
        id: 'command_flow_starter',
        category: 'core',
        title: __tx("\uBA85\uB839 \uD750\uB984 \uC785\uBB38"),
        description: __tx("command-prompt \uB610\uB294 choose-tree\uB97C \uC2E4\uD589\uD588\uC2B5\uB2C8\uB2E4."),
        shareText: __tx("\uBA85\uB839 \uD750\uB984 \uC785\uBB38 \uC5C5\uC801\uC744 \uB2EC\uC131\uD588\uC5B4\uC694."),
    },
    {
        id: 'track_a_completed',
        category: 'core',
        title: __tx("Track A \uC644\uB8CC"),
        description: __tx("\uAE30\uCD08 \uD2B8\uB799 \uC2E4\uC2B5\uC744 \uC644\uB8CC\uD588\uC2B5\uB2C8\uB2E4."),
        shareText: __tx("Track A\uB97C \uC644\uB8CC\uD588\uC5B4\uC694."),
    },
    {
        id: 'track_b_completed',
        category: 'core',
        title: __tx("Track B \uC644\uB8CC"),
        description: __tx("\uC6CC\uD06C\uD50C\uB85C\uC6B0 \uD2B8\uB799 \uC2E4\uC2B5\uC744 \uC644\uB8CC\uD588\uC2B5\uB2C8\uB2E4."),
        shareText: __tx("Track B\uB97C \uC644\uB8CC\uD588\uC5B4\uC694."),
    },
    {
        id: 'track_c_completed',
        category: 'core',
        title: __tx("Track C \uC644\uB8CC"),
        description: __tx("\uD655\uC7A5 \uD2B8\uB799 \uC2E4\uC2B5\uC744 \uC644\uB8CC\uD588\uC2B5\uB2C8\uB2E4."),
        shareText: __tx("Track C\uB97C \uC644\uB8CC\uD588\uC5B4\uC694."),
    },
    {
        id: 'full_curriculum_completed',
        category: 'core',
        title: __tx("\uCEE4\uB9AC\uD058\uB7FC \uC644\uC8FC"),
        description: __tx("Track A~C \uC804\uCCB4\uB97C \uC644\uB8CC\uD588\uC2B5\uB2C8\uB2E4."),
        shareText: __tx("\uC804\uCCB4 \uCEE4\uB9AC\uD058\uB7FC\uC744 \uC644\uC8FC\uD588\uC5B4\uC694."),
    },
    {
        id: 'streak_7_days',
        category: 'core',
        title: __tx("7\uC77C \uC2A4\uD2B8\uB9AD"),
        description: __tx("7\uC77C \uC5F0\uC18D \uD559\uC2B5\uC744 \uB2EC\uC131\uD588\uC2B5\uB2C8\uB2E4."),
        shareText: __tx("7\uC77C \uC5F0\uC18D \uD559\uC2B5 \uC2A4\uD2B8\uB9AD\uC744 \uB2EC\uC131\uD588\uC5B4\uC694."),
    },
    {
        id: 'lesson_explorer',
        category: 'core',
        title: __tx("\uB808\uC2A8 \uD0D0\uD5D8\uAC00"),
        description: __tx("\uC11C\uB85C \uB2E4\uB978 \uB808\uC2A8 3\uAC1C \uC774\uC0C1\uC5D0\uC11C \uC2E4\uC2B5\uD588\uC2B5\uB2C8\uB2E4."),
        shareText: __tx("\uB808\uC2A8 \uD0D0\uD5D8\uAC00 \uC5C5\uC801\uC744 \uB2EC\uC131\uD588\uC5B4\uC694."),
    },
    {
        id: 'pane_runner_30',
        category: 'fun',
        title: __tx("Pane \uB7EC\uB108"),
        description: __tx("pane \uBD84\uD560 \uB204\uC801 30\uD68C\uB97C \uB2EC\uC131\uD588\uC2B5\uB2C8\uB2E4."),
        shareText: __tx("Pane \uB7EC\uB108 \uC5C5\uC801\uC744 \uB2EC\uC131\uD588\uC5B4\uC694."),
    },
    {
        id: 'pane_hundred',
        category: 'fun',
        title: __tx("Pane \uBC31\uC7A5"),
        description: __tx("pane \uBD84\uD560 \uB204\uC801 100\uD68C\uB97C \uB2EC\uC131\uD588\uC2B5\uB2C8\uB2E4."),
        shareText: __tx("Pane \uBC31\uC7A5 \uC5C5\uC801\uC744 \uB2EC\uC131\uD588\uC5B4\uC694."),
    },
    {
        id: 'layout_alchemist',
        category: 'fun',
        title: __tx("\uB808\uC774\uC544\uC6C3 \uC5F0\uAE08\uC220\uC0AC"),
        description: __tx("\uB808\uC774\uC544\uC6C3\uC744 \uBC14\uAFB8\uAC70\uB098 \uB2E4\uC591\uD55C \uB808\uC774\uC544\uC6C3\uC744 \uC2E4\uD5D8\uD588\uC2B5\uB2C8\uB2E4."),
        shareText: __tx("\uB808\uC774\uC544\uC6C3 \uC5F0\uAE08\uC220\uC0AC \uC5C5\uC801\uC744 \uB2EC\uC131\uD588\uC5B4\uC694."),
    },
    {
        id: 'focus_navigator',
        category: 'fun',
        title: __tx("\uD3EC\uCEE4\uC2A4 \uB124\uBE44\uAC8C\uC774\uD130"),
        description: __tx("pane \uC774\uB3D9/\uB9AC\uC0AC\uC774\uC988\uB97C \uCDA9\uBD84\uD788 \uBC18\uBCF5\uD574 \uD3EC\uCEE4\uC2A4 \uC81C\uC5B4 \uB8E8\uD2F4\uC744 \uB9CC\uB4E4\uC5C8\uC2B5\uB2C8\uB2E4."),
        shareText: __tx("\uD3EC\uCEE4\uC2A4 \uB124\uBE44\uAC8C\uC774\uD130 \uC5C5\uC801\uC744 \uB2EC\uC131\uD588\uC5B4\uC694."),
    },
    {
        id: 'hidden_trickster',
        category: 'fun',
        title: __tx("\uC228\uC740 \uD2B8\uB9AD\uC2A4\uD130"),
        description: __tx("command-prompt\uC640 choose-tree\uB97C \uBAA8\uB450 \uC0AC\uC6A9\uD588\uC2B5\uB2C8\uB2E4."),
        shareText: __tx("\uC228\uC740 \uD2B8\uB9AD\uC2A4\uD130 \uC5C5\uC801\uC744 \uB2EC\uC131\uD588\uC5B4\uC694."),
    },
];
const ACHIEVEMENT_MAP = new Map(ACHIEVEMENTS.map((achievement) => [achievement.id, achievement]));
export function listAchievementDefinitions(category?: AchievementCategory) {
    if (!category) {
        return ACHIEVEMENTS;
    }
    return ACHIEVEMENTS.filter((achievement) => achievement.category === category);
}
export function getAchievementDefinition(id: string) {
    return ACHIEVEMENT_MAP.get(id) ?? null;
}
