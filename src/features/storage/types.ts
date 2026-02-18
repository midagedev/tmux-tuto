import type { DBSchema } from 'idb';
export type IsoDate = string;
export type ProfileRecord = {
    id: 'me';
    nickname: string;
    keymap: 'C-b' | 'C-a';
    locale: string;
    updatedAt: IsoDate;
};
export type ProgressRecord = {
    lessonId: string;
    status: 'not_started' | 'in_progress' | 'completed';
    bestScore: number;
    completedMissions: string[];
    updatedAt: IsoDate;
};
export type MissionAttemptRecord = {
    id?: number;
    missionSlug: string;
    result: 'pass' | 'fail';
    score: number;
    durationMs: number;
    hintLevel: 0 | 1 | 2 | 3;
    feedback: string;
    createdAt: IsoDate;
};
export type BookmarkRecord = {
    id: string;
    type: 'lesson' | 'mission' | 'cheatsheet_item' | 'action_pattern' | 'playbook' | 'snapshot';
    targetId: string;
    title: string;
    tags: string[];
    createdAt: IsoDate;
    updatedAt: IsoDate;
};
export type NoteRecord = {
    id: string;
    bookmarkId: string;
    markdown: string;
    updatedAt: IsoDate;
};
export type AchievementRecord = {
    id: string;
    unlockedAt: IsoDate;
    metadata?: Record<string, string | number | boolean>;
};
export type SimulatorSnapshotRecord = {
    id: string;
    schemaVersion: 2;
    mode: 'NORMAL' | 'PREFIX_PENDING' | 'COMMAND_MODE' | 'COPY_MODE' | 'SEARCH_MODE';
    sessionGraph: {
        schemaVersion: 2;
        simulatorState: unknown;
    };
    savedAt: IsoDate;
};
export type BackupMetaRecord = {
    key: string;
    value: string;
    updatedAt: IsoDate;
};
export interface TmuxTutoDB extends DBSchema {
    profile: {
        key: string;
        value: ProfileRecord;
    };
    progress: {
        key: string;
        value: ProgressRecord;
        indexes: {
            'by-updatedAt': IsoDate;
            'by-status': ProgressRecord['status'];
        };
    };
    mission_attempts: {
        key: number;
        value: MissionAttemptRecord;
        indexes: {
            'by-missionSlug': string;
            'by-createdAt': IsoDate;
        };
    };
    bookmarks: {
        key: string;
        value: BookmarkRecord;
        indexes: {
            'by-type': BookmarkRecord['type'];
            'by-createdAt': IsoDate;
        };
    };
    notes: {
        key: string;
        value: NoteRecord;
        indexes: {
            'by-bookmarkId': string;
            'by-updatedAt': IsoDate;
        };
    };
    achievements: {
        key: string;
        value: AchievementRecord;
        indexes: {
            'by-unlockedAt': IsoDate;
        };
    };
    simulator_snapshots: {
        key: string;
        value: SimulatorSnapshotRecord;
        indexes: {
            'by-savedAt': IsoDate;
            'by-schemaVersion': number;
        };
    };
    backup_meta: {
        key: string;
        value: BackupMetaRecord;
    };
}
