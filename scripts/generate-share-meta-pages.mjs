import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const shareMetaPath = path.join(rootDir, 'src', 'content', 'v1', 'share-meta.json');
const shareAchievementMetaPath = path.join(rootDir, 'src', 'content', 'v1', 'share-achievement-meta.json');
const publicShareDir = path.join(rootDir, 'public', 'share');

const defaultSiteUrl = 'https://tmux-tuto.pages.dev';
const siteUrl = (process.env.TMUX_TUTO_SITE_URL || defaultSiteUrl).replace(/\/$/, '');

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function createHtml({ pathname, title, description, ogImage, fallbackRoot }) {
  const pageUrl = `${siteUrl}${pathname}`;
  const imageUrl = `${siteUrl}${ogImage}`;
  const escapedTitle = escapeHtml(`${title} | tmux-tuto`);
  const escapedDescription = escapeHtml(description);
  const escapedPageUrl = escapeHtml(pageUrl);
  const escapedImageUrl = escapeHtml(imageUrl);
  const escapedFallbackRoot = escapeHtml(fallbackRoot);

  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapedTitle}</title>
    <meta name="description" content="${escapedDescription}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${escapedTitle}" />
    <meta property="og:description" content="${escapedDescription}" />
    <meta property="og:image" content="${escapedImageUrl}" />
    <meta property="og:url" content="${escapedPageUrl}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapedTitle}" />
    <meta name="twitter:description" content="${escapedDescription}" />
    <meta name="twitter:image" content="${escapedImageUrl}" />
    <link rel="canonical" href="${escapedPageUrl}" />
    <meta http-equiv="refresh" content="2; url=${escapedFallbackRoot}" />
    <script>
      (function () {
        var targetPath = window.location.pathname + window.location.search + window.location.hash;
        var rootPath = window.location.pathname.split('/share/')[0] || '/';
        var rootWithSlash = rootPath.endsWith('/') ? rootPath : rootPath + '/';
        var redirectUrl = window.location.origin + rootWithSlash + '?p=' + encodeURIComponent(targetPath);
        window.location.replace(redirectUrl);
      })();
    </script>
  </head>
  <body>
    <main style="font-family: sans-serif; padding: 24px; line-height: 1.5">
      <h1>${escapeHtml(title)}</h1>
      <p>${escapedDescription}</p>
      <p>앱으로 이동 중입니다. 자동 이동이 되지 않으면 홈에서 다시 열어 주세요.</p>
      <p><a href="${escapedFallbackRoot}">tmux-tuto 홈으로 이동</a></p>
    </main>
  </body>
</html>
`;
}

async function generate() {
  const [milestoneRaw, achievementRaw] = await Promise.all([
    fs.readFile(shareMetaPath, 'utf-8'),
    fs.readFile(shareAchievementMetaPath, 'utf-8'),
  ]);
  const milestones = JSON.parse(milestoneRaw);
  const achievements = JSON.parse(achievementRaw);

  await fs.mkdir(publicShareDir, { recursive: true });

  for (const milestone of milestones) {
    const slugDir = path.join(publicShareDir, milestone.slug);
    await fs.mkdir(slugDir, { recursive: true });
    await fs.writeFile(
      path.join(slugDir, 'index.html'),
      createHtml({
        pathname: `/share/${milestone.slug}`,
        title: milestone.title,
        description: milestone.description,
        ogImage: milestone.ogImage,
        fallbackRoot: '../../',
      }),
      'utf-8',
    );
  }

  const achievementDir = path.join(publicShareDir, 'achievement');
  await fs.mkdir(achievementDir, { recursive: true });

  for (const achievement of achievements) {
    const idDir = path.join(achievementDir, achievement.id);
    await fs.mkdir(idDir, { recursive: true });
    await fs.writeFile(
      path.join(idDir, 'index.html'),
      createHtml({
        pathname: `/share/achievement/${achievement.id}`,
        title: achievement.title,
        description: achievement.description,
        ogImage: achievement.ogImage,
        fallbackRoot: '../../../',
      }),
      'utf-8',
    );
  }
}

generate().catch((error) => {
  console.error('[generate-share-meta-pages] failed:', error);
  process.exitCode = 1;
});
