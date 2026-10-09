// Exporte les logos en PNG transparents avec la vraie police Fraunces (via Chromium).
// Usage : node scripts/export-logos.mjs  → src/brand/export/*.png
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'src/brand/export'); await fs.mkdir(OUT, { recursive: true });
const font = (await fs.readFile(path.join(ROOT, 'node_modules/@fontsource-variable/fraunces/files/fraunces-latin-wght-normal.woff2'))).toString('base64');
const sym = await fs.readFile(path.join(ROOT, 'src/brand/symbol.svg'), 'utf8');
const symLight = await fs.readFile(path.join(ROOT, 'src/brand/symbol-light.svg'), 'utf8');
const b = await chromium.launch();
const shots = [
  ['logo-horizontal', sym, '#5A2A14'], ['logo-horizontal-light', symLight, '#F7EDE1'],
];
for (const [name, s, color] of shots) {
  const p = await b.newPage({ deviceScaleFactor: 4 });
  await p.setContent(`<html><head><style>@font-face{font-family:F;src:url(data:font/woff2;base64,${font}) format('woff2');font-weight:100 900}
  body{margin:0;background:transparent}.l{display:inline-flex;align-items:center;gap:22px;padding:6px 10px}.l svg{height:124px;width:auto}
  .t{font-family:F;font-weight:600;font-size:66px;letter-spacing:-.01em;color:${color};line-height:1;font-variation-settings:'opsz' 72}</style></head>
  <body><div class="l">${s.replace(/<title>.*?<\/title>/, '')}<span class="t">Escale Spa</span></div></body></html>`);
  await p.evaluate(() => document.fonts.ready);
  await p.locator('.l').screenshot({ path: path.join(OUT, `${name}.png`), omitBackground: true });
  await p.close();
}
await b.close();
const sharp = (await import('sharp')).default;
for (const n of ['symbol', 'symbol-light']) await sharp(path.join(ROOT, `src/brand/${n}.svg`), { density: 1200 }).resize({ height: 1024 }).png().toFile(path.join(OUT, `${n}-1024.png`));
console.log('ok', await fs.readdir(OUT));
