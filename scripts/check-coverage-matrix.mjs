import { readFileSync } from 'node:fs';

const contentPath = new URL('../src/content/v1/content.json', import.meta.url);
const matrixPath = new URL('../src/content/v1/coverage-matrix.json', import.meta.url);

const content = JSON.parse(readFileSync(contentPath, 'utf8'));
const matrixDoc = JSON.parse(readFileSync(matrixPath, 'utf8'));
const rows = Array.isArray(matrixDoc.rows) ? matrixDoc.rows : [];

const missionBySlug = new Map(content.missions.map((mission) => [mission.slug, mission]));
const rowBySlug = new Map(rows.map((row) => [row.missionSlug, row]));

const issues = [];

const duplicateSlugs = rows
  .map((row) => row.missionSlug)
  .filter((slug, index, list) => list.indexOf(slug) !== index);
if (duplicateSlugs.length > 0) {
  issues.push(`Duplicate matrix rows: ${Array.from(new Set(duplicateSlugs)).join(', ')}`);
}

for (const mission of content.missions) {
  const row = rowBySlug.get(mission.slug);
  if (!row) {
    issues.push(`Missing coverage row for mission: ${mission.slug}`);
    continue;
  }

  if (!Array.isArray(row.capabilities) || row.capabilities.length === 0) {
    issues.push(`No capabilities mapped for mission: ${mission.slug}`);
  }

  if (row.scenarioPresetId !== mission.initialScenario) {
    issues.push(
      `Scenario mismatch for ${mission.slug}: matrix=${row.scenarioPresetId}, content=${mission.initialScenario}`,
    );
  }

  const missionRuleKinds = new Set(mission.passRules.map((rule) => rule.kind));
  const requiredKinds = Array.isArray(row.requiredRuleKinds) ? row.requiredRuleKinds : [];
  const missingRuleKinds = requiredKinds.filter((kind) => !missionRuleKinds.has(kind));
  if (missingRuleKinds.length > 0) {
    issues.push(`Missing pass rule kinds for ${mission.slug}: ${missingRuleKinds.join(', ')}`);
  }
}

for (const row of rows) {
  if (!missionBySlug.has(row.missionSlug)) {
    issues.push(`Orphan coverage row without mission: ${row.missionSlug}`);
  }
}

if (issues.length > 0) {
  console.error('Coverage matrix check failed:');
  issues.forEach((issue) => console.error(`- ${issue}`));
  process.exit(1);
}

const capabilityCount = new Set(rows.flatMap((row) => row.capabilities ?? [])).size;
console.log(
  `Coverage matrix check passed: missions=${content.missions.length}, rows=${rows.length}, capabilities=${capabilityCount}`,
);
