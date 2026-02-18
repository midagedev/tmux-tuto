import coverageMatrixRaw from '../../content/v1/coverage-matrix.json';
export type CoverageTrack = 'A' | 'B' | 'C';
export type MissionCoverageRow = {
    missionSlug: string;
    track: CoverageTrack;
    scenarioPresetId: string;
    capabilities: string[];
    requiredRuleKinds: string[];
};
type CoverageMatrixDocument = {
    version: string;
    rows: MissionCoverageRow[];
};
const coverageMatrix = coverageMatrixRaw as CoverageMatrixDocument;
export const curriculumCoverageMatrix = coverageMatrix.rows;
export function getCoverageRowByMissionSlug(missionSlug: string) {
    return curriculumCoverageMatrix.find((row) => row.missionSlug === missionSlug);
}
export function getCapabilitiesByMissionSlug(missionSlug: string) {
    return getCoverageRowByMissionSlug(missionSlug)?.capabilities ?? [];
}
