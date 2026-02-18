import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const shareMetaPath = path.join(rootDir, 'src', 'content', 'v1', 'share-meta.json');

const WIDTH = 1200;
const HEIGHT = 630;

const THEMES = [
  ['#0f766e', '#134e4a'],
  ['#155e75', '#0e7490'],
  ['#1d4ed8', '#1e3a8a'],
  ['#374151', '#111827'],
  ['#78350f', '#92400e'],
  ['#166534', '#14532d'],
];

function escapeXml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function wrapText(rawText, maxCharsPerLine) {
  const words = rawText.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';

  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxCharsPerLine && current) {
      lines.push(current);
      current = word;
      return;
    }
    current = candidate;
  });

  if (current) {
    lines.push(current);
  }

  return lines;
}

function createSvg({ title, description, slug }, themeIndex) {
  const [colorA, colorB] = THEMES[themeIndex % THEMES.length];
  const titleLines = wrapText(title, 22).slice(0, 3);
  const descriptionLines = wrapText(description, 42).slice(0, 3);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${colorA}" />
      <stop offset="100%" stop-color="${colorB}" />
    </linearGradient>
  </defs>

  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)" />
  <rect x="40" y="40" width="${WIDTH - 80}" height="${HEIGHT - 80}" rx="24" fill="rgba(0,0,0,0.16)" />

  <text x="90" y="120" fill="#CCFBF1" font-size="28" font-weight="700" font-family="Space Grotesk, Inter, sans-serif">
    tmux-tuto milestone
  </text>

  ${titleLines
    .map(
      (line, index) =>
        `<text x="90" y="${220 + index * 72}" fill="#F9FAFB" font-size="64" font-weight="800" font-family="Space Grotesk, Inter, sans-serif">${escapeXml(
          line,
        )}</text>`,
    )
    .join('\n  ')}

  ${descriptionLines
    .map(
      (line, index) =>
        `<text x="90" y="${430 + index * 38}" fill="#E5E7EB" font-size="30" font-weight="500" font-family="IBM Plex Sans KR, Noto Sans KR, sans-serif">${escapeXml(
          line,
        )}</text>`,
    )
    .join('\n  ')}

  <text x="90" y="575" fill="#A7F3D0" font-size="24" font-family="JetBrains Mono, Menlo, monospace">
    /share/${escapeXml(slug)}
  </text>
</svg>
`;
}

function createDefaultSvg() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f766e" />
      <stop offset="100%" stop-color="#134e4a" />
    </linearGradient>
  </defs>

  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)" />
  <rect x="40" y="40" width="${WIDTH - 80}" height="${HEIGHT - 80}" rx="24" fill="rgba(0,0,0,0.16)" />

  <text x="90" y="140" fill="#CCFBF1" font-size="32" font-weight="700" font-family="Space Grotesk, Inter, sans-serif">
    tmux-tuto
  </text>

  <text x="90" y="260" fill="#F9FAFB" font-size="64" font-weight="800" font-family="Space Grotesk, Inter, sans-serif">
    브라우저에서 배우는
  </text>
  <text x="90" y="340" fill="#F9FAFB" font-size="64" font-weight="800" font-family="Space Grotesk, Inter, sans-serif">
    tmux 인터랙티브 실습
  </text>

  <text x="90" y="430" fill="#E5E7EB" font-size="30" font-weight="500" font-family="IBM Plex Sans KR, Noto Sans KR, sans-serif">
    설치 없이 실제 Linux VM에서 tmux를 실습하세요.
  </text>
  <text x="90" y="470" fill="#E5E7EB" font-size="30" font-weight="500" font-family="IBM Plex Sans KR, Noto Sans KR, sans-serif">
    세션, 윈도우, 패인, copy-mode까지 단계별 미션 제공.
  </text>

  <text x="90" y="575" fill="#A7F3D0" font-size="24" font-family="JetBrains Mono, Menlo, monospace">
    tmux.midagedev.com
  </text>
</svg>
`;
}

async function generate() {
  const raw = await fs.readFile(shareMetaPath, 'utf-8');
  const milestones = JSON.parse(raw);

  const ogDir = path.join(rootDir, 'public', 'og');
  await fs.mkdir(ogDir, { recursive: true });

  // Generate default OG image for the main page
  const defaultSvg = createDefaultSvg();
  await sharp(Buffer.from(defaultSvg))
    .png({ quality: 92, compressionLevel: 9 })
    .toFile(path.join(ogDir, 'default.v1.png'));

  for (const [index, milestone] of milestones.entries()) {
    const outputPath = path.join(rootDir, 'public', milestone.ogImage.replace(/^\//, ''));
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    const svg = createSvg(milestone, index);
    await sharp(Buffer.from(svg)).png({ quality: 92, compressionLevel: 9 }).toFile(outputPath);
  }
}

generate().catch((error) => {
  console.error('[generate-og-images] failed:', error);
  process.exitCode = 1;
});
