import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const contentPath = path.join(rootDir, 'src', 'content', 'v1', 'content.json');
const outputPath = path.join(rootDir, 'public', 'sitemap.xml');

const defaultSiteUrl = 'https://tmux.midagedev.com';
const rawSiteUrl = process.env.TMUX_TUTO_SITE_URL || process.env.VITE_SITE_ORIGIN || defaultSiteUrl;
const supportedLanguages = ['ko', 'en', 'ja', 'zh'];
const hreflangMap = {
  ko: 'ko',
  en: 'en',
  ja: 'ja',
  zh: 'zh-Hans',
};

function resolveSiteTarget(rawValue) {
  const normalized = (rawValue || defaultSiteUrl).trim();
  const withTrailingSlash = normalized.endsWith('/') ? normalized : `${normalized}/`;
  const parsed = new URL(withTrailingSlash);
  const pathPrefix = parsed.pathname.replace(/\/+$/, '');
  return {
    origin: parsed.origin,
    pathPrefix,
  };
}

const siteTarget = resolveSiteTarget(rawSiteUrl);

function normalizePathname(pathname) {
  if (!pathname || pathname === '/') {
    return '/';
  }
  const withSlash = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return withSlash.replace(/\/+$/, '') || '/';
}

function buildLocalizedUrl(pathname, lang) {
  const normalizedPathname = normalizePathname(pathname);
  const combinedPath = `${siteTarget.pathPrefix}${normalizedPathname}`.replace(/\/{2,}/g, '/');
  const url = new URL(combinedPath, siteTarget.origin);
  url.searchParams.set('lang', lang);
  return url.toString();
}

function escapeXml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function resolveLastmodDate(contentGeneratedAt) {
  const parsed = Date.parse(contentGeneratedAt);
  if (!Number.isFinite(parsed)) {
    return new Date().toISOString().slice(0, 10);
  }
  return new Date(parsed).toISOString().slice(0, 10);
}

function dedupeRouteEntries(entries) {
  const deduped = new Map();
  for (const entry of entries) {
    if (!deduped.has(entry.pathname)) {
      deduped.set(entry.pathname, entry);
      continue;
    }

    const existing = deduped.get(entry.pathname);
    if (Number(entry.priority) > Number(existing.priority)) {
      deduped.set(entry.pathname, entry);
    }
  }
  return [...deduped.values()].sort((left, right) => left.pathname.localeCompare(right.pathname));
}

function toSitemapXml(entries, lastmodDate) {
  const xmlEntries = entries
    .map((entry) => {
      const canonicalUrl = buildLocalizedUrl(entry.pathname, 'ko');
      const alternateTags = supportedLanguages
        .map(
          (lang) =>
            `    <xhtml:link rel="alternate" hreflang="${hreflangMap[lang]}" href="${escapeXml(
              buildLocalizedUrl(entry.pathname, lang),
            )}" />`,
        )
        .join('\n');
      const xDefaultTag = `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(
        buildLocalizedUrl(entry.pathname, 'ko'),
      )}" />`;

      return [
        '  <url>',
        `    <loc>${escapeXml(canonicalUrl)}</loc>`,
        `    <lastmod>${lastmodDate}</lastmod>`,
        `    <changefreq>${entry.changefreq}</changefreq>`,
        `    <priority>${entry.priority}</priority>`,
        alternateTags,
        xDefaultTag,
        '  </url>',
      ].join('\n');
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${xmlEntries}
</urlset>
`;
}

async function generate() {
  const rawContent = await fs.readFile(contentPath, 'utf-8');
  const content = JSON.parse(rawContent);
  const lastmodDate = resolveLastmodDate(content.generatedAt);
  const activeTrackSlugs = new Set(
    (content.tracks || []).filter((track) => track.status === 'active').map((track) => track.slug),
  );

  const staticEntries = [
    { pathname: '/', changefreq: 'daily', priority: '1.0' },
    { pathname: '/learn', changefreq: 'weekly', priority: '0.9' },
    { pathname: '/practice', changefreq: 'weekly', priority: '0.8' },
    { pathname: '/cheatsheet', changefreq: 'weekly', priority: '0.8' },
    { pathname: '/playbooks', changefreq: 'weekly', priority: '0.8' },
  ];

  const lessonEntries = (content.lessons || [])
    .filter((lesson) => activeTrackSlugs.has(lesson.trackSlug))
    .map((lesson) => ({
      pathname: `/learn/${lesson.trackSlug}/${lesson.chapterSlug}/${lesson.slug}`,
      changefreq: 'weekly',
      priority: '0.7',
    }));

  const playbookEntries = (content.playbooks || []).map((playbook) => ({
    pathname: `/playbooks/${playbook.slug}`,
    changefreq: 'monthly',
    priority: '0.7',
  }));

  const entries = dedupeRouteEntries([...staticEntries, ...lessonEntries, ...playbookEntries]);
  const xml = toSitemapXml(entries, lastmodDate);
  await fs.writeFile(outputPath, xml, 'utf-8');
  console.log(`[generate-sitemap] generated ${entries.length} URLs at public/sitemap.xml`);
}

generate().catch((error) => {
  console.error('[generate-sitemap] failed:', error);
  process.exitCode = 1;
});
