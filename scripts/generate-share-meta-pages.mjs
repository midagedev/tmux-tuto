import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const shareMetaPath = path.join(rootDir, 'src', 'content', 'v1', 'share-meta.json');
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

function createHtml({ slug, title, description, ogImage }) {
  const pageUrl = `${siteUrl}/share/${slug}`;
  const imageUrl = `${siteUrl}${ogImage}`;
  const escapedTitle = escapeHtml(`${title} | tmux-tuto`);
  const escapedDescription = escapeHtml(description);
  const escapedPageUrl = escapeHtml(pageUrl);
  const escapedImageUrl = escapeHtml(imageUrl);
  const fallbackRoot = '../../';

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
    <meta http-equiv="refresh" content="2; url=${fallbackRoot}" />
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
      <p><a href="${fallbackRoot}">tmux-tuto 홈으로 이동</a></p>
    </main>
  </body>
</html>
`;
}

async function generate() {
  const raw = await fs.readFile(shareMetaPath, 'utf-8');
  const milestones = JSON.parse(raw);

  await fs.mkdir(publicShareDir, { recursive: true });

  for (const milestone of milestones) {
    const slugDir = path.join(publicShareDir, milestone.slug);
    await fs.mkdir(slugDir, { recursive: true });
    await fs.writeFile(path.join(slugDir, 'index.html'), createHtml(milestone), 'utf-8');
  }
}

generate().catch((error) => {
  console.error('[generate-share-meta-pages] failed:', error);
  process.exitCode = 1;
});
