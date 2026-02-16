import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const routerPath = path.join(rootDir, 'src', 'app', 'router.tsx');
const shareMetaPath = path.join(rootDir, 'src', 'content', 'v1', 'share-meta.json');

const requiredRouterPaths = [
  'learn',
  'practice',
  'cheatsheet',
  'playbooks',
  'playbooks/:playbookSlug',
  'playbooks/:playbookSlug/copied',
  'bookmarks',
  'progress',
  'progress/missions/:missionSlug/passed',
  'onboarding/start',
  'onboarding/goal',
  'onboarding/preferences',
  'onboarding/first-mission',
  'onboarding/first-mission/passed',
  'onboarding/done',
  'share/:milestoneSlug',
];

const expectedMilestones = [
  'first-chapter-complete',
  'track-a-complete',
  'track-b-complete',
  'track-c-complete',
  'streak-7',
  'final-complete',
];

async function verifyRouterMap() {
  const routerSource = await fs.readFile(routerPath, 'utf-8');
  const missing = requiredRouterPaths.filter((routePath) => !routerSource.includes(`path: '${routePath}'`));
  return missing;
}

async function verifyShareMetaPages() {
  const rawMeta = await fs.readFile(shareMetaPath, 'utf-8');
  const milestones = JSON.parse(rawMeta);
  const milestoneSlugs = milestones.map((item) => item.slug);

  const missingInMeta = expectedMilestones.filter((slug) => !milestoneSlugs.includes(slug));
  const missingStaticPages = [];

  for (const slug of expectedMilestones) {
    const filePath = path.join(rootDir, 'public', 'share', slug, 'index.html');
    try {
      await fs.access(filePath);
    } catch {
      missingStaticPages.push(`public/share/${slug}/index.html`);
    }
  }

  return { missingInMeta, missingStaticPages };
}

async function main() {
  const missingRouterPaths = await verifyRouterMap();
  const { missingInMeta, missingStaticPages } = await verifyShareMetaPages();

  if (
    missingRouterPaths.length === 0 &&
    missingInMeta.length === 0 &&
    missingStaticPages.length === 0
  ) {
    console.log('KPI route map verification passed.');
    return;
  }

  console.error('KPI route map verification failed.');
  if (missingRouterPaths.length > 0) {
    console.error('Missing router paths:', missingRouterPaths.join(', '));
  }
  if (missingInMeta.length > 0) {
    console.error('Missing share milestones in metadata:', missingInMeta.join(', '));
  }
  if (missingStaticPages.length > 0) {
    console.error('Missing static share pages:', missingStaticPages.join(', '));
  }
  process.exitCode = 1;
}

main().catch((error) => {
  console.error('Unexpected verification error:', error);
  process.exitCode = 1;
});
