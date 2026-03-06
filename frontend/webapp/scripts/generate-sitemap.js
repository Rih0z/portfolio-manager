/**
 * sitemap.xml 生成スクリプト
 *
 * 公開ルートのみを対象に sitemap.xml を生成し、
 * ビルドディレクトリ（build/）に出力する。
 *
 * package.json の prebuild で自動実行:
 *   "prebuild": "node scripts/generate-sitemap.js"
 *
 * @file scripts/generate-sitemap.js
 */

const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://portfolio-wise.com';
const TODAY = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

// 公開ルートのみ（認証必要ルートは除外）
const PUBLIC_ROUTES = [
  { loc: '/', changefreq: 'weekly', priority: '1.0' },
  { loc: '/pricing', changefreq: 'monthly', priority: '0.8' },
  { loc: '/legal/terms', changefreq: 'yearly', priority: '0.3' },
  { loc: '/legal/privacy', changefreq: 'yearly', priority: '0.3' },
  { loc: '/legal/kkkr', changefreq: 'yearly', priority: '0.3' },
  { loc: '/legal/disclaimer', changefreq: 'yearly', priority: '0.3' },
];

const xmlEntries = PUBLIC_ROUTES.map(
  (route) => `  <url>
    <loc>${BASE_URL}${route.loc}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`
).join('\n');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlEntries}
</urlset>
`;

// public/ ディレクトリに出力（Vite は public/ をそのままコピーする）
const outputDir = path.resolve(__dirname, '..', 'public');
const outputPath = path.join(outputDir, 'sitemap.xml');

fs.writeFileSync(outputPath, sitemap, 'utf-8');
console.log(`[sitemap] Generated ${outputPath} with ${PUBLIC_ROUTES.length} URLs`);
